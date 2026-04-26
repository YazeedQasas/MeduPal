import React, { useState, useEffect } from 'react';
import { History, FileText, Calendar, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { dateStyle: 'long' });
}

export function StudentHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('sessions')
        .select('id, start_time, status, score, session_type, case:cases(title)')
        .eq('student_id', user.id)
        .eq('status', 'Completed')
        .order('start_time', { ascending: false });

      setSessions(data || []);
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">History</h1>
      <p className="text-muted-foreground text-sm">Your previous practice sessions.</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-card p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const isPractice = s.session_type === 'practice';
            const canShowScore = isPractice && s.score != null;
            const displayScore = s.score <= 10 ? `${s.score.toFixed(1)}/10` : `${Math.round(s.score)}%`;

            return (
              <div
                key={s.id}
                className="rounded-xl border border-white/10 bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{s.case?.title || 'Session'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar size={12} />
                      {fmtDate(s.start_time)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canShowScore ? (
                    <>
                      <Award size={16} className="text-amber-400" />
                      <span className="font-semibold text-foreground">{displayScore}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {!isPractice ? 'Score hidden (exam)' : '—'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-card p-8 text-center">
          <History size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No sessions yet. Start practicing to see your history here.</p>
        </div>
      )}
    </div>
  );
}
