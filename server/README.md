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

## Frontend

Set the API base URL so the app uses this STT:

- In the project root, add to `.env`: `VITE_STT_API_URL=http://localhost:8000`
- Restart the Vite dev server.

Then open the practice History Taking page (e.g. `/practice-history`). When you click the mic, the app records in the browser and sends the audio to this server for transcription.

## Optional env (server)

- `WHISPER_MODEL` — default `base` (options: `tiny`, `base`, `small`, `medium`, `large`; smaller = faster, larger = more accurate).
- `WHISPER_DEVICE` — `cpu` (default) or `cuda` (if you have a GPU and PyTorch with CUDA).
