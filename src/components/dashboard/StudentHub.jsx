import React, { useState } from 'react';
import { Stethoscope, FileCheck, ChevronRight, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import StudentPracticeFlow from './StudentPracticeFlow';
import AssignedExamStart from './AssignedExamStart';

const MOCK_HAS_UPCOMING_EXAM = true;
const MOCK_UPCOMING_EXAM = {
  date: 'Mar 15, 2025',
  time: '10:00 AM',
  station: 'Station 3 – Respiratory',
  caseName: 'Community Acquired Pneumonia',
};

export function StudentHub({ setActiveTab }) {
  const { has_hardware, can_exam } = useAuth();
  const [showPractice, setShowPractice] = useState(false);
  const [showExam, setShowExam] = useState(false);

  if (showPractice) {
    return <StudentPracticeFlow onExit={() => setShowPractice(false)} />;
  }

  if (showExam) {
    return (
      <AssignedExamStart
        onBack={() => setShowExam(false)}
        onStart={(examInfo) => {
          setShowExam(false);
          setActiveTab?.('sessions');
        }}
      />
    );
  }

  const showAnyCard = has_hardware || can_exam;

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Capabilities banner */}
      <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-card/60 border border-white/5">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Hardware:</span>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              has_hardware
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-muted/50 text-muted-foreground border border-white/5'
            )}
          >
            {has_hardware ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FileCheck size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Exam Access:</span>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              can_exam
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-muted/50 text-muted-foreground border border-white/5'
            )}
          >
            {can_exam ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {!showAnyCard ? (
        <div className="rounded-2xl border border-white/10 bg-card/80 p-8 text-center">
          <p className="text-muted-foreground text-sm">
            You don't have practice or exam access yet. Enable capabilities in your profile settings.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab?.('profile')}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Open Profile Settings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Practice with Manikin card */}
          {has_hardware && (
            <div className="rounded-2xl border border-white/10 bg-card overflow-hidden hover:border-primary/30 transition-colors">
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Stethoscope size={24} className="text-primary" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Hardware Enabled
                  </span>
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">Practice with Manikin</h2>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  Run clinical simulations and practice history taking with AI-powered patient interaction.
                </p>
                <div className="space-y-1 text-xs text-muted-foreground mb-4">
                  <p>Last session: —</p>
                  <p>Total practice: —</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPractice(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Start Practice
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Exams card */}
          {can_exam && (
            <div className="rounded-2xl border border-white/10 bg-card overflow-hidden hover:border-primary/30 transition-colors">
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <FileCheck size={24} className="text-amber-400" />
                  </div>
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">Exams</h2>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {MOCK_HAS_UPCOMING_EXAM
                    ? 'You have an upcoming OSCE exam.'
                    : 'No upcoming exams scheduled.'}
                </p>
                {MOCK_HAS_UPCOMING_EXAM ? (
                  <div className="p-3 rounded-xl bg-muted/30 border border-white/5 mb-4">
                    <p className="text-xs text-muted-foreground">
                      {MOCK_UPCOMING_EXAM.date} at {MOCK_UPCOMING_EXAM.time}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {MOCK_UPCOMING_EXAM.station}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {MOCK_UPCOMING_EXAM.caseName}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-4 italic">No upcoming exams</p>
                )}
                <button
                  type="button"
                  onClick={() => (MOCK_HAS_UPCOMING_EXAM ? setShowExam(true) : setActiveTab?.('sessions'))}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
                    MOCK_HAS_UPCOMING_EXAM
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                  )}
                  disabled={!MOCK_HAS_UPCOMING_EXAM}
                >
                  Start Exam
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
