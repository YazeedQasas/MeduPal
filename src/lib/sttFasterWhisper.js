/**
 * Record microphone audio in the browser and send to Faster-Whisper STT API.
 * Uses MediaRecorder (Web API) to capture audio, then POSTs to VITE_STT_API_URL.
 */

const STT_API_URL = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_STT_API_URL || '') : '';
const PATIENT_REPLY_API_URL = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_PATIENT_REPLY_URL || '') : '';

/**
 * Check if Faster-Whisper STT is configured (env has STT API URL).
 * @returns {boolean}
 */
export function isFasterWhisperSttEnabled() {
  return Boolean(STT_API_URL && STT_API_URL.trim());
}

/**
 * Get the STT API base URL (no trailing slash).
 * @returns {string}
 */
export function getSttApiUrl() {
  return (STT_API_URL || '').replace(/\/+$/, '');
}

/**
 * Get the base URL for the patient-reply (Ollama/Llama) API.
 * Uses VITE_PATIENT_REPLY_URL if set, otherwise VITE_STT_API_URL (same server).
 * @returns {string}
 */
export function getPatientReplyApiUrl() {
  const url = (PATIENT_REPLY_API_URL || STT_API_URL || '').trim().replace(/\/+$/, '');
  return url;
}

/**
 * Create a MediaRecorder that records to a Blob. Call start() then later
 * stop() and resolve with the blob via the returned promise.
 * @returns {{ start: () => void, stop: () => Promise<Blob>, stream: MediaStream }}
 */
function createRecorder(onAutoStop) {
  let mediaRecorder = null;
  let stream = null;
  let audioContext = null;
  let silenceIntervalId = null;
  const chunks = [];
  let resolveBlob = null;
  const blobPromise = new Promise((resolve) => {
    resolveBlob = resolve;
  });

  const start = async () => {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
    mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
    chunks.length = 0;
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (silenceIntervalId) { clearInterval(silenceIntervalId); silenceIntervalId = null; }
      if (audioContext) { audioContext.close(); audioContext = null; }
      const blob = new Blob(chunks, { type: mimeType });
      resolveBlob(blob);
    };
    mediaRecorder.start(100);

    // Silence detection: auto-stop after 1.5s of silence once speech has started.
    // Uses voice-band energy (300–3000 Hz) to ignore broadband static/noise,
    // and calibrates thresholds from the first 600ms of ambient sound.
    if (onAutoStop) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.resume().catch(() => {});
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        // Voice frequency band: 300–3000 Hz
        const binHz = audioContext.sampleRate / analyser.fftSize;
        const voiceLow = Math.floor(300 / binHz);
        const voiceHigh = Math.ceil(3000 / binHz);

        const getVoiceRms = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = voiceLow; i < voiceHigh; i++) sum += dataArray[i] * dataArray[i];
          return Math.sqrt(sum / (voiceHigh - voiceLow));
        };

        const SILENCE_MS = 1500;
        const CALIBRATION_MS = 600;
        const calibrationStart = Date.now();
        let calibCount = 0, calibSum = 0, calibPeak = 0;
        let speechThreshold = null;
        let silenceThreshold = null;
        let speechDetected = false;
        let silenceStart = null;
        let fired = false;

        silenceIntervalId = setInterval(() => {
          if (!mediaRecorder || mediaRecorder.state === 'inactive' || fired) {
            clearInterval(silenceIntervalId);
            silenceIntervalId = null;
            return;
          }

          const rms = getVoiceRms();

          // Calibration phase: track running sum/peak instead of accumulating an array
          if (speechThreshold === null) {
            calibCount++;
            calibSum += rms;
            if (rms > calibPeak) calibPeak = rms;
            if (Date.now() - calibrationStart >= CALIBRATION_MS) {
              const avg = calibSum / calibCount;
              const noiseFloor = Math.max(avg * 1.2, calibPeak);
              speechThreshold = noiseFloor * 3;
              silenceThreshold = noiseFloor * 1.5;
            }
            return;
          }

          if (!speechDetected) {
            if (rms > speechThreshold) speechDetected = true;
          } else {
            if (rms < silenceThreshold) {
              if (!silenceStart) silenceStart = Date.now();
              else if (Date.now() - silenceStart >= SILENCE_MS) {
                fired = true;
                clearInterval(silenceIntervalId);
                silenceIntervalId = null;
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
    }
  };

  const stop = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    return blobPromise;
  };

  return { start, stop, get stream() { return stream; } };
}

/**
 * Record audio from the microphone and return the recorded Blob when stopped.
 * @returns {{ start: () => Promise<void>, stop: () => Promise<Blob> }}
 */
export function recordAudioForStt(onAutoStop) {
  const rec = createRecorder(onAutoStop);
  return {
    start: rec.start,
    stop: rec.stop,
  };
}

/**
 * Send an audio Blob to the Faster-Whisper STT API and return the transcript.
 * @param {Blob} audioBlob
 * @returns {Promise<{ text: string }>}
 */
export async function sendAudioToSttApi(audioBlob) {
  const base = getSttApiUrl();
  if (!base) {
    throw new Error('VITE_STT_API_URL is not set');
  }
  const url = base.replace(/\/+$/, '') + '/stt';
  const formData = new FormData();
  const ext = audioBlob.type.includes('webm') ? '.webm' : '.mp4';
  formData.append('file', audioBlob, `audio${ext}`);

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {},
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`STT failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return { text: (data && data.text) ? String(data.text).trim() : '' };
}
