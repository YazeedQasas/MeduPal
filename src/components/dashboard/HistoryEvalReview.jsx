import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  Send,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import {
  fetchHistoryEvaluation,
  saveInstructorHistoryReview,
  releaseHistoryEvaluationToStudent,
  percentFromSections,
  countFromSections,
  historyEvalStatusLabel,
} from '../../lib/historyEvaluations';

function cloneSections(sections) {
  return (sections || []).map((s) => ({
    ...s,
    items: (s.items || []).map((i) => ({ ...i })),
  }));
}

export function HistoryEvalReview({ sessionId, studentName, caseTitle, onClose, onUpdated }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState(null);
  const [row, setRow] = useState(null);
  const [sections, setSections] = useState([]);
  const [percent, setPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [useManualPercent, setUseManualPercent] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchHistoryEvaluation(sessionId);
    if (err) {
      setError(err.message || 'Could not load evaluation');
      setLoading(false);
      return;
    }
    if (!data) {
      setError('No history evaluation saved for this session yet.');
      setLoading(false);
      return;
    }
    setRow(data);
    const baseSections = cloneSections(
      data.instructor_sections?.length ? data.instructor_sections : data.sections
    );
    setSections(baseSections);
    const p = data.instructor_percent ?? data.final_percent ?? data.ai_percent ?? 0;
    setPercent(p);
    setNotes(data.instructor_notes || '');
    setUseManualPercent(data.instructor_percent != null);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const derivedPercent = useMemo(() => percentFromSections(sections), [sections]);
  const displayPercent = useManualPercent ? percent : derivedPercent;
  const { covered, total } = useMemo(() => countFromSections(sections), [sections]);

  const toggleItem = (sectionId, itemNum) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              items: s.items.map((i) =>
                i.num === itemNum ? { ...i, covered: !i.covered } : i
              ),
            }
      )
    );
    setUseManualPercent(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await saveInstructorHistoryReview({
      sessionId,
      instructorPercent: displayPercent,
      instructorSections: sections,
      instructorNotes: notes.trim() || null,
      reviewerId: user?.id,
    });
    setSaving(false);
    if (err) {
      const msg = err.message || 'Save failed';
      setError(
        msg.includes('row-level security')
          ? `${msg} — run supabase_migration_history_evaluations_fix.sql in Supabase SQL editor.`
          : msg
      );
      return;
    }
    await load();
    onUpdated?.();
  };

  const handleRelease = async () => {
    if (!window.confirm('Send this history-taking score to the student? They will see it in their session history.')) {
      return;
    }
    setReleasing(true);
    setError(null);
    const { error: err } = await releaseHistoryEvaluationToStudent(sessionId);
    setReleasing(false);
    if (err) {
      setError(err.message || 'Release failed');
      return;
    }
    await load();
    onUpdated?.();
  };

  const statusLabel = historyEvalStatusLabel(row);
  const isReleased = row?.released_to_student;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <ClipboardCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">Review history score</h2>
              <p className="text-xs text-muted-foreground truncate">
                {studentName || 'Student'}
                {caseTitle ? ` · ${caseTitle}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="animate-spin text-primary" size={28} />
              <p className="text-sm text-muted-foreground">Loading evaluation…</p>
            </div>
          )}

          {!loading && error && !row && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 space-y-2">
              <p>{error}</p>
              <p className="text-xs text-amber-200/80">
                The student must complete history-taking (practice or exam digital flow) while signed in. If saves fail for everyone, run{' '}
                <code className="bg-black/20 px-1 rounded">supabase_migration_history_evaluations_fix.sql</code> in Supabase.
              </p>
            </div>
          )}

          {!loading && row && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={cn(
                    'flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 font-bold text-xl',
                    displayPercent >= 70
                      ? 'border-emerald-500 text-emerald-400'
                      : displayPercent >= 50
                        ? 'border-amber-500 text-amber-400'
                        : 'border-red-500 text-red-400'
                  )}
                >
                  {displayPercent}
                  <span className="text-[10px] font-normal text-muted-foreground">%</span>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-sm text-foreground">
                    {covered}/{total} checklist items
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI score: {row.ai_percent}% · {statusLabel}
                  </p>
                  {isReleased && (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Sent to student
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-foreground">Overall score override</label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useManualPercent}
                      onChange={(e) => {
                        setUseManualPercent(e.target.checked);
                        if (e.target.checked) setPercent(derivedPercent);
                      }}
                      className="rounded border-white/20"
                    />
                    Manual %
                  </label>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={useManualPercent ? percent : derivedPercent}
                  disabled={!useManualPercent}
                  onChange={(e) => {
                    setUseManualPercent(true);
                    setPercent(Number(e.target.value));
                  }}
                  className="w-full accent-primary disabled:opacity-60"
                />
                <p className="text-xs text-muted-foreground">
                  Toggle checklist items below to recalculate automatically, or enable manual % to set the final score directly.
                </p>
              </div>

              {sections.map((section) => {
                const secCovered = section.items.filter((i) => i.covered).length;
                const secTotal = section.items.length;
                return (
                  <div key={section.id} className="rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                      <span className="text-xs text-muted-foreground">
                        {secCovered}/{secTotal}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {section.items.map((item) => (
                        <button
                          key={item.num}
                          type="button"
                          disabled={isReleased}
                          onClick={() => toggleItem(section.id, item.num)}
                          className={cn(
                            'w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-left text-sm transition-colors',
                            item.covered
                              ? 'bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/15'
                              : 'bg-red-500/10 border-red-500/25 hover:bg-red-500/15',
                            isReleased && 'opacity-70 cursor-not-allowed'
                          )}
                        >
                          <span
                            className={cn(
                              'shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                              item.covered ? 'bg-emerald-500 text-white' : 'bg-red-500/60 text-white'
                            )}
                          >
                            {item.covered ? '✓' : '✗'}
                          </span>
                          <span className="text-foreground/90 leading-snug">
                            <span className="text-muted-foreground/50 mr-1">{item.num}.</span>
                            {item.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {row.feedback && (
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">AI feedback</p>
                  <p className="text-sm text-foreground/80">{row.feedback}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Instructor notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isReleased}
                  rows={3}
                  placeholder="Notes for your records or for the student after release…"
                  className="w-full bg-muted/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground resize-none disabled:opacity-60"
                />
              </div>

              {error && row && (
                <div className="flex items-start gap-2 text-sm text-amber-300">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!loading && row && (
          <div className="shrink-0 px-6 py-4 border-t border-white/10 flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted/50 text-foreground border border-white/10 hover:bg-muted"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || releasing || isReleased}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground border border-white/10 hover:bg-muted/80 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save changes
            </button>
            <button
              type="button"
              onClick={handleRelease}
              disabled={saving || releasing || isReleased}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {releasing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isReleased ? 'Already sent' : 'Send to student'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryEvalReview;
