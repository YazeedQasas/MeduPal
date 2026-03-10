import React from 'react';
import { ChevronRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

const STEPS = [
  { id: 'selection', label: 'AI Case Selection' },
  { id: 'history', label: 'History Taking' },
  { id: 'physical', label: 'Physical Examination' },
  { id: 'evaluation', label: 'Evaluation' },
];

const INSTRUCTIONS = [
  'Speak clearly when interacting with the AI patient',
  'Follow the OSCE station structure',
  'Observe patient vitals',
  'Manage your time carefully',
];

export function SessionWelcome({ sessionType = 'practice', setActiveTab, onStart }) {
  const handleStartSession = () => {
    if (onStart) {
      onStart();
    } else if (sessionType === 'practice') {
      setActiveTab?.('session-practice');
    } else {
      setActiveTab?.('session-exam');
    }
  };

  const handleBack = () => {
    setActiveTab?.('student-onboarding');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Back link */}
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
        Welcome to your MeduPal Clinical Session
      </h1>

      {/* Instructions box */}
      <div className="rounded-2xl border border-white/10 bg-card p-6 mb-10">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Instructions
        </h2>
        <ul className="space-y-3">
          {INSTRUCTIONS.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Progress stepper */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Session Flow
        </h2>
        <div className="flex items-center gap-1 sm:gap-2">
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 mb-2',
                    'bg-white/5 border border-white/10 text-muted-foreground',
                    idx === 0 && 'border-primary/50 bg-primary/10 text-primary'
                  )}
                >
                  <span className="text-xs font-semibold">{idx + 1}</span>
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-center text-muted-foreground leading-tight">
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-shrink-0 pt-4 pb-0 self-start hidden sm:flex">
                  <ChevronRight size={14} className="text-muted-foreground/40" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        type="button"
        onClick={handleStartSession}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl',
          'text-base font-semibold bg-primary text-primary-foreground',
          'hover:bg-primary/90 transition-colors',
          'shadow-lg shadow-primary/20'
        )}
      >
        Start Session
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
