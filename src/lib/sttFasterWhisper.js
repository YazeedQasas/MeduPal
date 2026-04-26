/**
 * Record microphone audio in the browser and send to Faster-Whisper STT API.
 * Uses MediaRecorder (Web API) to capture audio, then POSTs to VITE_STT_API_URL.
 */

const STT_API_URL = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_STT_API_URL || '') : '';
const PATIENT_REPLY_API_URL = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_PATIENT_REPLY_URL || '') : '';

export function isFasterWhisperSttEnabled() {
  return Boolean(STT_API_URL && STT_API_URL.trim());
}

export function getSttApiUrl() {
  return (STT_API_URL || '').replace(/\/+$/, '');
}

export function getPatientReplyApiUrl() {
  return (PATIENT_REPLY_API_URL || STT_API_URL || '').trim().replace(/\/+$/, '');
}

/**
 * @param {(() => void) | null} onAutoStop  Called when silence is detected after speech.
 * @param {((level: number) => void) | null} onLevel  Called ~10×/sec with mic level 0–100.
 */
function createRecorder(onAutoStop, onLevel) {
  let mediaRecorder = null;
  let stream = null;
  let audioContext = null;
  let silenceTimer = null;
  const chunks = [];
  let resolveBlob = null;
  const blobPromise = new Promise((resolve) => { resolveBlob = resolve; });

  const start = async (existingStream) => {
    stream = existingStream || await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

    mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
    chunks.length = 0;
    mediaRecorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (silenceTimer) { clearInterval(silenceTimer); silenceTimer = null; }
      if (audioContext) { audioContext.close(); audioContext = null; }
      resolveBlob(new Blob(chunks, { type: mimeType }));
    };
    mediaRecorder.start(100);

    if (!onAutoStop && !onLevel) return;

    // --- Simple silence detection ---
    // 1. Calibrate ambient noise for 500ms
    // 2. Once speech starts (RMS > 3× ambient), watch for 1.5s of silence (RMS < 1.5× ambient)
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume().catch(() => {});
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const getRms = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        return Math.sqrt(sum / data.length);
      };

      const CALIBRATION_MS = 500;
      const SILENCE_MS = 700;
      const calibStart = Date.now();
      let calibSum = 0, calibCount = 0;
      let speechThreshold = null;
      let silenceThreshold = null;
      let speechDetected = false;
      let silenceStart = null;
      let fired = false;

      silenceTimer = setInterval(() => {
        if (fired || !mediaRecorder || mediaRecorder.state === 'inactive') {
          clearInterval(silenceTimer); silenceTimer = null; return;
        }

        const rms = getRms();
        if (onLevel) onLevel(Math.min(100, (rms / 80) * 100));

        // Phase 1: calibrate ambient noise
        if (speechThreshold === null) {
          calibSum += rms; calibCount++;
          if (Date.now() - calibStart >= CALIBRATION_MS) {
            const ambient = calibSum / calibCount;
            speechThreshold = Math.max(ambient * 3, 8);
            silenceThreshold = Math.max(ambient * 1.5, 5);
          }
          return;
        }

        // Phase 2: wait for speech, then detect silence
        if (!speechDetected) {
          if (rms > speechThreshold) speechDetected = true;
        } else {
          if (rms < silenceThreshold) {
            if (!silenceStart) silenceStart = Date.now();
            else if (Date.now() - silenceStart >= SILENCE_MS) {
              fired = true;
              clearInterval(silenceTimer); silenceTimer = null;
              onAutoStop();
            }
          } else {
            silenceStart = null;
          }
        }
      }, 100);
    } catch (e) {
      console.warn('[STT] Silence detection unavailable:', e);
    }
  };

  const stop = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    return blobPromise;
  };

  return { start, stop, get stream() { return stream; } };
}

export function recordAudioForStt(onAutoStop, onLevel) {
  const rec = createRecorder(onAutoStop ?? null, onLevel ?? null);
  return {
    start: (existingStream) => rec.start(existingStream),
    stop: rec.stop,
    get stream() { return rec.stream; },
  };
}

export async function sendAudioToSttApi(audioBlob) {
  console.log('[STT] blob size:', audioBlob.size, 'bytes | type:', audioBlob.type);
  const base = getSttApiUrl();
  if (!base) throw new Error('VITE_STT_API_URL is not set');
  const url = base.replace(/\/+$/, '') + '/stt';
  const formData = new FormData();
  const ext = audioBlob.type.includes('webm') ? '.webm' : '.mp4';
  formData.append('file', audioBlob, `audio${ext}`);

  const res = await fetch(url, { method: 'POST', body: formData, headers: {} });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`STT failed: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return { text: (data?.text) ? String(data.text).trim() : '' };
}
