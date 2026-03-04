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
function createRecorder() {
  let mediaRecorder = null;
  let stream = null;
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
      const blob = new Blob(chunks, { type: mimeType });
      resolveBlob(blob);
    };
    mediaRecorder.start(100);
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
export function recordAudioForStt() {
  const rec = createRecorder();
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
