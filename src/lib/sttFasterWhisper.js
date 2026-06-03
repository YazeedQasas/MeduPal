/**
 * Record microphone → POST /stt (Groq Whisper) → transcript text.
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

let _sharedAudioContext = null;

/** Call on mic button click (user gesture) before any await. */
export function primeAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!_sharedAudioContext || _sharedAudioContext.state === 'closed') {
    _sharedAudioContext = new Ctx();
  }
  if (_sharedAudioContext.state === 'suspended') {
    void _sharedAudioContext.resume();
  }
  return _sharedAudioContext;
}

export function rmsToLevelPercent(rms) {
  if (!rms || rms < 0.1) return 0;
  return Math.min(100, Math.round((rms / 8) * 100));
}

async function openMicStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone not supported in this browser. Use Chrome or Edge on localhost.');
  }

  const tryGet = async (constraints) => {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = stream.getAudioTracks()[0];
    if (!track) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('No microphone track from browser.');
    }
    track.enabled = true;
    return { stream, deviceLabel: track.label || 'Microphone', track };
  };

  try {
    return await tryGet({ audio: true });
  } catch (err) {
    if (err?.name === 'NotAllowedError') {
      throw new Error('Microphone blocked. Click the lock icon in the address bar → Allow microphone.');
    }
    if (err?.name === 'NotFoundError') {
      throw new Error('No microphone found. Plug in a mic or enable one in Windows Sound settings.');
    }
    throw err;
  }
}

/**
 * Manual stop only (click mic again). No silence auto-stop — more reliable on Windows.
 * @param {((level: number, meta?: object) => void) | null} onLevel
 */
function createRecorder(onLevel) {
  let mediaRecorder = null;
  let stream = null;
  let levelTimer = null;
  const chunks = [];
  let resolveBlob = null;
  let blobResolved = false;
  let mimeType = 'audio/webm';
  let deviceLabel = 'Microphone';
  const blobPromise = new Promise((resolve) => {
    resolveBlob = resolve;
  });

  const finishBlob = () => {
    if (blobResolved) return;
    blobResolved = true;
    resolveBlob(new Blob(chunks, { type: mimeType }));
  };

  const stopTracks = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  const start = async () => {
    primeAudioContext();

    const opened = await openMicStream();
    stream = opened.stream;
    deviceLabel = opened.deviceLabel;
    const track = opened.track;

    if (track.readyState === 'ended') {
      stopTracks();
      throw new Error('Microphone ended immediately. Try another input device in Windows Sound settings.');
    }

    const ctx = _sharedAudioContext || primeAudioContext();
    if (ctx?.state === 'suspended') {
      await ctx.resume();
    }

    mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
    } catch {
      mediaRecorder = new MediaRecorder(stream);
      mimeType = mediaRecorder.mimeType || 'audio/webm';
    }

    chunks.length = 0;
    blobResolved = false;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      if (levelTimer) {
        clearInterval(levelTimer);
        levelTimer = null;
      }
      stopTracks();
      finishBlob();
    };

    mediaRecorder.start(250);

    if (!onLevel || !ctx) return;

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.2;
    const muteGain = ctx.createGain();
    muteGain.gain.value = 0;
    source.connect(analyser);
    analyser.connect(muteGain);
    muteGain.connect(ctx.destination);

    const floatBuf = new Float32Array(analyser.fftSize);
    const getRms = () => {
      analyser.getFloatTimeDomainData(floatBuf);
      let sum = 0;
      for (let i = 0; i < floatBuf.length; i++) sum += floatBuf[i] * floatBuf[i];
      return Math.sqrt(sum / floatBuf.length) * 100;
    };

    levelTimer = setInterval(() => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        clearInterval(levelTimer);
        levelTimer = null;
        return;
      }
      const rms = getRms();
      onLevel(rmsToLevelPercent(rms), { rms, deviceLabel });
    }, 80);
  };

  const stop = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      try {
        mediaRecorder.requestData();
      } catch {
        /* ignore */
      }
      mediaRecorder.stop();
    } else {
      if (levelTimer) clearInterval(levelTimer);
      stopTracks();
      finishBlob();
    }
    return blobPromise;
  };

  return { start, stop, get stream() { return stream; } };
}

export function recordAudioForStt(onLevel) {
  const rec = createRecorder(onLevel ?? null);
  return {
    start: () => rec.start(),
    stop: rec.stop,
    get stream() { return rec.stream; },
  };
}

const MIN_BLOB_BYTES = 800;

export async function sendAudioToSttApi(audioBlob) {
  console.log('[STT] blob size:', audioBlob.size, 'bytes | type:', audioBlob.type);
  if (!audioBlob?.size || audioBlob.size < MIN_BLOB_BYTES) {
    throw new Error('Recording too short. Click the mic, speak for 2–3 seconds, then click again to stop.');
  }

  const base = getSttApiUrl();
  if (!base) throw new Error('VITE_STT_API_URL missing in .env.local (use http://localhost:8000)');

  const url = `${base.replace(/\/+$/, '')}/stt`;
  const formData = new FormData();
  const ext = audioBlob.type.includes('webm') ? '.webm' : '.mp4';
  formData.append('file', audioBlob, `audio${ext}`);

  let res;
  try {
    res = await fetch(url, { method: 'POST', body: formData });
  } catch (err) {
    throw new Error(`Cannot reach AI server at ${base}. Start: cd server && .\\run-dev.ps1 — ${err?.message || err}`);
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`STT failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const text = data?.text ? String(data.text).trim() : '';
  console.log('[STT] transcript:', text || '(empty)');
  return { text };
}
