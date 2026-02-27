import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, Stethoscope, CheckCircle2, ArrowLeft, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';

function SessionWorkspace({ session, onExit }) {
    const [currentPhase, setCurrentPhase] = useState('history');
    const [messages, setMessages] = useState([
        {
            role: 'system',
            content: 'You are now with the patient. Begin by introducing yourself and taking their history.'
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef(null);

    const isTraining = session?.type === 'training';
    const caseName = session?.caseName || 'Clinical Case';

    const phases = [
        { id: 'history', label: 'History Taking', icon: MessageCircle },
        { id: 'physical', label: 'Physical Examination', icon: Stethoscope }
    ];

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (!inputValue.trim() || isTyping) return;

        const studentMessage = { role: 'student', content: inputValue.trim() };
        setMessages(prev => [...prev, studentMessage]);
        setInputValue('');
        setIsTyping(true);

        setTimeout(() => {
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
            const randomResponse = patientResponses[Math.floor(Math.random() * patientResponses.length)];
            
            setMessages(prev => [...prev, { role: 'patient', content: randomResponse }]);
            setIsTyping(false);
        }, 500);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
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
                        {/* Chat Messages */}
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
                                        {msg.role === 'patient' && (
                                            <span className="text-xs text-muted-foreground font-medium block mb-1">Patient</span>
                                        )}
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-muted/50 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-md">
                                        <span className="text-xs text-muted-foreground font-medium block mb-1">Patient</span>
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

                        {/* Input Area */}
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ask the patient a question..."
                                    className="flex-1 bg-muted/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isTyping}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isTyping}
                                    className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
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
