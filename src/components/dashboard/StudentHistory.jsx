import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Calendar, Award, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import {
  pickHistoryEval,
  pickPhysicalEval,
  studentCanSeeHistoryScore,
  studentCanSeePhysicalScore,
  HISTORY_EVAL_TYPE,
  PHYSICAL_EVAL_TYPE,
} from '../../lib/historyEvaluations';
import { HistoryEvalDetailModal } from './HistoryEvalDetailModal';

const TABS = [
  { id: 'all', label: 'All Sessions' },
  { id: 'practice', label: 'Practice' },
  { id: 'exam', label: 'Exam' },
];

const TODAY_LABEL = new Date().toLocaleDateString([], {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const SUBTITLE_SUFFIX = {
  all: 'All completed sessions',
  practice: 'Practice sessions',
  exam: 'Exam sessions',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { dateStyle: 'long' });
}

function getSessionKind(row) {
  if (row?.session_type === 'exam') return 'exam';
  return row?.session_type || 'practice';
}

function formatSessionScore(score) {
  if (score == null) return null;
  const n = Number(score);
  if (Number.isNaN(n)) return null;
  if (n <= 10) return `${n.toFixed(1)}/10`;
  return `${Math.round(n)}%`;
}

export function StudentHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [detailSession, setDetailSession] = useState(null);

  const loadSessions = useCallback(async () => {
    if (!user?.id) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error: qErr } = await supabase
      .from('sessions')
      .select(`
        id, start_time, end_time, status, score, session_type,
        case:cases(title),
        history_eval:history_evaluations(
          evaluation_type, final_percent, ai_percent, released_to_student, review_status, items_covered, total_items
        )
      `)
      .eq('student_id', user.id)
      .eq('status', 'Completed')
      .order('start_time', { ascending: false });

    setSessions(qErr ? [] : data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filteredSessions = useMemo(() => {
    if (activeTab === 'all') return sessions;
    return sessions.filter((s) => getSessionKind(s) === activeTab);
  }, [sessions, activeTab]);

  const sessionLabel = filteredSessions.length === 1 ? 'session' : 'sessions';

  return (
    <div className="w-full space-y-6 pb-8">
      {detailSession && (
        <HistoryEvalDetailModal
          sessionId={detailSession.id}
          caseTitle={detailSession.title}
          evaluationType={detailSession.evaluationType || HISTORY_EVAL_TYPE}
          onClose={() => setDetailSession(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Session History</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {TODAY_LABEL} - {SUBTITLE_SUFFIX[activeTab]}
        </p>
        {activeTab !== 'exam' && (
          <p className="text-xs text-muted-foreground mt-1">
            Tap a practice session to view your checklist breakdown.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="flex items-center border-b border-white/[0.07]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-[#6ee7b7] text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground/80'
              )}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto pr-5 text-xs text-muted-foreground tabular-nums">
            {loading ? '…' : `${filteredSessions.length} ${sessionLabel}`}
          </span>
        </div>

        <div className="min-h-[280px] flex items-center justify-center px-6 py-12">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredSessions.length > 0 ? (
            <div className="w-full space-y-3 self-start py-2">
              {filteredSessions.map((s) => {
                const isPractice = getSessionKind(s) === 'practice';
                const isExam = getSessionKind(s) === 'exam';
                const historyEval = pickHistoryEval(s.history_eval);
                const physicalEval = pickPhysicalEval(s.history_eval);
                const kind = getSessionKind(s);
                const canShowHistoryScore = studentCanSeeHistoryScore(kind, historyEval);
                const canShowPhysicalScore = studentCanSeePhysicalScore(kind, physicalEval);
                const histPct = historyEval?.final_percent ?? historyEval?.ai_percent;
                const physPct = physicalEval?.final_percent ?? physicalEval?.ai_percent;
                const scoreParts = [];
                if (canShowHistoryScore && histPct != null) scoreParts.push(`H ${histPct}%`);
                if (canShowPhysicalScore && physPct != null) scoreParts.push(`P ${physPct}%`);
                const scoreLabel = scoreParts.length
                  ? scoreParts.join(' · ')
                  : isPractice
                    ? formatSessionScore(s.score)
                    : null;
                const canShowScore = scoreLabel != null;
                const examPendingHistory = isExam && historyEval && !historyEval.released_to_student;
                const examPendingPhysical = isExam && physicalEval && !physicalEval.released_to_student;
                const examReleasedHistory = isExam && historyEval?.released_to_student;
                const examReleasedPhysical = isExam && physicalEval?.released_to_student;
                const isClickable = isPractice || examReleasedHistory || examReleasedPhysical;

                const card = (
                  <>
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <FileText size={20} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {isExam ? 'Exam session' : s.case?.title || 'Practice session'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar size={12} />
                          {fmtDate(s.start_time)}
                        </p>
                        <span
                          className={cn(
                            'inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full',
                            isExam
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                          )}
                        >
                          {isExam ? 'Exam' : 'Practice'}
                        </span>
                        {isClickable && (
                          <p className="text-[10px] text-primary/80 mt-1.5">View score details</p>
                        )}
                      </div>
                    </div>
                    {(examPendingHistory || examPendingPhysical) && (
                      <div className="flex flex-col items-end shrink-0 text-right gap-1">
                        {examPendingHistory && (
                          <span className="text-xs text-muted-foreground">History: pending review</span>
                        )}
                        {examPendingPhysical && (
                          <span className="text-xs text-muted-foreground">Physical: pending review</span>
                        )}
                      </div>
                    )}
                    {canShowScore && (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-2">
                            <Award size={16} className="text-amber-400" />
                            <span className="font-semibold text-foreground">{scoreLabel}</span>
                          </div>
                          {isExam && s.score != null && (
                            <span className="text-[10px] text-muted-foreground">Combined {s.score}%</span>
                          )}
                        </div>
                        {isClickable && (examReleasedHistory || isPractice) && historyEval && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailSession({
                                id: s.id,
                                title: isExam ? 'Exam session' : s.case?.title || 'Practice session',
                                evaluationType: HISTORY_EVAL_TYPE,
                              });
                            }}
                            className="text-[10px] px-2 py-1 rounded border border-white/10 text-muted-foreground hover:text-foreground"
                          >
                            History
                          </button>
                        )}
                        {isClickable && (examReleasedPhysical || isPractice) && physicalEval && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailSession({
                                id: s.id,
                                title: isExam ? 'Exam session' : s.case?.title || 'Practice session',
                                evaluationType: PHYSICAL_EVAL_TYPE,
                              });
                            }}
                            className="text-[10px] px-2 py-1 rounded border border-white/10 text-muted-foreground hover:text-foreground"
                          >
                            Physical
                          </button>
                        )}
                        {isClickable && (
                          <ChevronRight size={18} className="text-muted-foreground" />
                        )}
                      </div>
                    )}
                    {isClickable && !canShowScore && (
                      <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                    )}
                  </>
                );

                if (isClickable) {
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setDetailSession({
                          id: s.id,
                          title: isExam ? 'Exam session' : s.case?.title || 'Practice session',
                          evaluationType: historyEval ? HISTORY_EVAL_TYPE : PHYSICAL_EVAL_TYPE,
                        })
                      }
                      className={cn(
                        'w-full text-left rounded-xl border border-white/[0.08] bg-white/[0.03] p-4',
                        'flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                        'hover:bg-white/[0.06] hover:border-primary/25 transition-colors cursor-pointer',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                      )}
                    >
                      {card}
                    </button>
                  );
                }

                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {card}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground max-w-md">
              No completed sessions yet — complete a practice case to see your history here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
