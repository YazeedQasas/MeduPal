import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Calendar, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

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
  if (row?.session_type === 'exam' || row?.type === 'exam') return 'exam';
  return row?.session_type || row?.type || 'practice';
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

  const loadSessions = useCallback(async () => {
    if (!user?.id) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error: qErr } = await supabase
      .from('sessions')
      .select('id, start_time, end_time, status, score, session_type, case:cases(title)')
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Session History</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {TODAY_LABEL} - {SUBTITLE_SUFFIX[activeTab]}
        </p>
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
                const scoreLabel = formatSessionScore(s.score);
                const canShowScore = isPractice && scoreLabel != null;

                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <FileText size={20} className="text-primary" />
                      </div>
                      <div>
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
                      </div>
                    </div>
                    {canShowScore && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Award size={16} className="text-amber-400" />
                        <span className="font-semibold text-foreground">{scoreLabel}</span>
                      </div>
                    )}
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
