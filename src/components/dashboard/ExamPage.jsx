import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, User, Timer, TrendingUp,
  FileCheck, AlertCircle, BookOpen, Lightbulb,
  CheckCircle2, ChevronRight, BarChart2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase'; // used in fetchExams
import { cn } from '../../lib/utils';

// ─── Static educational content ───────────────────────────────────────────────

const PREP_CHECKLIST = [
  'Arrive at least 10 minutes early and bring your student ID.',
  'Read the task brief outside the station before entering.',
  'Introduce yourself and obtain consent before examining.',
  'Stay calm if you make a mistake — examiners mark the whole station.',
  'Do not discuss the case until all stations are complete.',
];

const DOMAIN_TIPS = [
  { label: 'History Taking',     tip: 'Open with a broad question, then narrow using SOCRATES for pain.' },
  { label: 'Communication',      tip: "Use the patient's name and summarise back at the end of the history." },
  { label: 'Clinical Reasoning', tip: 'Always generate at least three differentials before committing.' },
  { label: 'Professionalism',    tip: 'Wash hands, introduce yourself, thank the patient — easy marks often lost.' },
];

const RESOURCES = [
  { label: 'OSCE Marking Criteria',  sub: 'PDF · 2 pages' },
  { label: 'SOCRATES Framework',     sub: 'Symptom characterisation guide' },
  { label: 'ICE Model',              sub: 'Ideas, Concerns, Expectations' },
  { label: 'Cardiology Cheat Sheet', sub: 'Relevant to your next case' },
];

// ─── Status map ───────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  Completed:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'In Progress':'bg-blue-500/15   text-blue-400   border-blue-500/25',
  Scheduled:    'bg-amber-500/15  text-amber-400  border-amber-500/25',
  Cancelled:    'bg-red-500/15    text-red-400    border-red-500/25',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateSmart(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())    return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(s, e) {
  if (!s || !e) return null;
  const m = Math.round((new Date(e) - new Date(s)) / 60000);
  return m > 0 ? `${m} min` : null;
}
function getTimeLeft(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return null;
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}
function scoreColor(s) {
  if (s == null) return 'text-muted-foreground';
  const pct = s <= 10 ? s * 10 : s;
  if (pct >= 70) return 'text-emerald-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-red-400';
}
function scoreBg(s) {
  if (s == null) return 'bg-white/[0.08]';
  const pct = s <= 10 ? s * 10 : s;
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}
function scoreLabel(s) {
  if (s == null) return '—';
  return s <= 10 ? `${s}/10` : `${s}%`;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: 'Overview',    icon: FileCheck },
  { id: 'history',     label: 'History',     icon: BarChart2 },
  { id: 'preparation', label: 'Preparation', icon: Lightbulb },
];

function TabBar({ active, onChange, pastCount }) {
  return (
    <div className="flex items-center gap-1 border-b border-white/[0.07] mb-6">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
            active === id
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon size={14} />
          {label}
          {id === 'history' && pastCount > 0 && (
            <span className="text-[10px] bg-neutral-800 text-muted-foreground px-1.5 py-px rounded-full">
              {pastCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function Countdown({ startTime }) {
  const [left, setLeft] = useState(() => getTimeLeft(startTime));
  useEffect(() => {
    const id = setInterval(() => setLeft(getTimeLeft(startTime)), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  if (!left) return null;
  const parts = left.days > 0
    ? [{ v: left.days, l: 'Days' }, { v: left.hours, l: 'Hrs' }, { v: left.minutes, l: 'Min' }]
    : [{ v: left.hours, l: 'Hrs' }, { v: left.minutes, l: 'Min' }, { v: left.seconds, l: 'Sec' }];
  return (
    <div className="flex gap-2">
      {parts.map(({ v, l }) => (
        <div key={l} className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm py-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{String(v).padStart(2, '0')}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{l}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ upcomingExams }) {
  const next = upcomingExams[0] ?? null;

  if (!next) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm flex items-center justify-center mb-4">
          <Calendar size={22} className="text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-foreground">No upcoming exam</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Your instructor will assign an exam when you&apos;re ready.
        </p>
      </div>
    );
  }

  const isToday = new Date(next.start_time).toDateString() === new Date().toDateString();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

      {/* Left: stations list + countdown */}
      <div className="lg:col-span-3 space-y-4">

        {/* Countdown / today banner */}
        {isToday ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 flex items-center gap-3">
            <AlertCircle size={16} className="text-emerald-400 shrink-0" />
            <p className="text-sm font-semibold text-emerald-400">Your exam is today — make sure you&apos;re on time.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Timer size={11} /> First station starts in
            </p>
            <Countdown startTime={next.start_time} />
          </div>
        )}

        {/* Stations */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Assigned Stations
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full border border-white/[0.1] text-muted-foreground">
              {upcomingExams.length} station{upcomingExams.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {upcomingExams.map((session, idx) => {
              const statusCls = STATUS_COLOR[session.status] || STATUS_COLOR.Scheduled;
              const duration  = fmtDuration(session.start_time, session.end_time);
              return (
                <div key={session.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {session.case?.title || 'Station'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{fmtDateSmart(session.start_time)}</span>
                      {' · '}{fmtTime(session.start_time)}{duration ? ` (${duration})` : ''}
                    </p>
                  </div>
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0', statusCls)}>
                    {session.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Date + examiner summary */}
        <div className="grid grid-cols-2 gap-3">
          {(() => {
            const last = upcomingExams[upcomingExams.length - 1];
            const sameDay = fmtDate(next.start_time) === fmtDate(last?.start_time);
            const dateValue = sameDay
              ? fmtDate(next.start_time)
              : `${fmtDateSmart(next.start_time)} – ${fmtDateSmart(last?.start_time)}`;
            return [
              { icon: Calendar, label: 'Date',     value: dateValue },
              { icon: User,     label: 'Examiner', value: next.examiner?.full_name || '—' },
            ];
          })().map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center shrink-0">
                <Icon size={13} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: checklist */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] p-5">
          <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 size={13} className="text-primary" /> On the Day
          </p>
          <ul className="space-y-2.5">
            {PREP_CHECKLIST.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                <span className="mt-0.5 w-4 h-4 rounded-full border border-white/[0.12] flex items-center justify-center text-[9px] text-muted-foreground/60 shrink-0">{i + 1}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
}

// ─── History tab ──────────────────────────────────────────────────────────────

function HistoryTab({ pastExams }) {
  const scored = pastExams.filter(e => e.score != null);
  const avg    = scored.length ? scored.reduce((s, e) => s + (e.score <= 10 ? e.score * 10 : e.score), 0) / scored.length : null;
  const best   = scored.length ? Math.max(...scored.map(e => e.score <= 10 ? e.score * 10 : e.score)) : null;

  // Compute per-category averages from real session data
  const domainMap = {};
  scored.forEach((e) => {
    const cat = e.case?.category || 'General';
    const pct = e.score <= 10 ? e.score * 10 : e.score;
    if (!domainMap[cat]) domainMap[cat] = { total: 0, count: 0 };
    domainMap[cat].total += pct;
    domainMap[cat].count += 1;
  });
  const domainRows = Object.entries(domainMap)
    .map(([label, { total, count }]) => ({ label, score: Math.round(total / count) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (pastExams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm flex items-center justify-center mb-4">
          <BarChart2 size={22} className="text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-foreground">No history yet</p>
        <p className="text-sm text-muted-foreground mt-1">Completed exam scores will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Summary strip */}
      {scored.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Exams Taken',   value: pastExams.length,                  color: 'text-foreground' },
            { label: 'Average Score', value: avg != null ? `${Math.round(avg)}%` : '—', color: scoreColor(avg != null ? avg / 10 : null) },
            { label: 'Best Score',    value: best != null ? `${best}%` : '—',         color: scoreColor(best != null ? best / 10 : null) },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] p-4 text-center">
              <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Exam list */}
        <div className={cn('rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-hidden', domainRows.length > 0 ? 'lg:col-span-3' : 'lg:col-span-5')}>
          <div className="px-5 py-4 border-b border-white/[0.07]">
            <p className="text-sm font-semibold text-foreground">Past Exams</p>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {pastExams.map(exam => {
              const statusCls = STATUS_COLOR[exam.status] || STATUS_COLOR.Completed;
              const pct = exam.score != null ? (exam.score <= 10 ? exam.score * 10 : exam.score) : null;
              return (
                <div key={exam.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0',
                    pct != null ? scoreBg(exam.score) + ' text-white' : 'bg-white/[0.08] text-muted-foreground'
                  )}>
                    {pct != null ? `${pct}%` : '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{exam.case?.title || 'Exam'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(exam.start_time)}{exam.examiner?.full_name ? ` · ${exam.examiner.full_name}` : ''}
                    </p>
                  </div>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0', statusCls)}>
                    {exam.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-category scores (only shown when there's scored data) */}
        {domainRows.length > 0 && (
          <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] p-5">
            <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" /> By Category
            </p>
            <div className="space-y-4">
              {domainRows.map(({ label, score }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground truncate pr-2">{label}</span>
                    <span className={cn('font-bold tabular-nums shrink-0', scoreColor(score / 10))}>{score}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div className={cn('h-full rounded-full', scoreBg(score / 10))} style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Preparation tab ──────────────────────────────────────────────────────────

function PreparationTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Domain tips */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-2">
          <Lightbulb size={14} className="text-amber-400" />
          <p className="text-sm font-semibold text-foreground">Domain Tips</p>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {DOMAIN_TIPS.map(({ label, tip }) => (
            <div key={label} className="px-5 py-4">
              <p className="text-xs font-semibold text-primary mb-1">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-2">
          <BookOpen size={14} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Study Resources</p>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {RESOURCES.map(({ label, sub }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.06] transition-colors cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-white/[0.07] flex items-center justify-center shrink-0">
                <BookOpen size={13} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* On the day checklist — full width */}
      <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-2">
          <CheckCircle2 size={14} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">On the Day</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06]">
          {PREP_CHECKLIST.map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/[0.02] px-5 py-4">
              <div className="w-5 h-5 rounded-full border border-white/[0.12] flex items-center justify-center text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ExamPage({ setActiveTab: _setActiveTab }) {
  const { user, role, can_exam } = useAuth();
  const [activeTab,      setLocalTab]      = useState('overview');
  const [upcomingExams,  setUpcomingExams]  = useState([]);
  const [pastExams,      setPastExams]      = useState([]);
  const [loading,        setLoading]        = useState(true);

  const fetchExams = useCallback(async () => {
    if (!user?.id || role !== 'student') { setLoading(false); return; }

    const select = 'id, start_time, end_time, status, session_type, score, case:cases(id, title, category), examiner:profiles!examiner_id(full_name)';

    const [upcomingRes, pastRes] = await Promise.all([
      supabase
        .from('sessions')
        .select(select)
        .eq('student_id', user.id)
        .eq('session_type', 'exam')
        .in('status', ['Scheduled', 'In Progress'])
        .order('start_time', { ascending: true }),
      supabase
        .from('sessions')
        .select(select)
        .eq('student_id', user.id)
        .eq('session_type', 'exam')
        .in('status', ['Completed', 'Cancelled'])
        .order('start_time', { ascending: false })
        .limit(20),
    ]);

    if (upcomingRes.error) console.error('[ExamPage] upcoming query error:', upcomingRes.error);
    if (pastRes.error)     console.error('[ExamPage] past query error:',     pastRes.error);

    setUpcomingExams(upcomingRes.data || []);
    setPastExams(pastRes.data || []);
    setLoading(false);
  }, [user?.id, role]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  // Real-time: refresh when any of this student's exam sessions change (delete / update)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`exampage-sessions-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, (payload) => {
        const row = payload?.new || payload?.old;
        if (!row) return;
        if (row.student_id !== user.id) return;
        if ((row.session_type || row.type) !== 'exam') return;
        fetchExams();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchExams]);

  if (role !== 'student' || !can_exam) {
    return (
      <div className="max-w-xl mx-auto mt-16">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <FileCheck size={22} className="text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {role !== 'student' ? 'Students only' : 'No exam access yet'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {role !== 'student'
              ? 'Exam access is available for students only.'
              : "Your instructor hasn't enabled exam access for your account yet."}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">My Exam</h1>
        <p className="text-sm text-muted-foreground mt-1">Your scheduled OSCE examination and performance</p>
      </div>

      <TabBar active={activeTab} onChange={setLocalTab} pastCount={pastExams.length} />

      {activeTab === 'overview'    && <OverviewTab    upcomingExams={upcomingExams} />}
      {activeTab === 'history'     && <HistoryTab     pastExams={pastExams} />}
      {activeTab === 'preparation' && <PreparationTab />}
    </div>
  );
}
