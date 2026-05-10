"""
STT server: capture audio from browser (Web API) and transcribe with OpenAI Whisper.
Patient replies via Groq (OpenAI-compatible API), with Ollama fallback. Run: python -m uvicorn main:app --reload --port 8000
"""
import asyncio
import io
import logging
import os
import random
import shutil
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

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

logger = logging.getLogger(__name__)


def _get_env_from_file(filename: str, key: str) -> str:
    """
    Read a KEY=value pair from a dotenv-style file.
    Supports optional surrounding single/double quotes.
    """
    try:
        env_path = Path(__file__).resolve().parent.parent / filename
        if not env_path.is_file():
            return ""
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip() != key:
                continue
            value = v.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
                value = value[1:-1]
            return value.strip()
    except Exception:
        return ""
    return ""

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
        "date_of_birth": "15/03/1973",
        "onset_story": "Started with a cold about a week ago; three days ago developed fever and a cough that got worse. No recent travel or sick contacts she can recall.",
        "emotional_state": "Worried and tired; a bit short-tempered because she can't sleep well.",
        "social_brief": "Lives with her husband; two adult children. Non-smoker, occasional wine.",
        "chief_complaint": "I have had fever and productive cough for the past 3 days.",
        "symptoms_known": "Fever, cough with yellow-green sputum, pain when breathing deeply, shortness of breath, tiredness.",
        "reveal_only_if_asked": "She might mention a tiny bit of blood in sputum only if asked about sputum appearance or blood.",
        "do_not_know": "She does not know her diagnosis. If asked what condition she has, say 'I don't know, that's why I'm here.' No medical jargon. Has not had a chest X-ray yet.",
    },
    "aortic-stenosis": {
        "name_age": "James, 68-year-old retiree",
        "date_of_birth": "22/08/1957",
        "onset_story": "Gradual worsening over months; more short of breath and dizzy with activity.",
        "emotional_state": "Anxious about falling; frustrated he can't do his usual walks.",
        "social_brief": "Lives alone; used to be very active.",
        "chief_complaint": "I feel dizzy and short of breath when I exert myself.",
        "symptoms_known": "Shortness of breath with exertion, chest squeezing with activity, dizziness, nearly passed out once recently, can barely climb one flight of stairs.",
        "reveal_only_if_asked": "Syncope and severity of dyspnea — only describe if student asks directly.",
        "do_not_know": "Does not know diagnosis. If asked what condition he has, say 'I'm not sure, I was hoping you'd tell me.' No medical jargon.",
    },
    "mitral-stenosis": {
        "name_age": "Eleanor, 45-year-old office administrator",
        "date_of_birth": "11/06/1980",
        "onset_story": "Progressive fatigue and breathlessness over several months; recently started waking at night unable to breathe comfortably lying flat.",
        "emotional_state": "Tired and quietly concerned; doesn't want to make a fuss.",
        "social_brief": "Lives with partner; two school-age children.",
        "chief_complaint": "I get tired easily and feel breathless when lying down.",
        "symptoms_known": "Tiredness, breathlessness when lying flat, palpitations, occasional pink-tinged sputum if asked.",
        "reveal_only_if_asked": "Pink-tinged sputum only if student asks about cough or sputum directly.",
        "do_not_know": "Does not know diagnosis. If asked what condition she has, say 'I really don't know, I've just been feeling off.' No medical jargon.",
    },
    "asthma": {
        "name_age": "Ryan, 24-year-old warehouse worker",
        "date_of_birth": "03/09/2001",
        "onset_story": "Chest tightness and wheezing started a few days ago; worse at night and after being near a dusty area at work.",
        "emotional_state": "A bit anxious, especially at night when symptoms worsen.",
        "social_brief": "Lives in a shared flat; non-smoker; cat at home.",
        "chief_complaint": "I feel chest tightness and wheezing, especially at night.",
        "symptoms_known": "Wheezing, chest tightness, cough, waking at night; worse with cold air, dust, the cat.",
        "reveal_only_if_asked": "Severity at night and triggers only if student asks.",
        "do_not_know": "Does not know diagnosis. If asked what condition he has, say 'I'm not sure, that's what I'm hoping you can work out.' No medical jargon.",
    },
    "copd": {
        "name_age": "Trevor, 65-year-old retired factory worker",
        "date_of_birth": "17/04/1960",
        "onset_story": "Long-standing cough that has been getting gradually worse over years; now struggling with simple tasks like walking to the shops.",
        "emotional_state": "Frustrated and resigned; used to being independent.",
        "social_brief": "Smoked 30 a day for 40 years; quit five years ago. Lives with wife.",
        "chief_complaint": "I have chronic cough and increasing shortness of breath.",
        "symptoms_known": "Chronic cough, thick morning sputum, shortness of breath on minimal exertion, wheezing.",
        "reveal_only_if_asked": "How far he can walk and sputum colour only if asked directly.",
        "do_not_know": "Does not know diagnosis. If asked what condition he has, say 'Nobody's put a name on it yet, that's why I'm here.' No medical jargon.",
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
        ]
        dob = persona.get("date_of_birth")
        if dob:
            block.append(f"Date of birth: {dob}.")
        block += [
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
            f"{header} Reported symptoms: {symptoms_str}. "
            "You are being interviewed by a medical student."
        )

    rules = (
        "\n\nOSCE rules: You are being interviewed by a medical student who is learning to diagnose. "
        "ABSOLUTE RULE — never say the name of your diagnosis, condition, or disease under any circumstance. "
        "This applies even when expressing uncertainty — do NOT say 'I'm not sure if it's asthma' or 'maybe it's my heart' — "
        "simply say 'I don't know, that's why I came' or 'I was hoping you could tell me.' "
        "Never repeat back medical terms the student uses (e.g. if they ask 'is it COPD?', do not say 'I don't know if it's COPD'). "
        "Your goal is to help them reach the correct diagnosis through your symptoms alone. "
        "BREVITY RULE — keep every answer to 1–2 sentences maximum. "
        "Give only what was asked. Do not volunteer extra information. Make the student ask follow-up questions. "
        "When describing a symptom, give one specific detail (e.g. timing, character, severity) — not all at once. "
        "Reveal red-flag or sensitive information only when the student asks directly. "
        "Use first person only, in natural lay language. "
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
    revealed_symptoms: list[str] = []  # symptoms already disclosed to the student this session
    conversation_summary: str = ""    # rolling summary of prior turns (injected when non-empty)


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
        name = os.environ.get("WHISPER_MODEL", "tiny.en")
        _model = whisper.load_model(name, device=os.environ.get("WHISPER_DEVICE", "cpu"))
    return _model


@asynccontextmanager
async def lifespan(app: FastAPI):
    _check_ffmpeg()
    # Pre-warm Kokoro in background so first TTS request is instant
    import asyncio
    asyncio.get_event_loop().run_in_executor(None, _get_kokoro)
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


GROQ_CHAT_URL = os.getenv(
    "GROQ_CHAT_COMPLETIONS_URL",
    "https://api.groq.com/openai/v1/chat/completions",
).strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_TIMEOUT = float(os.getenv("GROQ_TIMEOUT", "60"))


async def _groq_chat(messages: list[dict]) -> str:
    """Call Groq chat completions. Returns assistant text or empty string. Raises on auth/HTTP failure."""
    api_key = (
        os.getenv("GROQ_API_KEY", "").strip()
        or _get_env_from_file(".env.local", "GROQ_API_KEY")
        or _get_env_from_file(".env", "GROQ_API_KEY")
    )
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set. Set it to use Groq; Ollama will be used as fallback.")
    async with httpx.AsyncClient(timeout=GROQ_TIMEOUT) as client:
        r = await client.post(
            GROQ_CHAT_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": GROQ_MODEL, "messages": messages},
        )
        r.raise_for_status()
        data = r.json()
    choices = data.get("choices") or []
    if not choices:
        return ""
    content = (choices[0].get("message") or {}).get("content")
    return content.strip() if isinstance(content, str) and content.strip() else ""


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
    """Try Groq first, fall back to local Ollama."""
    messages = _build_ollama_messages(system, conversation_history, current_question)
    try:
        text = await _groq_chat(messages)
        if text:
            return text
    except Exception as e:
        logger.warning("Groq failed: %s; falling back to Ollama.", e)
    return await _ollama_chat(system, current_question, conversation_history=conversation_history)


import re as _re

_EXPRESSION_MAP = {
    r'cough\w*':             '*coughs*',
    r'laugh\w*':             '*laughs*',
    r'sigh\w*':              '*sighs*',
    r'gasp\w*':              '*gasps*',
    r'clear\w* throat\w*':  '*clears throat*',
    r'wince\w*':             '*winces*',
    r'groan\w*':             '*groans*',
    r'chuckle\w*':           '*chuckles*',
}

def _normalize_expressions(t: str) -> str:
    def replace_expr(m):
        inner = m.group(1).strip().lower()
        for pattern, replacement in _EXPRESSION_MAP.items():
            if _re.search(pattern, inner):
                return replacement
        return ''
    return _re.sub(r'\*([^*]+)\*', replace_expr, t)


_kokoro_pipeline = None

def _get_kokoro():
    global _kokoro_pipeline
    if _kokoro_pipeline is None:
        import warnings
        from kokoro import KPipeline
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _kokoro_pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
    return _kokoro_pipeline


def _kokoro_tts(text: str, voice: str) -> bytes:
    """Generate audio with Kokoro locally, return WAV bytes."""
    import io
    import numpy as np
    import soundfile as sf

    clean = _re.sub(r'\*[^*]+\*', '', text).strip()
    pipe = _get_kokoro()
    chunks = []
    for _, _, audio in pipe(clean, voice=voice, speed=1.0):
        chunks.append(audio)
    if not chunks:
        return b''
    combined = np.concatenate(chunks)
    buf = io.BytesIO()
    sf.write(buf, combined, 24000, format='WAV')
    return buf.getvalue()


async def _tts_stream(text: str, gender: str):
    import asyncio
    import io
    import soundfile as sf
    import numpy as np
    from fastapi.responses import StreamingResponse

    text = _re.sub(r'\*[^*]+\*', '', text.strip()[:4096]).strip()
    gender = (gender or "female").strip().lower()
    voice = 'af_heart' if gender == 'female' else 'am_adam'

    # Split into sentences so we can stream chunk-by-chunk
    sentences = [s.strip() for s in _re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    if not sentences:
        sentences = [text]

    loop = asyncio.get_event_loop()

    def gen_sentence(sentence):
        pipe = _get_kokoro()
        chunks = [a for _, _, a in pipe(sentence, voice=voice, speed=1.0)]
        if not chunks:
            return b''
        combined = np.concatenate(chunks)
        buf = io.BytesIO()
        sf.write(buf, combined, 24000, format='WAV', subtype='PCM_16')
        return buf.getvalue()

    async def generate():
        for sentence in sentences:
            try:
                wav = await loop.run_in_executor(None, gen_sentence, sentence)
                if wav:
                    yield wav
            except Exception as e:
                print(f"[Kokoro sentence error] {e}")

    return StreamingResponse(generate(), media_type="audio/wav")


@app.post("/tts")
async def tts(body: TTSRequest):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")
    return await _tts_stream(body.text, body.voice)


@app.get("/tts")
async def tts_get(text: str, voice: str = "female"):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Empty text")
    return await _tts_stream(text, voice)


def _extract_revealed_symptoms(
    response_text: str,
    all_symptoms: list[str],
    already_revealed: list[str],
) -> list[str]:
    """
    Keyword-match the LLM response against the case symptom list.
    Returns the updated revealed list (already_revealed ∪ newly_found).
    Over-detection is preferred over under-detection — it's better to
    'unlock' a symptom early than to keep injecting a stale 'hide this' rule.
    """
    text = response_text.lower()
    revealed = {s.lower() for s in already_revealed}

    for symptom in all_symptoms:
        s_lower = symptom.lower()
        if s_lower in revealed:
            continue
        # Use words longer than 3 chars as keywords; fall back to all words
        keywords = [w for w in s_lower.split() if len(w) > 3] or s_lower.split()
        if any(kw in text for kw in keywords):
            revealed.add(s_lower)

    # Return in original casing
    symptom_map = {s.lower(): s for s in all_symptoms}
    return [symptom_map.get(s, s) for s in revealed]


@app.post("/patient-reply")
async def patient_reply(body: PatientReplyRequest):
    """Generate a patient reply using Groq (falls back to Ollama, then canned replies)."""
    current_question = body.student_question.strip()

    # Build system prompt — prefer rich persona from patients.js, fall back to legacy dict
    if body.system_prompt.strip():
        osce_rules = (
            "\n\nOSCE session rules: You are being interviewed by a medical student who is learning to diagnose. "
            "ABSOLUTE RULE — never name your diagnosis or medical condition, even if directly asked. "
            "If the student asks 'what is wrong with you?', 'do you have [condition]?', or 'what did the doctor say?', "
            "respond with something like 'I don't know, that's why I came' or 'I was hoping you could tell me.' "
            "Your goal is to help the student reach the correct diagnosis through your symptoms — not to give it away. "
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
        system = body.system_prompt.strip() + osce_rules
    else:
        case_key = resolve_case_key(body.case_id, body.case_title)
        persona = PATIENT_PERSONAS.get(case_key)
        title = body.case_title or body.case_id.replace("-", " ").title()
        system = _build_system_prompt(
            case_key, persona, title, body.case_category or "", body.symptoms or []
        )

    # Rolling summary — ground the patient in what they've already said in earlier turns
    if body.conversation_summary.strip():
        system = (
            system
            + "\n\nSummary of what you have already told this student in earlier turns "
            "(treat this as your memory — do not contradict any of it):\n"
            + body.conversation_summary.strip()
        )

    # Symptom disclosure state — tell the patient what it has/hasn't revealed yet
    if body.symptoms:
        revealed_set = {s.lower() for s in body.revealed_symptoms}
        already = [s for s in body.symptoms if s.lower() in revealed_set]
        not_yet = [s for s in body.symptoms if s.lower() not in revealed_set]
        disclosure_block = "\n\nSymptom disclosure state for this session:"
        if already:
            disclosure_block += f"\n- Already discussed with the student (you may elaborate if asked again): {', '.join(already)}."
        if not_yet:
            disclosure_block += f"\n- NOT yet disclosed (do NOT mention these unless the student asks about them directly): {', '.join(not_yet)}."
        system = system + disclosure_block

    # RAG: retrieve relevant chunks for this specific patient-case combination
    case_key = resolve_case_key(body.case_id, body.case_title)
    compound_id = f"{body.patient_id}__{case_key}" if body.patient_id else ""
    rag_chunks = await _retrieve_patient_context(current_question, compound_id)
    if rag_chunks:
        rag_block = (
            "\n\nRelevant patient record details — use these facts to answer accurately. "
            "Do NOT reveal them unprompted; only use them when the student's question is relevant:\n"
            + "\n".join(f"- {c}" for c in rag_chunks)
        )
        system = system + rag_block

    text = await _chat(system, current_question, conversation_history=body.conversation_history)

    if not text:
        case_key = resolve_case_key(body.case_id, body.case_title)
        text = _fallback_reply(case_key)

    updated_revealed = _extract_revealed_symptoms(text, body.symptoms, body.revealed_symptoms)
    return {"text": text, "revealed_symptoms": updated_revealed}


class SummariseRequest(BaseModel):
    conversation_history: list[dict]      # full message list [{role, content}]
    patient_name: str = ""
    case_title: str = ""
    symptoms: list[str] = []
    prior_summary: str = ""               # existing summary to build on (may be empty)


@app.post("/summarise-session")
async def summarise_session(body: SummariseRequest):
    """
    Produce a compact factual summary of what the patient has disclosed so far.
    Called by the frontend every 6 patient turns. Returns {"summary": "..."}.
    """
    # Build readable transcript from history (student + patient turns only)
    lines = []
    for msg in body.conversation_history:
        role = (msg.get("role") or "").lower()
        content = (msg.get("content") or "").strip()
        if not content or role in ("system", "alert"):
            continue
        label = "Student" if role == "student" else "Patient"
        lines.append(f"{label}: {content}")
    transcript = "\n".join(lines)

    if not transcript:
        return {"summary": body.prior_summary}

    prior_block = (
        f"Prior summary (update and expand this — do not repeat it verbatim):\n{body.prior_summary}\n\n"
        if body.prior_summary.strip() else ""
    )
    symptoms_block = (
        f"Full symptom list for this case: {', '.join(body.symptoms)}.\n"
        if body.symptoms else ""
    )

    prompt = (
        f"You are a medical scribe. Based on the conversation below between a medical student and a "
        f"patient named {body.patient_name or 'the patient'} (case: {body.case_title or 'unknown'}), "
        f"write a single compact paragraph summarising exactly what the patient has disclosed so far.\n\n"
        f"{symptoms_block}"
        f"{prior_block}"
        f"Conversation:\n{transcript}\n\n"
        f"Rules:\n"
        f"- Be factual and specific (include numbers, timing, severity scores where mentioned)\n"
        f"- Write in third person ('The patient reported...')\n"
        f"- Do not invent anything not said in the conversation\n"
        f"- Keep it under 120 words\n"
        f"- End with: 'Has not yet discussed: [list any symptoms from the case not mentioned]'\n"
        f"Summary:"
    )

    summary = await _chat(prompt, "", conversation_history=None) or body.prior_summary
    return {"summary": summary.strip()}


# ── History-Taking Evaluation ─────────────────────────────────────────────────

CASE_TYPE_MAP = {
    "pneumonia": "respiratory",
    "asthma": "respiratory",
    "copd": "respiratory",
    "aortic-stenosis": "cardiovascular",
    "mitral-stenosis": "cardiovascular",
}

_CHECKLIST_CACHE: dict[str, dict] = {}

def _load_checklist(case_type: str) -> dict:
    if case_type in _CHECKLIST_CACHE:
        return _CHECKLIST_CACHE[case_type]
    import json
    docs_dir = Path(__file__).resolve().parent / "case_docs"
    path = docs_dir / f"{case_type}_history_checklist.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    _CHECKLIST_CACHE[case_type] = data
    return data


SCORING_MODEL = os.getenv("SCORING_MODEL", "llama-3.3-70b-versatile")


async def _groq_chat_json(messages: list[dict]) -> str:
    """Call Groq for scoring using a capable model; extract JSON from response."""
    import re as _re2
    api_key = (
        os.getenv("GROQ_API_KEY", "").strip()
        or _get_env_from_file(".env.local", "GROQ_API_KEY")
        or _get_env_from_file(".env", "GROQ_API_KEY")
    )
    if not api_key:
        raise ValueError("GROQ_API_KEY not set")
    logger.info("[scoring] using model=%s", SCORING_MODEL)
    async with httpx.AsyncClient(timeout=90) as client:
        r = await client.post(
            GROQ_CHAT_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": SCORING_MODEL,
                "messages": messages,
                "temperature": 0.1,
            },
        )
        r.raise_for_status()
        data = r.json()
    choices = data.get("choices") or []
    if not choices:
        return "{}"
    content = ((choices[0].get("message") or {}).get("content") or "").strip()
    # Strip markdown fences if the model wrapped the JSON
    content = _re2.sub(r"^```(?:json)?\s*", "", content)
    content = _re2.sub(r"\s*```$", "", content)
    content = content.strip()
    # Extract the outermost JSON object if there is surrounding prose
    m = _re2.search(r"\{[\s\S]*\}", content)
    if m:
        content = m.group(0)
    logger.info("[scoring] raw LLM response length=%d", len(content))
    return content if content else "{}"


class HistoryEvalRequest(BaseModel):
    conversation: list[dict]
    case_id: str = ""
    case_title: str = ""
    patient_name: str = ""


@app.post("/evaluate-history-taking")
async def evaluate_history_taking(body: HistoryEvalRequest):
    """Score a history-taking conversation against the OSCE checklist."""
    import json as _json

    case_key = resolve_case_key(body.case_id, body.case_title)
    case_type = CASE_TYPE_MAP.get(case_key, "respiratory")

    try:
        checklist = _load_checklist(case_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load checklist: {e}")

    student_turns = [
        m.get("content", "").strip()
        for m in body.conversation
        if m.get("role") in ("student", "user") and m.get("content", "").strip()
    ]
    if not student_turns:
        raise HTTPException(status_code=400, detail="No student messages found in conversation.")

    student_transcript = "\n".join(f"{i+1}. {t}" for i, t in enumerate(student_turns))
    logger.info("[scoring] case=%s type=%s turns=%d\n%s", case_key, case_type, len(student_turns), student_transcript)

    # Build numbered checklist for the prompt
    checklist_lines = []
    all_items: dict[int, dict] = {}
    for section in checklist["sections"]:
        checklist_lines.append(f"\n[{section['label']}]")
        for item in section["items"]:
            checklist_lines.append(f"  {item['num']}. {item['text']}")
            all_items[item["num"]] = item
    checklist_text = "\n".join(checklist_lines)
    total_items = checklist["total_items"]

    # Ask the LLM only for covered item numbers — much simpler output, works on small models
    system_prompt = (
        "You are an OSCE examiner. Evaluate what checklist items the medical student covered. "
        "Be generous: mark an item covered if there is any reasonable interpretation the student addressed it. "
        "Return ONLY valid JSON with no markdown, no explanation."
    )

    user_prompt = (
        f"CASE: {body.case_title or case_key} ({case_type} history)\n\n"
        f"STUDENT SAID (in order):\n{student_transcript}\n\n"
        f"OSCE CHECKLIST:\n{checklist_text}\n\n"
        "Rules:\n"
        "- Item 1: covered if student mentions washing hands or PPE (even 'I will wash my hands').\n"
        "- Item 2: covered if student states their name OR role.\n"
        "- Item 3: covered if student asks for patient's name, DOB, or any identifier.\n"
        "- Item 4: covered if student says they want to ask some questions or take a history.\n"
        "- Item 5: covered if student asks for consent or says 'is that okay?'.\n"
        "- Item 6: covered if the first clinical question is open-ended.\n"
        "- Item 7 (SOCRATES): covered if student asked about ≥5 of: site, onset, character, radiation, "
        "associated symptoms, time course, exacerbating/relieving factors, severity.\n"
        "- Item 8: covered if student screened for ≥3 relevant system symptoms.\n"
        "- Item 9 (ICE): covered if student asked about ideas, concerns, OR expectations.\n"
        "- Items 10, 27, 30, 32: covered if student summarised at any point.\n"
        "- Items 31, 33: infer from overall conversation quality.\n\n"
        "Return JSON in this exact format:\n"
        "{\n"
        '  "covered_items": [<list of item numbers the student covered>],\n'
        '  "structure_followed": <true if student broadly followed Introduction→PC→HPC→PMH→DH→FH→SH→Closing order>,\n'
        '  "structure_notes": "<one sentence>",\n'
        '  "feedback": "<2-3 sentence overall feedback>",\n'
        '  "strengths": ["<strength>"],\n'
        '  "areas_for_improvement": ["<area>"]\n'
        "}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    raw_json = "{}"
    scoring_error: str | None = None
    try:
        raw_json = await _groq_chat_json(messages)
        logger.info("[scoring] raw response (500 chars): %s", raw_json[:500])
    except Exception as e:
        scoring_error = f"{type(e).__name__}: {e}"
        logger.error("[scoring] Groq call failed: %s", scoring_error, exc_info=True)

    def _zeroed_result(msg: str) -> dict:
        return {
            "sections": [
                {"id": s["id"], "label": s["label"],
                 "items": [{"num": i["num"], "text": i["text"], "covered": False, "notes": ""} for i in s["items"]]}
                for s in checklist["sections"]
            ],
            "items_covered": 0,
            "total_items": total_items,
            "structure_followed": False,
            "structure_notes": "Scoring unavailable.",
            "feedback": msg,
            "strengths": [],
            "areas_for_improvement": [],
            "_error": msg,
        }

    if scoring_error:
        return _zeroed_result(scoring_error)

    try:
        result = _json.loads(raw_json)
    except _json.JSONDecodeError as e:
        import re as _re3
        logger.warning("[scoring] JSON decode failed (%s), attempting regex fallback", e)
        result = {}
        # covered_items is always a clean int array — extract it first
        m = _re3.search(r'"covered_items"\s*:\s*(\[[^\]]*\])', raw_json)
        if m:
            try:
                result["covered_items"] = _json.loads(m.group(1))
            except Exception:
                pass
        m2 = _re3.search(r'"structure_followed"\s*:\s*(true|false)', raw_json, _re3.IGNORECASE)
        if m2:
            result["structure_followed"] = m2.group(1).lower() == "true"
        for _f in ("structure_notes", "feedback"):
            m3 = _re3.search(rf'"{_f}"\s*:\s*"([^"]*)"', raw_json)
            if m3:
                result[_f] = m3.group(1)
        for _f in ("strengths", "areas_for_improvement"):
            m4 = _re3.search(rf'"{_f}"\s*:\s*(\[[^\]]*\])', raw_json)
            if m4:
                try:
                    result[_f] = _json.loads(m4.group(1))
                except Exception:
                    pass
        if not result.get("covered_items"):
            logger.error("[scoring] regex fallback also failed. raw=%s", raw_json[:500])
            return _zeroed_result(f"LLM returned invalid JSON: {e}. Raw: {raw_json[:200]}")
        logger.info("[scoring] regex fallback recovered covered_items=%s", result.get("covered_items"))

    covered_set: set[int] = set(int(n) for n in result.get("covered_items", []) if str(n).isdigit())
    logger.info("[scoring] covered_items=%s", sorted(covered_set))

    # Reconstruct full sections with covered flags from the covered_set
    normalised_sections = []
    for cs in checklist["sections"]:
        items_out = [
            {
                "num": ci["num"],
                "text": ci["text"],
                "covered": ci["num"] in covered_set,
                "notes": "",
            }
            for ci in cs["items"]
        ]
        normalised_sections.append({"id": cs["id"], "label": cs["label"], "items": items_out})

    return {
        "sections": normalised_sections,
        "items_covered": len(covered_set),
        "total_items": total_items,
        "structure_followed": bool(result.get("structure_followed", False)),
        "structure_notes": result.get("structure_notes", ""),
        "feedback": result.get("feedback", ""),
        "strengths": result.get("strengths", []),
        "areas_for_improvement": result.get("areas_for_improvement", []),
    }


async def _groq_stt(content: bytes, filename: str) -> str:
    """Transcribe audio via Groq Whisper API. Raises on failure."""
    api_key = (
        os.getenv("GROQ_API_KEY", "").strip()
        or _get_env_from_file(".env.local", "GROQ_API_KEY")
        or _get_env_from_file(".env", "GROQ_API_KEY")
    )
    if not api_key:
        raise ValueError("GROQ_API_KEY not set")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (filename, content, "audio/webm")},
            data={"model": "whisper-large-v3-turbo", "language": "en", "response_format": "json"},
        )
        r.raise_for_status()
        return (r.json().get("text") or "").strip()


@app.post("/stt")
async def stt(file: UploadFile = File(...)):
    """Transcribe audio — tries Groq Whisper first, falls back to local Whisper."""
    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    if not suffix.startswith("."):
        suffix = "." + suffix

    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read upload: {e}")

    if not content:
        return {"text": ""}

    # Try Groq cloud first (fast)
    try:
        text = await _groq_stt(content, f"audio{suffix}")
        return {"text": text}
    except ValueError:
        pass  # no API key — fall through to local
    except Exception as e:
        print(f"[STT] Groq failed, falling back to local Whisper: {e}")

    # Local Whisper fallback
    tmp = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        tmp = tmp_path

        model = get_model()
        result = model.transcribe(tmp_path, language="en", task="transcribe", fp16=False, beam_size=1)
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
