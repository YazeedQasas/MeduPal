import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Stethoscope,
  RotateCcw,
  Bot,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  getPatientReplyApiUrl,
  isFasterWhisperSttEnabled,
  primeAudioContext,
  recordAudioForStt,
  sendAudioToSttApi,
} from '../../lib/sttFasterWhisper';
import { sendPhysicalExamChatMessage } from '../../lib/physicalExamChat';

const P = {
  text: '#f4f4f5',
  muted: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.09)',
  accent: '#6ee7b7',
};

/** Instructor voice — fixed male for all cases (not the patient persona). */
const INSTRUCTOR_TTS_VOICE = 'male';

/**
 * OSCE exam instructor for the Physical Examination step (Groq/Ollama).
 * Conversational examiner — acknowledges steps and evaluates findings without revealing answers.
 */
export function PhysicalExamChat({
  caseId = '',
  caseTitle = '',
  caseCategory = '',
  symptoms = [],
  chiefComplaint = '',
  patientId = '',
  patientName = '',
  onConversationUpdate,
  className,
}) {
  const [messages, setMessages] = useState([
    {
      role: 'system',
      content:
        'State exam actions and report your own findings. The instructor will not answer symptom or diagnosis questions — examine the patient yourself.',
      ts: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sttReviewReady, setSttReviewReady] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [currentRegion, setCurrentRegion] = useState(null);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fwRecordingRef = useRef(null);
  const micLevelBarRef = useRef(null);
  const micLevelLabelRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    onConversationUpdate?.(messages);
  }, [messages, onConversationUpdate]);

  const fallbackSpeak = useCallback((text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSpeaking(false);
      return;
    }
    const clean = text.replace(/\s+/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.92;
    utterance.pitch = 0.85;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const en = voices.filter((v) => v.lang.startsWith('en'));
    const MALE_NAMES = /\b(guy|davis|mark|david|ryan|eric|brandon|christopher|jacob|james|tony|richard|george|reed|steffan|adam|liam|noah|oliver)\b/i;
    const preferred =
      en.find((v) => MALE_NAMES.test(v.name)) ||
      en.find((v) => /(natural|neural|online)/i.test(v.name)) ||
      en.find((v) => v.lang === 'en-US') ||
      en[0] ||
      voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const playTTS = useCallback((text) => {
    const apiBase = getPatientReplyApiUrl();
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    if (!apiBase) {
      fallbackSpeak(clean);
      return;
    }
    const url = `${apiBase}/tts?text=${encodeURIComponent(clean)}&voice=${INSTRUCTOR_TTS_VOICE}`;
    const audio = new Audio(url);
    setIsSpeaking(true);
    audio.onended = () => setIsSpeaking(false);
    audio.onerror = () => {
      setIsSpeaking(false);
      fallbackSpeak(clean);
    };
    audio.play().catch(() => {
      setIsSpeaking(false);
      fallbackSpeak(clean);
    });
  }, [fallbackSpeak]);

  const handleSendMessage = useCallback(async (textOverride) => {
    const raw = typeof textOverride === 'string' ? textOverride : inputValue;
    const transcript = raw.trim();
    if (!transcript || isTyping) return;

    setSttReviewReady(false);
    setLastTranscript(transcript);

    const studentMessage = { role: 'student', content: transcript, ts: Date.now() };
    setMessages((prev) => [...prev, studentMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const historyForApi = messages
        .filter((m) => m.role === 'student' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : m.role,
          content: m.content,
        }));

      const { reply, currentRegion: nextRegion } = await sendPhysicalExamChatMessage({
        caseId,
        caseTitle,
        caseCategory,
        patientName,
        message: transcript,
        currentRegion,
        conversationHistory: historyForApi,
      });
      setCurrentRegion(nextRegion);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, ts: Date.now() },
      ]);
      if (voiceEnabled) {
        window.speechSynthesis?.cancel();
        playTTS(reply);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'alert',
          content: `Exam assistant unavailable: ${err?.message || err}. Start the Python server on port 8000.`,
          ts: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [
    inputValue,
    isTyping,
    messages,
    caseId,
    caseTitle,
    caseCategory,
    patientName,
    currentRegion,
    voiceEnabled,
    playTTS,
  ]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const stopMicLevelMonitor = useCallback(() => {
    if (micLevelBarRef.current) micLevelBarRef.current.style.width = '0%';
    if (micLevelLabelRef.current) micLevelLabelRef.current.textContent = '';
  }, []);

  const applySttTranscript = useCallback(
    (text, { autoSend = false } = {}) => {
      const transcript = typeof text === 'string' ? text.trim() : '';
      setInputValue(transcript);
      if (!transcript) {
        setSttReviewReady(false);
        setMessages((prev) => [
          ...prev,
          {
            role: 'alert',
            content: 'No speech was detected. Please try again and speak clearly.',
            ts: Date.now(),
          },
        ]);
        return;
      }
      if (autoSend) {
        handleSendMessage(transcript);
      } else {
        setSttReviewReady(true);
      }
    },
    [handleSendMessage]
  );

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      if (fwRecordingRef.current) {
        const controller = fwRecordingRef.current;
        fwRecordingRef.current = null;
        setIsRecording(false);
        setIsTranscribing(true);
        controller
          .stop()
          .then((blob) => sendAudioToSttApi(blob))
          .then(({ text }) => applySttTranscript(text))
          .catch((err) => {
            setMessages((prev) => [
              ...prev,
              { role: 'alert', content: err?.message || 'Transcription failed.', ts: Date.now() },
            ]);
          })
          .finally(() => {
            setIsTranscribing(false);
            stopMicLevelMonitor();
          });
      }
      return;
    }

    if (!isFasterWhisperSttEnabled()) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'alert',
          content: 'Voice input requires VITE_STT_API_URL in .env.local (e.g. http://localhost:8000).',
          ts: Date.now(),
        },
      ]);
      return;
    }

    primeAudioContext();
    const onLevel = (pct, meta) => {
      if (micLevelBarRef.current) micLevelBarRef.current.style.width = `${pct}%`;
      if (micLevelLabelRef.current && meta?.deviceLabel) {
        micLevelLabelRef.current.textContent = meta.deviceLabel;
      }
    };
    const rec = recordAudioForStt(onLevel);
    fwRecordingRef.current = rec;
    setIsRecording(true);
    setSttReviewReady(false);
    rec.start().catch((err) => {
      fwRecordingRef.current = null;
      setIsRecording(false);
      stopMicLevelMonitor();
      setMessages((prev) => [
        ...prev,
        { role: 'alert', content: err?.message || 'Microphone error.', ts: Date.now() },
      ]);
    });
  }, [isRecording, applySttTranscript, stopMicLevelMonitor]);

  const handleReRecord = useCallback(() => {
    setInputValue('');
    setSttReviewReady(false);
    setLastTranscript('');
    toggleRecording();
  }, [toggleRecording]);

  useEffect(() => {
    if (!isTranscribing && sttReviewReady && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTranscribing, sttReviewReady]);

  const canSend = Boolean(inputValue.trim()) && !isTyping && !isRecording && !isTranscribing;

  return (
    <div
      className={cn('flex flex-col h-full min-h-0 rounded-2xl', className)}
      style={{ background: 'hsl(var(--card))', border: `1px solid ${P.border}` }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: P.accent, boxShadow: '0 0 6px rgba(110,231,183,0.8)' }}
          />
          <Stethoscope size={14} className="text-primary shrink-0" />
          <span className="text-sm font-semibold truncate" style={{ color: P.text }}>
            OSCE Exam Instructor
          </span>
        </div>
        <button
          type="button"
          onClick={() => setVoiceEnabled((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0"
          style={
            voiceEnabled
              ? { background: 'rgba(110,231,183,0.1)', color: P.accent, border: '1px solid rgba(110,231,183,0.2)' }
              : { background: 'rgba(255,255,255,0.04)', color: P.muted, border: `1px solid ${P.border}` }
          }
        >
          {voiceEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
          {voiceEnabled ? 'Voice On' : 'Voice Off'}
        </button>
      </div>

      {/* Messages — scrollable only */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              'flex gap-2.5',
              msg.role === 'student' && 'justify-end',
              msg.role === 'assistant' && 'justify-start',
              (msg.role === 'system' || msg.role === 'alert') && 'justify-center'
            )}
          >
            {msg.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)' }}
              >
                <Bot size={13} style={{ color: P.accent }} />
              </div>
            )}
            {msg.role === 'assistant' && (
              <div
                className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${P.border}`, color: '#e4e4e7' }}
              >
                {msg.content}
              </div>
            )}
            {msg.role === 'student' && (
              <div
                className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
                style={{
                  background: 'linear-gradient(135deg, rgba(110,231,183,0.2) 0%, rgba(59,130,246,0.15) 100%)',
                  border: '1px solid rgba(110,231,183,0.2)',
                  color: P.text,
                }}
              >
                {msg.content}
              </div>
            )}
            {msg.role === 'system' && (
              <div
                className="max-w-[92%] px-4 py-2.5 rounded-xl text-xs text-center leading-relaxed"
                style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: 'rgba(251,191,36,0.85)' }}
              >
                {msg.content}
              </div>
            )}
            {msg.role === 'alert' && (
              <div
                className="max-w-[92%] px-4 py-2 rounded-xl text-xs text-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2.5 justify-start">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)' }}
            >
              <Bot size={13} style={{ color: P.accent }} />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${P.border}` }}>
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'rgba(110,231,183,0.7)', animation: 'peTypingDot 1.2s ease-in-out infinite', animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area — always visible, never clipped */}
      <div className="flex-shrink-0 p-3" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
        {isRecording && (
          <div className="flex flex-col items-center gap-1.5 mb-2">
            <div
              className="flex items-center gap-2 py-1.5 px-4 rounded-full w-fit"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium" style={{ color: '#f87171' }}>Listening — speak now, then tap mic to stop</span>
            </div>
            <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                ref={micLevelBarRef}
                className="h-full rounded-full transition-all duration-75"
                style={{ width: '0%', background: 'rgba(110,231,183,0.7)' }}
              />
            </div>
            <span ref={micLevelLabelRef} className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
        )}
        {isTranscribing && (
          <div
            className="flex items-center justify-center gap-2 mb-2 py-1.5 px-4 rounded-full mx-auto w-fit"
            style={{ background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)' }}
          >
            <span className="text-xs font-medium" style={{ color: P.accent }}>Transcribing…</span>
          </div>
        )}
        {sttReviewReady && inputValue.trim() && !isRecording && !isTranscribing && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 mb-2 py-2 px-3 rounded-xl"
            style={{ background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.22)' }}
          >
            <span className="text-xs font-medium" style={{ color: P.accent }}>
              Review your transcription — edit if needed, then Send
            </span>
            <button
              type="button"
              onClick={handleReRecord}
              disabled={isTyping || isSpeaking}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
              style={{ color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)', border: `1px solid ${P.border}` }}
            >
              <RotateCcw size={11} />
              Re-record
            </button>
          </div>
        )}
        {lastTranscript && !isRecording && !sttReviewReady && (
          <div className="mb-2">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${P.border}` }}
            >
              <Mic size={9} style={{ color: P.muted }} />
              <span className="text-[10px] italic truncate max-w-[240px]" style={{ color: P.muted }}>
                &quot;{lastTranscript}&quot;
              </span>
            </div>
          </div>
        )}

        {/* Input card */}
        <div
          className="rounded-2xl overflow-hidden transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${
              isRecording
                ? 'rgba(239,68,68,0.3)'
                : sttReviewReady
                  ? 'rgba(110,231,183,0.35)'
                  : P.border
            }`,
          }}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={
              isRecording
                ? 'Listening…'
                : sttReviewReady
                  ? 'Edit your message before sending…'
                  : 'Type or tap the mic — e.g. "I want to check your chest"'
            }
            disabled={isTyping || isRecording || isTranscribing || isSpeaking}
            className="w-full bg-transparent px-4 pt-3.5 pb-2 text-sm focus:outline-none resize-none placeholder:text-white/20"
            style={{ color: P.text, minHeight: 52, maxHeight: 100, caretColor: P.accent, lineHeight: 1.5 }}
          />

          <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
            {/* Mic — prominent */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isTyping || isSpeaking || isTranscribing}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                style={
                  isRecording
                    ? { background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)', boxShadow: '0 0 16px rgba(239,68,68,0.2)' }
                    : isTranscribing
                      ? { color: P.accent, background: 'rgba(110,231,183,0.08)', border: `1px solid rgba(110,231,183,0.2)` }
                      : { color: P.accent, background: 'rgba(110,231,183,0.12)', border: '1px solid rgba(110,231,183,0.25)' }
                }
                title={isRecording ? 'Tap to stop and transcribe' : 'Tap to record your voice'}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                <span className="text-xs font-semibold">
                  {isRecording ? 'Stop' : isTranscribing ? '…' : 'Mic'}
                </span>
              </button>
              {!isRecording && !isTranscribing && (
                <span className="text-[10px] hidden sm:inline select-none" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Tap to speak
                </span>
              )}
            </div>

            {/* Send */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!canSend}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={
                canSend
                  ? {
                      background: 'linear-gradient(135deg, #6ee7b7, #3b82f6)',
                      color: '#0a0a0a',
                      boxShadow: sttReviewReady
                        ? '0 4px 18px rgba(110,231,183,0.4)'
                        : '0 4px 14px rgba(110,231,183,0.25)',
                    }
                  : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }
              }
            >
              <Send size={14} />
              Send
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes peTypingDot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

export default PhysicalExamChat;
