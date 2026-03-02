import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, MessageCircle, Stethoscope, CheckCircle2, ArrowLeft, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';

const SpeechRecognitionAPI = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

function SessionWorkspace({ session, onExit }) {
    const [currentPhase, setCurrentPhase] = useState('history');
    const [messages, setMessages] = useState([
        {
            role: 'system',
            content: 'You are now with the patient. Speak aloud to take their history—hold the mic button and ask your questions. The patient will respond by voice.'
        }
    ]);
    const [isListening, setIsListening] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef(null);
    const recognitionRef = useRef(null);

    const isTraining = session?.type === 'training';
    const caseName = session?.caseName || 'Clinical Case';

    const phases = [
        { id: 'history', label: 'History Taking (Voice)', icon: MessageCircle },
        { id: 'physical', label: 'Physical Examination', icon: Stethoscope }
    ];

    const patientResponses = [
        "I feel chest pain when I breathe.",
        "The pain started about two days ago.",
        "It gets worse when I lie down.",
        "I haven't had any fever.",
        "I've been feeling a bit short of breath too.",
        "No, I haven't taken any medication for it.",
        "The pain is sharp, like a stabbing sensation.",
        "I'd say it's about a 6 out of 10."
    ];

    const speakPatientResponse = useCallback((text) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.95;
        u.pitch = 1;
        window.speechSynthesis.speak(u);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!SpeechRecognitionAPI) return;
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new Recognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = (e) => {
            const parts = [];
            for (let i = 0; i < e.results.length; i++) {
                if (e.results[i].isFinal && e.results[i][0]?.transcript) {
                    parts.push(e.results[i][0].transcript.trim());
                }
            }
            const transcript = parts.join(' ').trim();
            if (!transcript) return;
            setMessages(prev => [...prev, { role: 'student', content: transcript }]);
            setIsTyping(true);
            const randomResponse = patientResponses[Math.floor(Math.random() * patientResponses.length)];
            setMessages(prev => [...prev, { role: 'patient', content: randomResponse }]);
            speakPatientResponse(randomResponse);
            setIsTyping(false);
        };
        rec.onerror = () => setIsListening(false);
        recognitionRef.current = rec;
        return () => { rec.abort(); };
    }, [speakPatientResponse]);

    const handleMicPress = () => {
        if (!SpeechRecognitionAPI || isTyping) return;
        const rec = recognitionRef.current;
        if (!rec) return;
        if (isListening) {
            rec.stop();
            setIsListening(false);
        } else {
            rec.start();
            setIsListening(true);
        }
    };

    const handleMicRelease = () => {
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const handleFinishHistory = () => {
        setCurrentPhase('physical');
    };

    const handleBackToHistory = () => {
        setCurrentPhase('history');
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            <header className="bg-card border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                        isTraining 
                            ? "bg-blue-500/10 text-blue-500" 
                            : "bg-emerald-500/10 text-emerald-500"
                    )}>
                        {isTraining ? 'Training' : 'Exam'}
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">{caseName}</h1>
                        <p className="text-xs text-muted-foreground">Session in progress</p>
                    </div>
                </div>
                <button
                    onClick={onExit}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                    <LogOut size={16} />
                    Exit Session
                </button>
            </header>

            {/* Phase Stepper */}
            <div className="bg-card/50 border-b border-white/5 px-6 py-3">
                <div className="flex items-center gap-2 max-w-2xl mx-auto">
                    {phases.map((phase, index) => {
                        const isActive = currentPhase === phase.id;
                        const isCompleted = currentPhase === 'physical' && phase.id === 'history';
                        const isDisabled = phase.id === 'physical' && currentPhase === 'history';

                        return (
                            <React.Fragment key={phase.id}>
                                <div
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all flex-1 justify-center",
                                        isActive && "bg-primary/10 text-primary border border-primary/20",
                                        isCompleted && "bg-emerald-500/10 text-emerald-500",
                                        isDisabled && "text-muted-foreground opacity-50",
                                        !isActive && !isCompleted && !isDisabled && "text-muted-foreground"
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 size={18} />
                                    ) : (
                                        <phase.icon size={18} />
                                    )}
                                    <span className="text-sm font-medium">{phase.label}</span>
                                </div>
                                {index < phases.length - 1 && (
                                    <div className={cn(
                                        "w-8 h-0.5 rounded-full",
                                        isCompleted ? "bg-emerald-500" : "bg-white/10"
                                    )} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {currentPhase === 'history' && (
                    <div className="h-full flex flex-col max-w-3xl mx-auto p-6">
                        {/* Conversation transcript (voice conversation) */}
                        <p className="text-xs text-muted-foreground mb-2">Transcript of your voice conversation</p>
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "flex",
                                        msg.role === 'student' ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[80%] px-4 py-3 rounded-2xl text-sm",
                                            msg.role === 'student' && "bg-primary text-primary-foreground rounded-br-md",
                                            msg.role === 'patient' && "bg-muted/50 text-foreground border border-white/5 rounded-bl-md",
                                            msg.role === 'system' && "bg-amber-500/10 text-amber-500 border border-amber-500/20 text-center mx-auto rounded-xl"
                                        )}
                                    >
                                        {msg.role === 'student' && (
                                            <span className="text-xs opacity-80 font-medium block mb-1">You (spoken)</span>
                                        )}
                                        {msg.role === 'patient' && (
                                            <span className="text-xs text-muted-foreground font-medium block mb-1">Patient (voice)</span>
                                        )}
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-muted/50 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-md">
                                        <span className="text-xs text-muted-foreground font-medium block mb-1">Patient (speaking…)</span>
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Voice input area */}
                        <div className="space-y-3">
                            {SpeechRecognitionAPI ? (
                                <>
                                    <div className="flex flex-col items-center gap-3">
                                        <button
                                            type="button"
                                            onMouseDown={handleMicPress}
                                            onMouseUp={handleMicRelease}
                                            onMouseLeave={handleMicRelease}
                                            onTouchStart={(e) => { e.preventDefault(); handleMicPress(); }}
                                            onTouchEnd={(e) => { e.preventDefault(); handleMicRelease(); }}
                                            disabled={isTyping}
                                            className={cn(
                                                "w-20 h-20 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                                isListening
                                                    ? "bg-red-500/20 text-red-400 border-2 border-red-400/50 animate-pulse"
                                                    : "bg-primary/20 text-primary border-2 border-primary/40 hover:bg-primary/30"
                                            )}
                                            aria-label={isListening ? 'Release to send' : 'Hold to speak'}
                                        >
                                            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                                        </button>
                                        <p className="text-xs text-muted-foreground text-center">
                                            {isListening ? 'Speaking… release to send' : 'Hold to talk • Patient will respond by voice'}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="py-4 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm text-center">
                                    Voice input is not supported in this browser. Use Chrome, Edge, or Safari for voice history taking.
                                </div>
                            )}
                            <button
                                onClick={handleFinishHistory}
                                className="w-full py-3 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                            >
                                Finish History Taking →
                            </button>
                        </div>
                    </div>
                )}

                {currentPhase === 'physical' && (
                    <div className="h-full flex flex-col items-center justify-center p-6">
                        <div className="max-w-md w-full bg-card border border-white/5 rounded-2xl p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                                <Stethoscope size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-foreground mb-2">Physical Examination</h2>
                            <p className="text-muted-foreground text-sm mb-8">
                                Physical exam interaction will be implemented here.
                            </p>

                            <div className="space-y-3">
                                {isTraining && (
                                    <button
                                        onClick={handleBackToHistory}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium bg-muted/50 text-foreground border border-white/5 hover:bg-muted transition-colors"
                                    >
                                        <ArrowLeft size={16} />
                                        Back to History
                                    </button>
                                )}
                                <button
                                    onClick={onExit}
                                    className="w-full py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    Finish Session
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SessionWorkspace;
