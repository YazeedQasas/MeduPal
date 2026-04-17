"""
Medupal — Patient Document Indexer
====================================
Chunks each patient's medical data, embeds with nomic-embed-text (via Ollama),
and upserts into Supabase patient_documents table.

Usage:
    python index_patients.py

Requires env vars (or a .env file in this directory):
    SUPABASE_URL       — https://your-project.supabase.co
    SUPABASE_SERVICE_KEY — service role key (NOT the anon key) — needed for INSERT
    OLLAMA_BASE_URL    — default http://localhost:11434
    EMBED_MODEL        — default nomic-embed-text
"""
import asyncio
import json
import os
import sys

import httpx

# ---------------------------------------------------------------------------
# Load .env from this directory before reading any env vars
# ---------------------------------------------------------------------------
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_path):
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())

# ---------------------------------------------------------------------------
# Config (read from env, fall back to defaults)
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
OLLAMA_BASE  = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
EMBED_MODEL  = os.environ.get("EMBED_MODEL", "nomic-embed-text")

# ---------------------------------------------------------------------------
# Patient document corpus
# Each patient has multiple text chunks covering different aspects of their
# history. Keep chunks focused (one topic each) for better retrieval.
# ---------------------------------------------------------------------------
PATIENT_DOCUMENTS: list[dict] = [
    # ── Sarah Mitchell ──────────────────────────────────────────────────────
    {
        "patient_id": "sarah-mitchell",
        "metadata": {"section": "identity"},
        "text": (
            "Sarah Mitchell is a 28-year-old nurse. She is anxious, speaks quickly, "
            "and tends to downplay her symptoms — partly because she is a nurse and "
            "doesn't want to seem like a hypochondriac. She asks a lot of questions back, "
            "such as 'Is that serious?' or 'Should I be worried?'."
        ),
    },
    {
        "patient_id": "sarah-mitchell",
        "metadata": {"section": "respiratory_history"},
        "text": (
            "Sarah has had mild asthma since childhood. She was hospitalised at age 14 "
            "for a severe asthma episode. She uses a Salbutamol inhaler as needed (PRN). "
            "She is allergic to Penicillin, which causes a rash."
        ),
    },
    {
        "patient_id": "sarah-mitchell",
        "metadata": {"section": "social_history"},
        "text": (
            "Sarah is a non-smoker. She drinks alcohol occasionally on weekends. "
            "She works rotating night shifts at a hospital. Her mother has Type 2 diabetes. "
            "There is no family history of cardiac disease."
        ),
    },
    {
        "patient_id": "sarah-mitchell",
        "metadata": {"section": "vitals"},
        "text": (
            "Sarah's resting baseline vitals: blood pressure 118/76 mmHg, heart rate 82 bpm, "
            "respiratory rate 16 breaths/min, temperature 37.1°C, SpO₂ 99%."
        ),
    },

    # ── James Okafor ────────────────────────────────────────────────────────
    {
        "patient_id": "james-okafor",
        "metadata": {"section": "identity"},
        "text": (
            "James Okafor is a 55-year-old retired secondary school teacher. He is stoic "
            "and reluctant to admit pain. He uses humour to deflect — saying things like "
            "'I'm fine, just getting old' or 'probably just the dodgy kebab I had last night.' "
            "He only gives full detail when directly and specifically asked."
        ),
    },
    {
        "patient_id": "james-okafor",
        "metadata": {"section": "cardiac_respiratory_history"},
        "text": (
            "James has hypertension diagnosed 8 years ago, managed with Amlodipine 5mg once daily "
            "and Aspirin 75mg once daily. He was an ex-smoker with a 20 pack-year history and quit "
            "10 years ago. He has no prior cardiac events. His father had a heart attack at 61. "
            "His brother has COPD. He does not describe pain as 'pain' — he says 'pressure', "
            "'tightness', or 'a funny feeling.'"
        ),
    },
    {
        "patient_id": "james-okafor",
        "metadata": {"section": "social_history"},
        "text": (
            "James is an ex-smoker (quit 10 years ago, 20 pack-year history). He drinks 2–3 pints "
            "of beer on weekends. He is retired with a sedentary lifestyle and lives with his wife. "
            "He initially underreports his smoking history because he feels guilty about it — "
            "only admit 20 pack-years if directly pressed."
        ),
    },
    {
        "patient_id": "james-okafor",
        "metadata": {"section": "vitals"},
        "text": (
            "James's resting baseline vitals: blood pressure 145/90 mmHg (hypertensive), "
            "heart rate 78 bpm, respiratory rate 18 breaths/min, temperature 37.4°C, SpO₂ 96%."
        ),
    },

    # ── Margaret Chen ───────────────────────────────────────────────────────
    {
        "patient_id": "margaret-chen",
        "metadata": {"section": "identity"},
        "text": (
            "Margaret Chen is a 67-year-old retired woman. She is warm, friendly, and chatty — "
            "she tends to go off on tangents. For example, when asked about chest pain she might "
            "start talking about her late husband or what she was doing when it started. "
            "She speaks like a grandmother talking to a doctor she trusts."
        ),
    },
    {
        "patient_id": "margaret-chen",
        "metadata": {"section": "cardiac_history"},
        "text": (
            "Margaret has hypertension and atrial fibrillation and takes anticoagulants (Warfarin). "
            "She also takes Bisoprolol 2.5mg once daily and Ramipril 5mg once daily. "
            "She knows her medications by colour rather than name — the 'little white one' and "
            "the 'blood thinner'. She is allergic to Sulfonamides, which cause swelling. "
            "Her sister has heart failure. Her mother had rheumatic fever."
        ),
    },
    {
        "patient_id": "margaret-chen",
        "metadata": {"section": "other_conditions"},
        "text": (
            "Margaret has mild osteoarthritis and had a hip replacement 4 years ago. "
            "She takes Paracetamol as needed for pain. She is not anxious — she has dealt "
            "with health issues before — but she does want reassurance."
        ),
    },
    {
        "patient_id": "margaret-chen",
        "metadata": {"section": "social_history"},
        "text": (
            "Margaret is a non-smoker. She has an occasional glass of wine. She is retired "
            "and lives alone since her husband passed away 3 years ago. She is active in her "
            "community. Her blood pressure is 158/94 mmHg (hypertensive), heart rate 72 bpm, "
            "SpO₂ 95%, respiratory rate 17 breaths/min, temperature 36.9°C."
        ),
    },

    # ── Daniel Reyes ─────────────────────────────────────────────────────────
    {
        "patient_id": "daniel-reyes",
        "metadata": {"section": "identity"},
        "text": (
            "Daniel Reyes is a 42-year-old construction site manager. He is blunt, practical, "
            "and impatient. He came in because his wife made him — he wouldn't have bothered otherwise. "
            "He has no medical vocabulary. He says 'my chest feels heavy' not 'exertional dyspnoea.' "
            "He gets slightly irritated if asked the same thing twice."
        ),
    },
    {
        "patient_id": "daniel-reyes",
        "metadata": {"section": "respiratory_history"},
        "text": (
            "Daniel smokes about 10 cigarettes a day, though he will initially say 'not much' — "
            "only admit 10 a day if directly pressed. His father died of lung cancer at 68. "
            "Daniel has no significant past medical history apart from occasional back pain from work. "
            "He takes Ibuprofen as needed for back pain. He has no known allergies. "
            "His temperature is 38.2°C and SpO₂ is 94%, suggesting an acute process."
        ),
    },
    {
        "patient_id": "daniel-reyes",
        "metadata": {"section": "social_history"},
        "text": (
            "Daniel drinks alcohol regularly and is physically active at work. He has a high-stress job. "
            "Blood pressure 132/84 mmHg, heart rate 88 bpm, respiratory rate 20 breaths/min. "
            "He is in the appropriate age range for respiratory, pulmonology, general, and cardiology cases."
        ),
    },

    # ── Leila Hassan ─────────────────────────────────────────────────────────
    {
        "patient_id": "leila-hassan",
        "metadata": {"section": "identity"},
        "text": (
            "Leila Hassan is a 19-year-old first-year university student. She is nervous, polite, "
            "and over-explains. She is scared of medical settings — this is only her second time "
            "in a hospital as an adult. She is very apologetic, saying things like 'sorry, is that important?' "
            "or 'I don't want to waste your time.' She often adds details after a pause: 'Oh, and I forgot to mention...'"
        ),
    },
    {
        "patient_id": "leila-hassan",
        "metadata": {"section": "asthma_history"},
        "text": (
            "Leila has childhood asthma and eczema. She had one A&E visit at age 12 for an asthma attack. "
            "She uses a Salbutamol inhaler (reliever, PRN) and Clenil Modulite 100mcg twice daily (preventer) — "
            "but she often forgets to take her preventer inhaler and feels guilty about this. "
            "She is allergic to house dust mites (triggers her asthma) and has a mild peanut allergy. "
            "Her mother has asthma; her father has hay fever."
        ),
    },
    {
        "patient_id": "leila-hassan",
        "metadata": {"section": "social_history"},
        "text": (
            "Leila is a non-smoker and does not drink alcohol. She is under high academic stress "
            "in her first year at university and lives in student halls. "
            "Her vitals show SpO₂ at 93% and respiratory rate of 22 breaths/min, consistent with "
            "an acute asthma exacerbation. Heart rate is 96 bpm, temperature 37.6°C, blood pressure 112/70 mmHg."
        ),
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def embed_text(client: httpx.AsyncClient, text: str) -> list[float] | None:
    """Embed text with nomic-embed-text via Ollama. Returns 768-dim vector or None."""
    try:
        r = await client.post(
            f"{OLLAMA_BASE}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json().get("embedding")
    except Exception as e:
        print(f"  [embed error] {e}")
        return None


async def upsert_chunk(
    client: httpx.AsyncClient,
    patient_id: str,
    chunk_text: str,
    embedding: list[float],
    metadata: dict,
) -> bool:
    """Insert a document chunk into Supabase patient_documents."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    payload = {
        "patient_id": patient_id,
        "chunk_text": chunk_text,
        "embedding": embedding,
        "metadata": metadata,
    }
    try:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/patient_documents",
            headers=headers,
            json=payload,
            timeout=15.0,
        )
        r.raise_for_status()
        return True
    except Exception as e:
        print(f"  [upsert error] {e}")
        if hasattr(e, "response"):
            print(f"  Response: {e.response.text}")  # type: ignore[union-attr]
        return False


async def clear_patient(client: httpx.AsyncClient, patient_id: str) -> None:
    """Delete all existing chunks for a patient before re-indexing."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    try:
        r = await client.delete(
            f"{SUPABASE_URL}/rest/v1/patient_documents?patient_id=eq.{patient_id}",
            headers=headers,
            timeout=15.0,
        )
        r.raise_for_status()
    except Exception as e:
        print(f"  [clear error] {e}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars before running.")
        sys.exit(1)

    # Check Ollama is available
    async with httpx.AsyncClient() as probe:
        try:
            r = await probe.get(f"{OLLAMA_BASE}/api/tags", timeout=5.0)
            r.raise_for_status()
            models = [m["name"] for m in r.json().get("models", [])]
            if not any(EMBED_MODEL in m for m in models):
                print(f"WARNING: '{EMBED_MODEL}' not found in Ollama. Available: {models}")
                print(f"Run: ollama pull {EMBED_MODEL}")
                sys.exit(1)
            print(f"Ollama OK. Using model: {EMBED_MODEL}")
        except Exception as e:
            print(f"ERROR: Cannot reach Ollama at {OLLAMA_BASE} — {e}")
            sys.exit(1)

    # Group documents by patient
    patients_seen: set[str] = set()
    by_patient: dict[str, list[dict]] = {}
    for doc in PATIENT_DOCUMENTS:
        pid = doc["patient_id"]
        by_patient.setdefault(pid, []).append(doc)
        patients_seen.add(pid)

    print(f"\nIndexing {len(PATIENT_DOCUMENTS)} chunks across {len(patients_seen)} patients...\n")

    async with httpx.AsyncClient() as client:
        for patient_id, docs in by_patient.items():
            print(f"Patient: {patient_id}")

            # Delete old chunks for this patient
            print(f"  Clearing old chunks...")
            await clear_patient(client, patient_id)

            for i, doc in enumerate(docs):
                section = doc["metadata"].get("section", f"chunk_{i}")
                print(f"  [{i+1}/{len(docs)}] Embedding '{section}'...", end=" ", flush=True)
                embedding = await embed_text(client, doc["text"])
                if embedding is None:
                    print("FAILED (embedding error) — skipping")
                    continue
                ok = await upsert_chunk(
                    client,
                    patient_id=patient_id,
                    chunk_text=doc["text"],
                    embedding=embedding,
                    metadata=doc["metadata"],
                )
                print("OK" if ok else "FAILED (upsert error)")

            print()

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
