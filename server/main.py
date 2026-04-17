"""
STT server: capture audio from browser (Web API) and transcribe with OpenAI Whisper.
Patient replies via Ollama (Llama 3). Run: python -m uvicorn main:app --reload --port 8000
"""
import asyncio
import io
import os
import random
import shutil
import tempfile
from contextlib import asynccontextmanager

# Load .env from this directory before reading any env vars
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_path):
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())

import httpx
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Case key resolution: display titles (and aliases) -> stable keys for persona/fallback lookup.
# Align with TITLE_TO_MOCK_KEY in StudentPracticeFlow.jsx.
TITLE_TO_CASE_KEY = {
    "pneumonia": "pneumonia",
    "aortic-stenosis": "aortic-stenosis",
    "mitral-stenosis": "mitral-stenosis",
    "asthma": "asthma",
    "copd": "copd",
    "Pneumonia": "pneumonia",
    "Aortic Stenosis": "aortic-stenosis",
    "Mitral Stenosis": "mitral-stenosis",
    "Asthma": "asthma",
    "COPD": "copd",
    "Acute Myocardial Infarction": "aortic-stenosis",
    "Pediatric Asthma Attack": "asthma",
}
VALID_CASE_KEYS = {"pneumonia", "aortic-stenosis", "mitral-stenosis", "asthma", "copd"}


def resolve_case_key(case_id: str, case_title: str) -> str:
    """Return a stable case key from case_id or case_title. Default to pneumonia if unresolved."""
    raw_id = (case_id or "").strip()
    if raw_id and raw_id in VALID_CASE_KEYS:
        return raw_id
    title = (case_title or "").strip()
    if not title:
        return raw_id if raw_id in VALID_CASE_KEYS else "pneumonia"
    # Normalize: lowercase, collapse spaces
    normalized = " ".join(title.split()).strip()
    key = TITLE_TO_CASE_KEY.get(normalized)
    if key:
        return key
    # Try lowercase match for display titles
    key = TITLE_TO_CASE_KEY.get(normalized.lower())
    if key:
        return key
    # Try hyphenated form (e.g. "Aortic Stenosis" -> "aortic-stenosis")
    hyphenated = normalized.lower().replace(" ", "-")
    return hyphenated if hyphenated in VALID_CASE_KEYS else "pneumonia"


# Per-case patient personas for OSCE-style standardized patients. Keys = case keys above.
# chief_complaint aligned with CHIEF_COMPLAINTS in StudentPracticeFlow.jsx.
PATIENT_PERSONAS = {
    "pneumonia": {
        "name_age": "Maria, 52-year-old school teacher",
        "onset_story": "Started with a cold about a week ago; three days ago developed fever and a cough that got worse. No recent travel or sick contacts she can recall.",
        "emotional_state": "Worried and tired; a bit short-tempered because she can't sleep well.",
        "social_brief": "Lives with her husband; two adult children. Non-smoker, occasional wine.",
        "chief_complaint": "I have had fever and productive cough for the past 3 days.",
        "symptoms_known": "Fever, cough with yellow-green sputum, pain when breathing deeply, shortness of breath, tiredness.",
        "reveal_only_if_asked": "She might mention a tiny bit of blood in sputum only if asked about sputum appearance or blood.",
        "do_not_know": "She does not know her diagnosis; avoid medical jargon. She has not had a chest X-ray yet.",
    },
    "aortic-stenosis": {
        "name_age": "James, 68-year-old retiree",
        "onset_story": "Gradual worsening over months; more short of breath and dizzy with activity.",
        "emotional_state": "Anxious about falling; frustrated he can't do his usual walks.",
        "social_brief": "Lives alone; used to be very active.",
        "chief_complaint": "I feel dizzy and short of breath when I exert myself.",
        "symptoms_known": "Shortness of breath with exertion, chest squeezing with activity, dizziness, nearly passed out once recently, can barely climb one flight of stairs.",
        "reveal_only_if_asked": "Syncope and severity of dyspnea—only describe if student asks directly.",
        "do_not_know": "Does not know diagnosis; no medical jargon.",
    },
    "mitral-stenosis": {
        "name_age": "Patient with mitral stenosis",
        "onset_story": "Progressive fatigue and breathlessness.",
        "emotional_state": "Tired and concerned.",
        "social_brief": "Lives at home.",
        "chief_complaint": "I get tired easily and feel breathless when lying down.",
        "symptoms_known": "Tiredness, breathlessness when lying flat, palpitations, pink-tinged sputum when asked.",
        "reveal_only_if_asked": None,
        "do_not_know": "No diagnosis; no jargon.",
    },
    "asthma": {
        "name_age": "Patient with asthma",
        "onset_story": "Recurrent wheezing and chest tightness; worse at night and with triggers.",
        "emotional_state": "Worried when symptoms flare.",
        "social_brief": "Lives at home.",
        "chief_complaint": "I feel chest tightness and wheezing, especially at night.",
        "symptoms_known": "Wheezing, chest tightness, cough, waking at night; worse with cold air, dust, cats, pollen.",
        "reveal_only_if_asked": None,
        "do_not_know": "May know they have asthma; avoid jargon.",
    },
    "copd": {
        "name_age": "Patient with COPD",
        "onset_story": "Long-standing cough; worsening shortness of breath over years.",
        "emotional_state": "Frustrated by limitation.",
        "social_brief": "Smoked for many years; quit several years ago.",
        "chief_complaint": "I have chronic cough and increasing shortness of breath.",
        "symptoms_known": "Chronic cough, thick morning sputum, shortness of breath, limited walking distance.",
        "reveal_only_if_asked": None,
        "do_not_know": "May know COPD; avoid jargon.",
    },
}


def _build_system_prompt(
    case_key: str,
    persona: dict | None,
    title: str,
    category: str,
    symptoms: list[str],
) -> str:
    """Build system prompt for the AI patient: persona block + OSCE rules. Fallback to generic if no persona."""
    symptoms_str = ", ".join(symptoms) if symptoms else "Not specified"
    header = "You are a standardized patient in a clinical exam (OSCE)."

    if persona:
        block = [
            f"Character: {persona.get('name_age', 'Patient')}.",
            f"Chief complaint (in your words): {persona.get('chief_complaint', '')}",
            f"Onset / story: {persona.get('onset_story', '')}",
            f"Emotional state: {persona.get('emotional_state', '')}",
            f"Brief social context: {persona.get('social_brief', '')}",
            f"What you know about your symptoms (lay terms): {persona.get('symptoms_known', '')}",
        ]
        reveal = persona.get("reveal_only_if_asked")
        if reveal:
            block.append(f"Reveal only if the student asks directly: {reveal}")
        dont = persona.get("do_not_know")
        if dont:
            block.append(f"Constraints: {dont}")
        header = header + "\n\n" + "\n".join(block)
    else:
        header = (
            f"{header} Condition: {title} ({category}). "
            f"Reported symptoms: {symptoms_str}. "
            "You are being interviewed by a medical student."
        )

    rules = (
        "\n\nOSCE rules: You are being interviewed by a medical student who is learning to diagnose. "
        "Your goal is to help them reach the correct diagnosis through your answers — but do NOT name the diagnosis yourself. "
        "When describing any symptom, always include its most specific, characteristic quality "
        "(type, timing, location, triggers, associated features) — "
        "these details are what distinguish your condition from similar ones. "
        "Do not be vague. Use first person only. Keep answers to 2–4 sentences in natural, lay language. "
        "Reveal sensitive or red-flag information only when the student asks directly. "
        "Where natural and fitting, insert ONE of these exact expressions (and nothing else inside the asterisks): "
        "*coughs*, *sighs*, *laughs*, *gasps*, *clears throat*, *winces*, *groans*, *chuckles* — "
        "only when it genuinely fits. Use at most one per reply. Do not modify or expand them."
    )
    return header + rules


# Fallback canned replies when Ollama is unavailable (match frontend CASE_PATIENT_REPLIES)
CASE_PATIENT_REPLIES = {
    "pneumonia": [
        "It hurts when I breathe deeply, like a stabbing pain.",
        "The cough started about three days ago.",
        "Yes, I've had a low-grade fever since yesterday.",
        "It's yellowish-green, sometimes with a bit of blood.",
    ],
    "aortic-stenosis": [
        "Yes, I feel lightheaded when I get up quickly.",
        "I get a squeezing feeling in my chest when I exert myself.",
        "I nearly passed out last week while walking.",
        "I can barely climb one flight without stopping.",
    ],
    "mitral-stenosis": [
        "Sometimes my heart feels like it's fluttering.",
        "Yes, I've noticed some pink-tinged mucus.",
        "I get exhausted doing simple tasks.",
        "I need to sleep propped up on pillows now.",
    ],
    "asthma": [
        "Cold air and dust seem to make it worse.",
        "Yes, I often wake up wheezing at 3 or 4 AM.",
        "It feels like someone is squeezing my chest.",
        "I'm allergic to cats and pollen.",
    ],
    "copd": [
        "I've had this cough for years, but it's gotten worse.",
        "I smoked for 30 years, quit five years ago.",
        "Yes, I cough up thick mucus every morning.",
        "Maybe 50 meters before I need to rest.",
    ],
}


class PatientReplyRequest(BaseModel):
    # Case context
    case_id: str = "pneumonia"
    case_title: str = ""
    case_category: str = ""
    symptoms: list[str] = []
    chief_complaint: str = ""
    # Student input
    student_question: str
    conversation_history: list[dict] | None = None
    # Patient persona (from patients.js — sent by frontend)
    patient_id: str = ""
    patient_name: str = ""
    patient_age: int = 0
    patient_gender: str = ""
    patient_occupation: str = ""
    patient_personality: str = ""
    past_medical_history: str = ""
    medications: str = ""
    allergies: str = ""
    social_history: str = ""
    family_history: str = ""
    system_prompt: str = ""  # LLM persona prompt from patients.js


class TTSRequest(BaseModel):
    text: str
    voice: str = ""  # edge-tts voice name; empty = use server default


def _find_ffmpeg_bin():
    """Locate ffmpeg.exe, including common winget install locations on Windows."""
    ff = shutil.which("ffmpeg")
    if ff:
        return None  # Already on PATH

    if os.name != "nt":
        return None

    # Check winget user install: %LOCALAPPDATA%\Microsoft\WinGet\Packages\
    local = os.environ.get("LOCALAPPDATA", "")
    if local:
        winget = os.path.join(local, "Microsoft", "WinGet", "Packages")
        if os.path.isdir(winget):
            for name in os.listdir(winget):
                if "ffmpeg" in name.lower() or "FFmpeg" in name:
                    pkg = os.path.join(winget, name)
                    for root, _, files in os.walk(pkg):
                        if "ffmpeg.exe" in files:
                            bin_dir = os.path.dirname(os.path.join(root, "ffmpeg.exe"))
                            return bin_dir
    return None


def _check_ffmpeg():
    """Ensure FFmpeg is available. On Windows, add winget install path to PATH if needed."""
    if shutil.which("ffmpeg"):
        return

    bin_dir = _find_ffmpeg_bin()
    if bin_dir:
        os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
        if shutil.which("ffmpeg"):
            return

    raise RuntimeError(
        "FFmpeg not found. Whisper requires it to decode audio. "
        "Install with: winget install ffmpeg   (or choco install ffmpeg). "
        "Then restart your terminal and run the server again."
    )


# Lazy-load model on first request
_model = None


def get_model():
    global _model
    if _model is None:
        import whisper
        name = os.environ.get("WHISPER_MODEL", "base")
        _model = whisper.load_model(name, device=os.environ.get("WHISPER_DEVICE", "cpu"))
    return _model


@asynccontextmanager
async def lifespan(app: FastAPI):
    _check_ffmpeg()
    yield
    global _model
    _model = None


app = FastAPI(title="Medupal STT", lifespan=lifespan)

@app.get("/health")
def health():
    """Health check; verifies FFmpeg is available."""
    return {"ok": True, "ffmpeg": bool(shutil.which("ffmpeg"))}




app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")
OLLAMA_TIMEOUT = float(os.environ.get("OLLAMA_TIMEOUT", "90"))

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
TTS_VOICE = os.environ.get("TTS_VOICE", "nova")
TTS_MODEL = os.environ.get("TTS_MODEL", "tts-1-hd")

# ElevenLabs TTS
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "").strip()
# Free default voice IDs — Aria (female), Brian (male)
ELEVENLABS_VOICE_FEMALE = os.environ.get("ELEVENLABS_VOICE_FEMALE", "9BWtsMINqrJLrRacOk9x")
ELEVENLABS_VOICE_MALE   = os.environ.get("ELEVENLABS_VOICE_MALE",   "nPczCjzI2devNBz1zQrb")

# RAG: Supabase vector store + Ollama embeddings
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")  # service role key for backend
EMBED_MODEL  = os.environ.get("EMBED_MODEL", "nomic-embed-text")
EMBED_TIMEOUT = float(os.environ.get("EMBED_TIMEOUT", "15"))


def _fallback_reply(case_id: str) -> str:
    replies = CASE_PATIENT_REPLIES.get(case_id) or CASE_PATIENT_REPLIES["pneumonia"]
    return random.choice(replies)


async def _embed_text(text: str) -> list[float] | None:
    """Embed text using nomic-embed-text via Ollama. Returns 768-dim vector or None on failure."""
    url = f"{OLLAMA_BASE.rstrip('/')}/api/embeddings"
    try:
        async with httpx.AsyncClient(timeout=EMBED_TIMEOUT) as client:
            r = await client.post(url, json={"model": EMBED_MODEL, "prompt": text})
            r.raise_for_status()
            embedding = r.json().get("embedding")
            if isinstance(embedding, list) and len(embedding) > 0:
                return embedding
    except Exception:
        pass
    return None


async def _retrieve_patient_context(question: str, patient_id: str, top_k: int = 3) -> list[str]:
    """
    Embed the student's question and retrieve the top-k most relevant chunks
    from the patient_documents table in Supabase.
    Returns a list of chunk_text strings (empty list on any failure).
    """
    if not SUPABASE_URL or not SUPABASE_KEY or not patient_id:
        return []

    embedding = await _embed_text(question)
    if not embedding:
        return []

    url = f"{SUPABASE_URL}/rest/v1/rpc/match_patient_documents"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "query_embedding": embedding,
        "patient_id_filter": patient_id,
        "match_count": top_k,
        "match_threshold": 0.4,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            results = r.json()
            return [row["chunk_text"] for row in results if row.get("chunk_text")]
    except Exception:
        pass
    return []


def _build_ollama_messages(
    system: str,
    conversation_history: list[dict] | None,
    current_question: str,
) -> list[dict]:
    """Convert frontend conversation_history (student/patient) into Ollama user/assistant turns."""
    messages = [{"role": "system", "content": system}]

    if conversation_history:
        for turn in conversation_history:
            role = (turn.get("role") or "").lower()
            content = turn.get("content") or ""
            if not content.strip():
                continue
            if role == "student":
                messages.append({"role": "user", "content": content.strip()})
            elif role == "patient":
                messages.append({"role": "assistant", "content": content.strip()})
            # skip "system", "alert", and any other roles

    messages.append({"role": "user", "content": current_question.strip()})
    return messages


async def _groq_chat(
    system: str,
    current_question: str,
    conversation_history: list[dict] | None = None,
) -> str | None:
    """Call Groq API (OpenAI-compatible). Returns reply or None on failure."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    messages = _build_ollama_messages(system, conversation_history, current_question)
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "max_tokens": 120,
        "temperature": 0.7,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[Groq error] {e}")
        if hasattr(e, "response"):
            print(f"[Groq response] {e.response.text}")  # type: ignore[union-attr]
    return None


async def _ollama_chat(
    system: str,
    current_question: str,
    conversation_history: list[dict] | None = None,
) -> str | None:
    """Call Ollama /api/chat with optional conversation history; return assistant message or None."""
    url = f"{OLLAMA_BASE.rstrip('/')}/api/chat"
    messages = _build_ollama_messages(system, conversation_history, current_question)
    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": messages,
        "options": {
            "num_predict": 120,
            "num_ctx": 2048,
            "temperature": 0.7,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            msg = data.get("message")
            if msg and isinstance(msg.get("content"), str):
                return msg["content"].strip()
    except Exception:
        pass
    return None


async def _chat(
    system: str,
    current_question: str,
    conversation_history: list[dict] | None = None,
) -> str | None:
    """Use Groq if configured, otherwise fall back to local Ollama."""
    if GROQ_API_KEY:
        return await _groq_chat(system, current_question, conversation_history)
    return await _ollama_chat(system, current_question, conversation_history)


@app.post("/tts")
async def tts(body: TTSRequest):
    """Stream TTS audio via ElevenLabs."""
    from fastapi.responses import StreamingResponse
    from elevenlabs.client import ElevenLabs

    text = body.text.strip()[:4096]
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")

    # voice passed from frontend is the gender string ("male"/"female")
    gender = body.voice.strip().lower()
    voice_name = ELEVENLABS_VOICE_MALE if gender == "male" else ELEVENLABS_VOICE_FEMALE

    import re

    # Normalize verbose expressions to simple ones ElevenLabs recognises as sounds
    EXPRESSION_MAP = {
        r'cough\w*':         '*coughs*',
        r'laugh\w*':         '*laughs*',
        r'sigh\w*':          '*sighs*',
        r'gasp\w*':          '*gasps*',
        r'clear\w* throat\w*': '*clears throat*',
        r'wince\w*':         '*winces*',
        r'groan\w*':         '*groans*',
        r'chuckle\w*':       '*chuckles*',
    }

    def normalize_expressions(t: str) -> str:
        def replace_expr(m):
            inner = m.group(1).strip().lower()
            for pattern, replacement in EXPRESSION_MAP.items():
                if re.search(pattern, inner):
                    return replacement
            return ''  # unknown expression — drop it
        return re.sub(r'\*([^*]+)\*', replace_expr, t)

    if gender == "female":
        import edge_tts
        # Strip all expressions — edge-tts reads them as text
        clean = re.sub(r'\*[^*]+\*', '', text).strip()
        async def generate_female():
            try:
                communicate = edge_tts.Communicate(clean, "en-US-AriaNeural")
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        yield chunk["data"]
            except Exception as e:
                print(f"[edge-tts error] {e}")
        return StreamingResponse(generate_female(), media_type="audio/mpeg")

    # ElevenLabs for male — normalize expressions so they produce sounds not speech
    tts_text = normalize_expressions(text)

    def generate():
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        audio_stream = client.text_to_speech.stream(
            voice_id=voice_name,
            text=tts_text,
            model_id="eleven_turbo_v2_5",
        )
        for chunk in audio_stream:
            if chunk:
                yield chunk

    return StreamingResponse(generate(), media_type="audio/mpeg")


@app.post("/patient-reply")
async def patient_reply(body: PatientReplyRequest):
    """
    Generate a patient reply using Ollama (llama3.2).
    - Uses the rich patient system_prompt from patients.js when provided.
    - Retrieves relevant RAG context from Supabase (nomic-embed-text embeddings).
    - Falls back to legacy PATIENT_PERSONAS if no patient system_prompt supplied.
    """
    current_question = body.student_question.strip()

    # 1. Determine base system prompt
    if body.system_prompt.strip():
        # Use the detailed patient persona from patients.js (preferred path)
        base_system = body.system_prompt.strip()

        # Append OSCE behavioural rules (the patients.js prompts don't include these)
        osce_rules = (
            "\n\nOSCE session rules: You are being interviewed by a medical student who is learning to diagnose. "
            "Your goal is to help them reach the correct diagnosis through your answers — but do NOT name the diagnosis yourself. "
            "When describing any symptom, always include its most specific, characteristic quality "
            "(e.g. type, timing, location, what makes it better or worse, associated features) — "
            "these details are what distinguish your condition from similar ones. "
            "Do not be vague. A student asking 'do you have a cough?' deserves a vivid, specific answer, not just 'yes'. "
            "Keep replies to 2–4 sentences in natural, lay language. Stay in character. "
            "Only reveal red-flag or sensitive information when asked directly. "
            "Where natural and fitting, insert ONE of these exact expressions (and nothing else inside the asterisks): "
            "*coughs*, *sighs*, *laughs*, *gasps*, *clears throat*, *winces*, *groans*, *chuckles* — "
            "only when it genuinely fits. Use at most one per reply. Do not modify or expand them."
        )
        base_system = base_system + osce_rules
    else:
        # Legacy fallback: use old case-based PATIENT_PERSONAS dict
        case_key = resolve_case_key(body.case_id, body.case_title)
        persona = PATIENT_PERSONAS.get(case_key)
        title = body.case_title or body.case_id.replace("-", " ").title()
        base_system = _build_system_prompt(
            case_key, persona, title, body.case_category or "", body.symptoms or []
        )

    # RAG retrieval disabled at inference time — requires a dedicated embedding server
    # (Ollama model-swapping between nomic-embed-text and llama3.2 causes timeouts).
    # The patient system_prompt already contains full persona context.
    system = base_system

    # 3. Call LLM (Groq if configured, otherwise local Ollama)
    text = await _chat(
        system,
        current_question,
        conversation_history=body.conversation_history,
    )

    # 4. Fallback to canned reply if Ollama is unavailable
    if not text:
        case_key = resolve_case_key(body.case_id, body.case_title)
        text = _fallback_reply(case_key)

    return {"text": text}


@app.post("/stt")
async def stt(file: UploadFile = File(...)):
    """Accept an audio file (e.g. webm from MediaRecorder), transcribe with Whisper, return text."""
    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    if not suffix.startswith("."):
        suffix = "." + suffix

    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read upload: {e}")

    if not content:
        return {"text": ""}

    tmp = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        tmp = tmp_path

        model = get_model()
        result = model.transcribe(tmp_path, language="en", fp16=False)
        text = (result.get("text") or "").strip()
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp and os.path.isfile(tmp):
            try:
                os.unlink(tmp)
            except Exception:
                pass
