import React from 'react';
import { X, BookOpen, ClipboardCheck } from 'lucide-react';

function SessionTypeSelect({ onSelect, onClose }) {
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div className="relative w-full max-w-md mx-4 bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                    <h2 className="text-xl font-bold text-foreground">Choose Session Type</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select how you want to practice today.
                    </p>
                </div>

                {/* Options */}
                <div className="px-6 pb-6 space-y-3">
                    {/* Training Mode */}
                    <button
                        onClick={() => onSelect('training')}
                        className="w-full flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all group text-left"
                    >
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                Training Mode
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Practice freely with any case.
                            </p>
                        </div>
                    </button>

                    {/* Exam Mode */}
                    <button
                        onClick={() => onSelect('exam')}
                        className="w-full flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all group text-left"
                    >
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                            <ClipboardCheck size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                Exam Mode
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Start your assigned exam (case is pre-assigned).
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SessionTypeSelect;
