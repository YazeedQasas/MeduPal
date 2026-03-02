"""
STT server: capture audio from browser (Web API) and transcribe with OpenAI Whisper.
Uses the system FFmpeg binary (no PyAV). Run: python -m uvicorn main:app --reload --port 8000
"""
import os
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware


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
