import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Mail,
  FileText,
  Calendar,
  Award,
  ChevronRight,
  Loader2,
  ClipboardCheck,
  TrendingUp,
  Clock,
  BookOpen,
  Target,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { getSessionKind } from '../../lib/studentExamSessions';
import {
  pickHistoryEval,
  displayHistoryPercent,
  historyEvalStatusLabel,
} from '../../lib/historyEvaluations';
import { HistoryEvalDetailModal } from './HistoryEvalDetailModal';

const IP = {
  page: 'hsl(var(--background))',
  card: 'hsl(var(--card))',
  border: 'rgba(255,255,255,0.07)',
  shadow: '0 1px 3px rgba(0,0,0,0.35)',
  text: '#f4f4f5',
  muted: '#71717a',
  accent: '#6ee7b7',
  accentBg: 'rgba(110,231,183,0.12)',
};

const SESSION_SELECT = `
  id, start_time, end_time, status, score, session_type,
  case:cases(title, category),
  history_eval:history_evaluations(
    evaluation_type, final_percent, ai_percent, instructor_percent,
    released_to_student, review_status, items_covered, total_items
  )
`;

const HISTORY_TABS = [
  { id: 'all', label: 'All sessions' },
  { id: 'practice', label: 'Practice' },
  { id: 'exam', label: 'Exam' },
];

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString([], { dateStyle: 'medium' });
}

function formatSessionScore(score) {
  if (score == null || score === '') return null;
  const n = Number(score);
  if (Number.isNaN(n)) return null;
  if (n <= 10) return `${n.toFixed(1)}/10`;
  return `${Math.round(n)}%`;
}

function scorePercentValue(session, instructorView) {
  const kind = getSessionKind(session);
  const historyEval = pickHistoryEval(session.history_eval);
  const histPct = displayHistoryPercent(historyEval);
  if (historyEval && histPct != null) {
    if (!instructorView && kind === 'exam' && !historyEval.released_to_student) return null;
    return histPct;
  }
  if (session.score == null || session.score === '') return null;
  const n = Number(session.score);
  if (Number.isNaN(n)) return null;
  return n <= 10 ? Math.round(n * 10) : Math.round(n);
}

function resolveSessionScore(session, { instructorView }) {
  const kind = getSessionKind(session);
  const historyEval = pickHistoryEval(session.history_eval);
  const histPct = displayHistoryPercent(historyEval);

  if (historyEval && histPct != null) {
    const pendingExam = kind === 'exam' && !historyEval.released_to_student;
    if (!instructorView && pendingExam) {
      return { type: 'pending', label: 'Pending review', sub: 'History-taking' };
    }
    return {
      type: 'score',
      label: `${histPct}%`,
      sub: kind === 'exam' ? 'History-taking' : 'Checklist score',
      pending: instructorView && pendingExam,
    };
  }

  const sessionLabel = formatSessionScore(session.score);
  if (sessionLabel) {
    return { type: 'score', label: sessionLabel, sub: 'Session score' };
  }

  if (session.status === 'Completed') {
    return { type: 'none', label: 'No score', sub: null };
  }

  return { type: 'none', label: '—', sub: session.status };
}

function useStudentSessions(studentId, instructorView) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    if (!studentId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from('sessions')
      .select(SESSION_SELECT)
      .eq('student_id', studentId)
      .order('start_time', { ascending: false });

    if (instructorView) {
      query = query.eq('session_type', 'exam');
    }

    const { data, error } = await query;

    if (error) console.warn('[StudentProfile] sessions:', error.message);
    let rows = data || [];
    if (instructorView && rows.length === 0) {
      const { data: legacy } = await supabase
        .from('sessions')
        .select(SESSION_SELECT)
        .eq('student_id', studentId)
        .eq('type', 'exam')
        .order('start_time', { ascending: false });
      rows = legacy || [];
    } else if (instructorView) {
      rows = rows.filter((s) => getSessionKind(s) === 'exam');
    }
    setSessions(rows);
    setLoading(false);
  }, [studentId, instructorView]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === 'Completed'),
    [sessions]
  );

  const analytics = useMemo(() => {
    const exams = sessions.filter((s) => getSessionKind(s) === 'exam').length;
    const pendingReview = sessions.filter((s) => {
      const ev = pickHistoryEval(s.history_eval);
      return ev?.review_status === 'pending_instructor';
    }).length;

    const percents = completedSessions
      .map((s) => scorePercentValue(s, instructorView))
      .filter((v) => v != null);

    const avg = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null;
    const best = percents.length ? Math.max(...percents) : null;

    const lastSession = sessions[0]?.start_time
      ? fmtDate(sessions[0].start_time)
      : '—';

    return {
      completed: completedSessions.length,
      total: sessions.length,
      exams,
      pendingReview,
      avg,
      best,
      lastSession,
    };
  }, [sessions, completedSessions, instructorView]);

  return { sessions, loading, completedSessions, analytics, reload: loadSessions };
}

function InstructorStudentProfilePage({ student, onBack, sessions, loading, analytics }) {
  const [detailSession, setDetailSession] = useState(null);

  const displayName = student.full_name || student.name || 'Student';
  const email = student.email || 'Not provided';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const scoreRing = analytics.avg != null ? analytics.avg / 100 : 0;
  const R = 52;
  const circ = 2 * Math.PI * R;
  const dash = circ * scoreRing;

  const cardStyle = {
    background: IP.card,
    borderColor: IP.border,
    boxShadow: IP.shadow,
  };

  return (
    <div className="w-full min-h-0" style={{ color: IP.text }}>
      {detailSession && (
        <HistoryEvalDetailModal
          sessionId={detailSession.id}
          caseTitle={detailSession.title}
          onClose={() => setDetailSession(null)}
        />
      )}

      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden mb-6 border"
        style={{ ...cardStyle, borderColor: IP.border }}
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(ellipse 80% 120% at 0% 0%, rgba(110,231,183,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 80% at 100% 100%, rgba(96,165,250,0.12) 0%, transparent 50%), linear-gradient(180deg, #0c1210 0%, #060909 100%)',
          }}
        />
        <div className="relative px-5 py-5 sm:px-8 sm:py-7">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold mb-6 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/[0.06]"
            style={{ color: IP.muted }}
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-8">
            <div className="relative shrink-0">
              <svg className="w-28 h-28 sm:w-32 sm:h-32" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                <circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={IP.accent}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ}`}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div
                className="absolute inset-3 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: IP.accentBg, color: IP.accent }}
              >
                {initials}
              </div>
              <div
                className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: IP.accent, color: '#0a0a0a' }}
              >
                {analytics.avg != null ? `${analytics.avg}%` : '—'}
              </div>
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: IP.accent }}>
                Advisee profile
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{displayName}</h1>
              <p className="text-sm mt-1 truncate" style={{ color: IP.muted }}>
                {email}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{
                    background: student.can_exam ? IP.accentBg : 'rgba(255,255,255,0.06)',
                    color: student.can_exam ? IP.accent : IP.muted,
                  }}
                >
                  {student.can_exam ? 'Exam eligible' : 'Not exam eligible'}
                </span>
                {analytics.pendingReview > 0 && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400">
                    {analytics.pendingReview} pending review
                  </span>
                )}
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.06]" style={{ color: IP.muted }}>
                  Last active · {analytics.lastSession}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Avg score', value: analytics.avg != null ? `${analytics.avg}%` : '—', icon: TrendingUp, color: IP.accent },
          { label: 'Best score', value: analytics.best != null ? `${analytics.best}%` : '—', icon: Award, color: '#f59e0b' },
          { label: 'Completed', value: analytics.completed, icon: CheckCircle2, color: '#60a5fa' },
          { label: 'Exam sessions', value: analytics.total, icon: BookOpen, color: '#a78bfa' },
        ].map((item) => (
          <motion.div
            key={item.label}
            className="rounded-2xl p-4 border"
            style={cardStyle}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: IP.muted }}>
                  {item.label}
                </p>
                <p className="text-xl font-bold mt-1 tabular-nums">{item.value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${item.color}22` }}>
                <item.icon size={16} style={{ color: item.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,300px)_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl p-5 border" style={cardStyle}>
            <h2 className="text-sm font-semibold mb-4">Contact & access</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail size={16} className="shrink-0 mt-0.5" style={{ color: IP.muted }} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: IP.muted }}>
                    Email
                  </p>
                  <p className="text-sm font-medium truncate">{email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5 border" style={cardStyle}>
            <h2 className="text-sm font-semibold mb-4">Exam overview</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: IP.muted }}>Assigned exams</span>
                <span className="font-semibold tabular-nums">{analytics.exams}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: IP.muted }}>Completed</span>
                <span className="font-semibold tabular-nums">{analytics.completed}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: IP.muted }}>Awaiting your review</span>
                <span className="font-semibold tabular-nums text-amber-400">{analytics.pendingReview}</span>
              </div>
            </div>
          </div>

          {analytics.pendingReview > 0 && (
            <div
              className="rounded-2xl p-4 border flex gap-3"
              style={{ ...cardStyle, borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)' }}
            >
              <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-200">Reviews needed</p>
                <p className="text-xs mt-1 text-amber-200/80">
                  {analytics.pendingReview} exam session{analytics.pendingReview === 1 ? '' : 's'} awaiting history
                  score release.
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Session history */}
        <div className="rounded-2xl border overflow-hidden min-h-[420px] flex flex-col" style={cardStyle}>
          <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: IP.border }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck size={16} style={{ color: IP.accent }} />
                  Exam history & scores
                </h2>
                <p className="text-xs mt-1" style={{ color: IP.muted }}>
                  Assigned exams only. Tap a row for history-taking checklist detail.
                </p>
              </div>
              {!loading && (
                <span className="text-xs px-2.5 py-1 rounded-full shrink-0" style={{ background: IP.accentBg, color: IP.accent }}>
                  {sessions.length} exam{sessions.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-9 h-9 animate-spin" style={{ color: IP.accent }} />
                <p className="text-sm" style={{ color: IP.muted }}>
                  Loading sessions…
                </p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Target size={40} className="mx-auto mb-3 opacity-30" style={{ color: IP.muted }} />
                <p className="text-sm font-medium">No exam sessions yet</p>
                <p className="text-xs mt-2" style={{ color: IP.muted }}>
                  Assign an exam from the dashboard to track this advisee&apos;s OSCE scores here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((s, index) => {
                  const historyEval = pickHistoryEval(s.history_eval);
                  const score = resolveSessionScore(s, { instructorView: true });
                  const title = s.case?.title || 'Exam session';
                  const pct = scorePercentValue(s, true);
                  const canOpenDetail = Boolean(historyEval);
                  const borderAccent = '#f59e0b';

                  const inner = (
                    <>
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                        style={{ background: borderAccent }}
                      />
                      <div className="flex items-start gap-3 flex-1 min-w-0 pl-2">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(245,158,11,0.12)' }}
                        >
                          <FileText size={18} style={{ color: '#fbbf24' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{title}</p>
                          {s.case?.category && (
                            <p className="text-[10px] truncate mt-0.5" style={{ color: IP.muted }}>
                              {s.case.category}
                            </p>
                          )}
                          <p className="text-xs flex items-center gap-1 mt-1" style={{ color: IP.muted }}>
                            <Clock size={11} />
                            {fmtDate(s.start_time)}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                              Exam
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06]" style={{ color: IP.muted }}>
                              {s.status}
                            </span>
                            {historyEval && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06]" style={{ color: IP.muted }}>
                                {historyEvalStatusLabel(historyEval)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 pl-2">
                        {score.type === 'score' && pct != null && (
                          <div
                            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center border"
                            style={{
                              borderColor: `${borderAccent}44`,
                              background: 'rgba(245,158,11,0.1)',
                            }}
                          >
                            <span className="text-lg font-bold tabular-nums leading-none" style={{ color: borderAccent }}>
                              {pct}
                            </span>
                            <span className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: IP.muted }}>
                              %
                            </span>
                          </div>
                        )}
                        {score.type === 'pending' && (
                          <span className="text-xs text-amber-400 font-medium text-right max-w-[5.5rem]">
                            Pending
                          </span>
                        )}
                        {score.type === 'none' && (
                          <span className="text-xs" style={{ color: IP.muted }}>
                            {score.label}
                          </span>
                        )}
                        {canOpenDetail && <ChevronRight size={18} style={{ color: IP.muted }} />}
                      </div>
                    </>
                  );

                  const className = cn(
                    'relative w-full text-left rounded-xl border p-4 flex items-center justify-between gap-3 transition-all',
                    canOpenDetail && 'hover:bg-white/[0.04] hover:border-white/15 cursor-pointer',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40'
                  );

                  if (canOpenDetail) {
                    return (
                      <motion.button
                        key={s.id}
                        type="button"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.2) }}
                        onClick={() => setDetailSession({ id: s.id, title })}
                        className={className}
                        style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)' }}
                      >
                        {inner}
                      </motion.button>
                    );
                  }

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.2) }}
                      className={className}
                      style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)' }}
                    >
                      {inner}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentSelfProfilePage({ student, onBack, sessions, loading, analytics }) {
  const [historyTab, setHistoryTab] = useState('all');
  const [detailSession, setDetailSession] = useState(null);

  const displayName = student.full_name || 'Student';
  const username = student.email?.replace(/@.*$/, '') || 'student';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const filteredSessions = useMemo(() => {
    if (historyTab === 'all') return sessions;
    return sessions.filter((s) => getSessionKind(s) === historyTab);
  }, [sessions, historyTab]);

  if (!student) return null;

  return (
    <div className="space-y-0 animate-in fade-in slide-in-from-right-10 duration-300">
      {detailSession && (
        <HistoryEvalDetailModal
          sessionId={detailSession.id}
          caseTitle={detailSession.title}
          onClose={() => setDetailSession(null)}
        />
      )}

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-muted" />

      <div className="max-w-4xl mx-auto px-4 pb-8 -mt-12">
        <div className="flex items-end gap-4 mb-8">
          <div className="h-24 w-24 rounded-full border-4 bg-card flex items-center justify-center text-2xl font-bold text-primary bg-primary/20" style={{ borderColor: 'hsl(var(--background))' }}>
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            <p className="text-muted-foreground">@{username}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Average score</p>
            <p className="text-2xl font-bold">{loading ? '…' : analytics.avg != null ? `${analytics.avg}%` : '—'}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{loading ? '…' : analytics.completed}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold">Session history</h3>
          </div>
          <div className="flex border-b border-border px-2">
            {HISTORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHistoryTab(tab.id)}
                className={cn(
                  'px-4 py-3 text-sm border-b-2 -mb-px',
                  historyTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-4 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">No sessions yet.</p>
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((s) => {
                  const kind = getSessionKind(s);
                  const isExam = kind === 'exam';
                  const historyEval = pickHistoryEval(s.history_eval);
                  const score = resolveSessionScore(s, { instructorView: false });
                  const title = isExam ? 'Exam session' : s.case?.title || 'Practice';
                  const canOpen =
                    historyEval &&
                    (kind === 'practice' || historyEval.released_to_student);

                  const row = (
                    <div className="flex items-center justify-between gap-3 w-full">
                      <div>
                        <p className="font-medium text-sm">{title}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(s.start_time)}</p>
                      </div>
                      {score.type === 'score' && (
                        <span className="font-semibold">{score.label}</span>
                      )}
                      {canOpen && <ChevronRight size={16} className="text-muted-foreground" />}
                    </div>
                  );

                  if (canOpen) {
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setDetailSession({ id: s.id, title })}
                        className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50"
                      >
                        {row}
                      </button>
                    );
                  }
                  return (
                    <div key={s.id} className="p-3 rounded-lg border border-border">
                      {row}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentProfile({ student, onBack, instructorView = false }) {
  const { sessions, loading, analytics } = useStudentSessions(student?.id, instructorView);

  if (!student) return null;

  if (instructorView) {
    return (
      <InstructorStudentProfilePage
        student={student}
        onBack={onBack}
        sessions={sessions}
        loading={loading}
        analytics={analytics}
      />
    );
  }

  return (
    <StudentSelfProfilePage
      student={student}
      onBack={onBack}
      sessions={sessions}
      loading={loading}
      analytics={analytics}
    />
  );
}
