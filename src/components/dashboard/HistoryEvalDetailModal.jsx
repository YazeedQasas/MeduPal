import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ClipboardCheck,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { fetchHistoryEvaluation, displayHistoryPercent } from '../../lib/historyEvaluations';

/**
 * Read-only history evaluation breakdown for students (practice or released exam).
 */
export function HistoryEvalDetailModal({ sessionId, caseTitle, sessionLabel, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [row, setRow] = useState(null);
  const [showImprovements, setShowImprovements] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, err } = await fetchHistoryEvaluation(sessionId);
    if (err) {
      setError(err.message || 'Could not load score details');
      setLoading(false);
      return;
    }
    if (!data) {
      setError('No detailed checklist saved for this session.');
      setLoading(false);
      return;
    }
    setRow(data);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const sections = row?.instructor_sections?.length ? row.instructor_sections : row?.sections;
  const percent = displayHistoryPercent(row);
  const { covered, total } = row
    ? { covered: row.items_covered, total: row.total_items }
    : { covered: 0, total: 0 };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <ClipboardCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">History-taking score</h2>
              <p className="text-xs text-muted-foreground truncate">
                {caseTitle || sessionLabel || 'Practice session'}
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

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="flex flex-col items-center py-16 gap-3">
              <Loader2 className="animate-spin text-primary" size={28} />
              <p className="text-sm text-muted-foreground">Loading details…</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              {error}
            </div>
          )}

          {!loading && row && (
            <>
              <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                {percent != null && (
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 font-bold text-xl shrink-0',
                      percent >= 70
                        ? 'border-emerald-500 text-emerald-400'
                        : percent >= 50
                          ? 'border-amber-500 text-amber-400'
                          : 'border-red-500 text-red-400'
                    )}
                  >
                    {percent}
                    <span className="text-[10px] font-normal text-muted-foreground">%</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {covered}/{total} checklist items covered
                  </p>
                  {row.structure_followed != null && (
                    <p
                      className={cn(
                        'text-xs mt-1 flex items-center gap-1',
                        row.structure_followed ? 'text-emerald-400' : 'text-amber-400'
                      )}
                    >
                      {row.structure_followed ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <AlertTriangle size={12} />
                      )}
                      {row.structure_followed
                        ? 'Good consultation structure'
                        : 'Structure needs improvement'}
                    </p>
                  )}
                  {row.structure_notes && (
                    <p className="text-xs text-muted-foreground mt-1">{row.structure_notes}</p>
                  )}
                </div>
              </div>

              {sections?.map((section) => {
                const secCovered = section.items?.filter((i) => i.covered).length ?? 0;
                const secTotal = section.items?.length ?? 0;
                return (
                  <div
                    key={section.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          secCovered === secTotal
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : secCovered > 0
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-400'
                        )}
                      >
                        {secCovered}/{secTotal}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {section.items?.map((item) => (
                        <div
                          key={item.num}
                          className={cn(
                            'flex items-start gap-2.5 px-3 py-2 rounded-lg border text-sm',
                            item.covered
                              ? 'bg-emerald-500/8 border-emerald-500/20'
                              : 'bg-red-500/8 border-red-500/20'
                          )}
                        >
                          <span
                            className={cn(
                              'shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center text-[10px] font-bold',
                              item.covered ? 'bg-emerald-500 text-white' : 'bg-red-500/50 text-white'
                            )}
                          >
                            {item.covered ? '✓' : '✗'}
                          </span>
                          <span
                            className={cn(
                              'leading-snug',
                              item.covered ? 'text-foreground/80' : 'text-muted-foreground'
                            )}
                          >
                            <span className="text-muted-foreground/50 mr-1">{item.num}.</span>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {row.feedback && (
                <div className="rounded-xl border border-white/[0.08] p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Examiner feedback
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{row.feedback}</p>
                </div>
              )}

              {row.strengths?.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-xs font-semibold text-emerald-400 mb-2">Strengths</p>
                  <ul className="space-y-1">
                    {row.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-emerald-500 shrink-0">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {row.areas_for_improvement?.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowImprovements((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-amber-400 hover:bg-white/[0.03]"
                  >
                    Areas for improvement ({row.areas_for_improvement.length})
                    <ChevronRight
                      size={14}
                      className={cn('transition-transform', showImprovements && 'rotate-90')}
                    />
                  </button>
                  {showImprovements && (
                    <ul className="px-4 pb-4 space-y-1 border-t border-white/[0.06]">
                      {row.areas_for_improvement.map((a, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2 pt-2">
                          <span className="text-amber-500 shrink-0">•</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {row.instructor_notes && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold text-primary mb-1">Instructor notes</p>
                  <p className="text-sm text-muted-foreground">{row.instructor_notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-muted/50 text-foreground border border-white/10 hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default HistoryEvalDetailModal;
