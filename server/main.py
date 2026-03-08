"""
STT server: capture audio from browser (Web API) and transcribe with OpenAI Whisper.
Patient replies via Ollama (Llama 3). Run: python -m uvicorn main:app --reload --port 8000
"""
import os
import random
import shutil
import tempfile
from contextlib import asynccontextmanager

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
        "\n\nOSCE rules: Answer only what is asked. Use first person only. "
        "Keep answers to 2–4 sentences. No medical jargon. Stay in character. "
        "Reveal sensitive or red-flag information only when the student asks you directly about it."
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
    case_id: str = "pneumonia"
    case_title: str = ""
    case_category: str = ""
    symptoms: list[str] = []
    student_question: str
    conversation_history: list[dict] | None = None


class TTSRequest(BaseModel):
    text: str


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
OLLAMA_TIMEOUT = float(os.environ.get("OLLAMA_TIMEOUT", "30"))

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
TTS_VOICE = os.environ.get("TTS_VOICE", "nova")  # nova, alloy, echo, fable, onyx, shimmer
TTS_MODEL = os.environ.get("TTS_MODEL", "tts-1-hd")


def _fallback_reply(case_id: str) -> str:
    replies = CASE_PATIENT_REPLIES.get(case_id) or CASE_PATIENT_REPLIES["pneumonia"]
    return random.choice(replies)


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


@app.post("/tts")
async def tts(body: TTSRequest):
    """Convert text to speech using OpenAI TTS (natural voice). Returns audio/mpeg. 503 if not configured."""
    if not OPENAI_API_KEY or not body.text.strip():
        raise HTTPException(status_code=503, detail="TTS not configured or empty text")
    text = body.text.strip()[:4096]
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": TTS_MODEL,
                    "input": text,
                    "voice": TTS_VOICE,
                },
            )
            r.raise_for_status()
            return Response(content=r.content, media_type="audio/mpeg")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=min(e.response.status_code, 502), detail="TTS provider error")
    except Exception:
        raise HTTPException(status_code=502, detail="TTS request failed")


@app.post("/patient-reply")
async def patient_reply(body: PatientReplyRequest):
    """Generate a patient reply using Ollama (Llama 3). Falls back to canned reply on failure."""
    case_key = resolve_case_key(body.case_id, body.case_title)
    persona = PATIENT_PERSONAS.get(case_key)
    title = body.case_title or body.case_id.replace("-", " ").title()
    category = body.case_category or ""
    system = _build_system_prompt(
        case_key, persona, title, category, body.symptoms or []
    )
    current_question = body.student_question.strip()

    text = await _ollama_chat(
        system,
        current_question,
        conversation_history=body.conversation_history,
    )
    if not text:
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
