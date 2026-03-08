# Medupal STT (OpenAI Whisper)

Browser audio is captured with the Web API (MediaRecorder) and sent to this server for transcription with [OpenAI Whisper](https://github.com/openai/whisper). This stack uses the **FFmpeg** executable (no PyAV), so it works on Windows without the `av` build issues.

**Requirements:** Python 3.8+ and **FFmpeg** on your PATH.

## Install FFmpeg (one-time)

- **Windows:** `choco install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org/download.html) and add the `bin` folder to PATH.
- **macOS:** `brew install ffmpeg`
- **Linux:** `apt install ffmpeg` / `dnf install ffmpeg`

## Setup

```bash
cd server
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows
# source .venv/bin/activate  # macOS/Linux
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Run

From the `server` folder with the venv activated:

```bash
python -m uvicorn main:app --reload --port 8000
```

(On Windows, use `python -m uvicorn` so the venv’s Python is used.)

- **POST /stt** — `multipart/form-data` with `file` (audio blob, e.g. webm from the browser). Returns `{ "text": "..." }`.
- **POST /patient-reply** — JSON body: `case_id`, `case_title`, `case_category`, `symptoms[]`, `student_question`, optional `conversation_history`. Uses Ollama (Llama 3) to generate a patient reply; falls back to a canned reply if Ollama is unavailable. Returns `{ "text": "..." }`.
- **POST /tts** — JSON body: `{ "text": "..." }`. Converts text to speech using OpenAI TTS (natural voice). Returns `audio/mpeg`. Used when `OPENAI_API_KEY` is set; otherwise the app uses browser TTS.

### Ollama (patient replies)

For AI-generated patient answers, run [Ollama](https://ollama.com) locally and pull a model:

```bash
ollama pull llama3.2
```

Keep Ollama running (default: `http://localhost:11434`). The app will use it when `VITE_STT_API_URL` is set. Optional env: `OLLAMA_BASE_URL`, `OLLAMA_MODEL` (default `llama3.2`), `OLLAMA_TIMEOUT` (seconds).

## Frontend

Set the API base URL so the app talks to this server:

- In the **project root**, create or edit `.env` or `.env.local` and add:
  - **Patient replies (Ollama):** `VITE_PATIENT_REPLY_URL=http://localhost:8000`
  - **STT (Whisper):** `VITE_STT_API_URL=http://localhost:8000`
  - You can set just one, or both to the same URL (`http://localhost:8000`).
- **Restart the Vite dev server** after changing env (e.g. stop `npm run dev` and start it again), or the app won’t see the new values.

Then open the practice History Taking page (e.g. `/practice-history`). The app will use this server for AI patient replies when `VITE_PATIENT_REPLY_URL` (or `VITE_STT_API_URL`) is set, and for voice transcription when `VITE_STT_API_URL` is set.

## Optional env (server)

- `WHISPER_MODEL` — default `base` (options: `tiny`, `base`, `small`, `medium`, `large`; smaller = faster, larger = more accurate).
- `WHISPER_DEVICE` — `cpu` (default) or `cuda` (if you have a GPU and PyTorch with CUDA).
- **Natural TTS (OpenAI):** set `OPENAI_API_KEY` so the manikin uses OpenAI’s natural voice instead of the browser’s. Optional: `TTS_VOICE` (default `nova`; options: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`), `TTS_MODEL` (default `tts-1-hd`). If the key is not set, the app falls back to browser speech.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `FFmpeg not found on PATH` | Install FFmpeg: `winget install ffmpeg` or `choco install ffmpeg`. Restart your terminal after installing. |
| `VITE_STT_API_URL is not set` | Add `VITE_STT_API_URL=http://localhost:8000` to `.env` or `.env.local` in the project root. Restart the Vite dev server. |
| `ModuleNotFoundError: No module named 'whisper'` | Run `pip install -r requirements.txt` from the `server` folder. |
| `Form data requires "python-multipart"` | Run `pip install python-multipart`. |
| Port 8000 in use | Use a different port: `uvicorn main:app --port 8001` and set `VITE_STT_API_URL=http://localhost:8001` in `.env`. |
