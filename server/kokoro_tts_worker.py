"""
Kokoro TTS worker — run with Python 3.10–3.12 (not 3.13+).
Reads JSON from stdin: {"text": "...", "gender": "female"|"male"}
Writes WAV bytes to stdout.
"""
import io
import json
import re
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline


def main() -> None:
    req = json.loads(sys.stdin.read())
    text = (req.get("text") or "").strip()
    gender = (req.get("gender") or "female").strip().lower()
    if not text:
        sys.exit(1)
    voice = "am_adam" if gender == "male" else "af_heart"
    clean = re.sub(r"\*[^*]+\*", "", text).strip()
    pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    chunks = []
    for _, _, audio in pipe(clean, voice=voice, speed=1.0):
        chunks.append(audio)
    if not chunks:
        sys.exit(2)
    combined = np.concatenate(chunks)
    buf = io.BytesIO()
    sf.write(buf, combined, 24000, format="WAV")
    sys.stdout.buffer.write(buf.getvalue())


if __name__ == "__main__":
    main()
