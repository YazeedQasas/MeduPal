"""
STT server: capture audio from browser (Web API) and transcribe with OpenAI Whisper.
Patient replies via Ollama (Llama 3). Run: python -m uvicorn main:app --reload --port 8000
"""
import os
import random
import tempfile
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    yield
    global _model
    _model = None


app = FastAPI(title="Medupal STT", lifespan=lifespan)

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


async def _ollama_chat(system: str, user: str) -> str | None:
    """Call Ollama /api/chat; return assistant message content or None on failure."""
    url = f"{OLLAMA_BASE.rstrip('/')}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
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
    symptoms_str = ", ".join(body.symptoms) if body.symptoms else "Not specified"
    title = body.case_title or body.case_id.replace("-", " ").title()
    category = body.case_category or ""

    system = (
        f"You are a standardized patient with this condition: {title} ({category}). "
        f"Your reported symptoms include: {symptoms_str}. "
        "You are being interviewed by a medical student. "
        "Answer only as this patient would: first person, 2–4 sentences, no medical jargon. "
        "Stay in character and be concise."
    )
    user = body.student_question.strip()

    text = await _ollama_chat(system, user)
    if not text:
        text = _fallback_reply(body.case_id)

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
