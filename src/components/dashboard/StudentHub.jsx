import React, { useState, useEffect } from 'react';
import { Stethoscope, ChevronRight, FileCheck, Lightbulb, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import AssignedExamStart from './AssignedExamStart';

const MOCK_PROGRESS = { sessionsCompleted: 12, lastScore: 85 };
const TIPS = [
  'Always introduce yourself to the patient and obtain consent before any physical examination.',
  'Use OPQRST to structure pain history: Onset, Provocation, Quality, Region, Severity, Timing.',
  'Check for red flags: chest pain, shortness of breath, altered mental status — these need urgent attention.',
  'During auscultation, compare both sides and note any asymmetry in breath or heart sounds.',
  'Practice active listening: let the patient speak without interruption for at least 60 seconds.',
];

export function StudentHub({ setActiveTab }) {
  const { has_hardware, can_exam, full_name } = useAuth();
  const [showExam, setShowExam] = useState(false);
  const tipIndex = Math.floor(Date.now() / 86400000) % TIPS.length;


  if (showExam) {
    return (
      <AssignedExamStart
        onBack={() => setShowExam(false)}
        onStart={() => {
          setShowExam(false);
          setActiveTab?.('student-hub');
        }}
      />
    );
  }

  const showAnyAction = has_hardware || can_exam;
  const displayName = full_name || 'Student';

  const [notes, setNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const NOTES_KEY = 'medupal-student-notes';

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTES_KEY);
      if (stored) setNotes(stored);
    } catch (_) {}
  }, []);

  const saveNotes = (value) => {
    setNotes(value);
    try {
      localStorage.setItem(NOTES_KEY, value);
    } catch (_) {}
  };

  const notesPreview = notes.slice(0, 80) + (notes.length > 80 ? '…' : '');

  return (
    <div className="max-w-[960px] mx-auto space-y-4">
      {/* Header with Tip pill */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {displayName}</h1>
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-muted-foreground bg-muted/40 border border-white/5 w-fit max-w-full sm:max-w-sm"
          title={TIPS[tipIndex]}
        >
          <Lightbulb size={12} className="text-amber-500/80 shrink-0" />
          <span className="truncate">{TIPS[tipIndex].slice(0, 60)}{TIPS[tipIndex].length > 60 ? '…' : ''}</span>
        </span>
      </div>

      {/* Settings fallback when no actions */}
      {!showAnyAction && (
        <div className="rounded-xl border border-white/10 bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm">Enable practice or exam access in Settings to get started.</p>
          <button
            type="button"
            onClick={() => setActiveTab?.('student-settings')}
            className="mt-3 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Open Settings
          </button>
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Row 1 left: Start Practice */}
        <div className="rounded-xl border border-white/10 bg-card p-7 flex flex-col min-h-[200px]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <Stethoscope size={28} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Start Practice</h2>
              <p className="text-sm text-muted-foreground mt-0.5">AI case, history taking &amp; physical exam</p>
            </div>
          </div>
          {can_exam && (
            <div className="mt-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <FileCheck size={16} className="text-amber-400" />
              </div>
              <button
                type="button"
                onClick={() => setShowExam(true)}
                className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                Start assigned exam
              </button>
            </div>
          )}
          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab?.('student-practice');
                window.history.pushState(null, '', '/practice');
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Start Practice
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Row 1 right: Clinical Workspace */}
        <div className="rounded-xl border border-white/10 bg-card p-7 flex flex-col min-h-[200px]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-slate-500/15 flex items-center justify-center shrink-0">
              <FileText size={28} className="text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Clinical Workspace</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Quick notes for your sessions</p>
            </div>
          </div>
          <textarea
            readOnly
            value={notesPreview || 'No notes yet.'}
            className="flex-1 min-h-[72px] w-full rounded-lg border border-white/5 bg-black/20 px-3 py-2.5 text-sm text-muted-foreground resize-none focus:outline-none"
            rows={3}
          />
          <button
            type="button"
            onClick={() => setShowNotesModal(true)}
            className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium border border-white/10 bg-white/5 text-foreground hover:bg-white/10 transition-colors"
          >
            Open Notes
          </button>
        </div>

        {/* Row 2 left: Progress Summary */}
        <div className="rounded-xl border border-white/10 bg-card p-7 min-h-[180px]">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Progress Summary</h2>
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(217 90% 60%)"
                  strokeWidth="2"
                  strokeDasharray={`${MOCK_PROGRESS.lastScore}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-foreground">{MOCK_PROGRESS.lastScore}%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Sessions completed</p>
              <p className="text-2xl font-bold text-foreground">{MOCK_PROGRESS.sessionsCompleted}</p>
              <button
                type="button"
                onClick={() => setActiveTab?.('student-progress')}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View details →
              </button>
            </div>
          </div>
        </div>

        {/* Row 2 right: Hardware status */}
        <div className="rounded-xl border border-white/10 bg-card p-7 min-h-[180px]">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Status</h2>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                has_hardware
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'bg-muted/50 text-muted-foreground border border-white/5'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              {has_hardware ? 'Hardware Connected' : 'Hardware Not Connected'}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                can_exam
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-muted/50 text-muted-foreground border border-white/5'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              {can_exam ? 'Exam Assigned' : 'Exam Not Assigned'}
            </span>
          </div>
        </div>
      </div>

      {/* Notes modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowNotesModal(false)}>
          <div
            className="w-full max-w-lg rounded-xl border border-white/10 bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-3">Clinical Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => saveNotes(e.target.value)}
              className="w-full min-h-[200px] rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="Write your clinical notes here..."
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-white/10 text-foreground hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
