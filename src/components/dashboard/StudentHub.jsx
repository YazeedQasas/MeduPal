import React, { useState, useEffect, useRef } from 'react';
import {
  Stethoscope, ChevronRight, ChevronUp, ChevronDown,
  Clock, BookOpen, Brain, TrendingUp, Send,
  MoreHorizontal, Activity, ClipboardCheck, Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AssignedExamStart from './AssignedExamStart';

/* ── palette ── */
const P = {
  page:    'hsl(var(--background))',
  card:    'hsl(var(--card))',
  border:  'rgba(255,255,255,0.07)',
  shadow:  '0 1px 6px rgba(0,0,0,0.4)',
  text:    '#f4f4f5',
  muted:   '#71717a',
  tag:     'rgba(255,255,255,0.06)',
  tagText: '#a1a1aa',
  accent:  '#6ee7b7',
  accentBg:'rgba(110,231,183,0.12)',
};

/* ── helpers ── */
function timeAgo(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}
function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

/* ── Daily tips (cycled by day of week) ── */
const DAILY_TIPS = [
  "Start every history with an open question — let the patient speak first.",
  "Summarise back to the patient at the end of history taking to show active listening.",
  "For chest pain: site, radiation, character, onset, severity, associated symptoms.",
  "Practice timed sessions to build confidence under OSCE exam conditions.",
  "Review feedback after every session — patterns in weak domains are your fastest win.",
  "Use the SOCRATES framework for any pain complaint to stay structured.",
  "Eye contact and posture matter as much as your clinical knowledge in OSCEs.",
];

/* ── Lollipop chart ── */
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MOCK_WEEK  = [20, 55, 80, 60, 72, 45, 30];

function LollipopChart({ todayIdx = new Date().getDay() }) {
  const max = Math.max(...MOCK_WEEK);
  const H   = 110;
  return (
    <div className="mt-6">
      {/* stems + dots */}
      <div className="flex items-end justify-between px-1" style={{ height: H + 36 }}>
        {MOCK_WEEK.map((v, i) => {
          const stemH  = Math.max(10, (v / max) * H);
          const active = i === todayIdx;
          return (
            <div key={i} className="flex flex-col items-center flex-1">
              {active && (
                <span
                  className="text-[11px] font-bold rounded-full px-2 py-0.5 mb-1.5 whitespace-nowrap"
                  style={{ background: P.accent, color: '#0a0a0a' }}
                >
                  {v} pts
                </span>
              )}
              {!active && <div style={{ height: 28 }} />}
              <div
                className="rounded-full"
                style={{
                  width: 10, height: 10,
                  background: active ? P.accent : 'rgba(110,231,183,0.3)',
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  width: 1.5,
                  height: stemH,
                  background: active ? 'rgba(110,231,183,0.4)' : 'rgba(255,255,255,0.08)',
                }}
              />
            </div>
          );
        })}
      </div>
      {/* day labels */}
      <div className="flex justify-between px-1 mt-1">
        {DAY_LABELS.map((d, i) => {
          const active = i === todayIdx;
          return (
            <div key={i} className="flex-1 flex justify-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{
                  background: active ? P.accent : 'transparent',
                  color:      active ? '#0a0a0a' : P.muted,
                }}
              >
                {d}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Score Trend chart (compact area) ── */
function SmallAreaChart({ data, color }) {
  const W = 400, H = 90;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - min) / range) * H * 0.78 - H * 0.1,
  ]);
  const path = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p[0]},${p[1]}`;
    const prev = pts[i - 1];
    const cx = (prev[0] + p[0]) / 2;
    return `${acc} C ${cx},${prev[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }, '');
  const area = `${path} L ${W},${H} L 0,${H} Z`;
  const todayPt = pts[new Date().getDay()] || pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ width: '100%', height: 90, display: 'block' }}>
      <defs>
        <linearGradient id="smallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#smallGrad)" />
      <path d={path}  fill="none" stroke={color} strokeWidth="1.8" />
      <circle cx={todayPt[0]} cy={todayPt[1]} r="4"  fill={color} />
      <circle cx={todayPt[0]} cy={todayPt[1]} r="8"  fill={color} fillOpacity="0.18" />
    </svg>
  );
}

/* ── Session item (expandable) ── */
const CASE_COLORS = ['#e84940', '#4f8ef7', '#34c97a', '#f59e0b', '#8b5cf6'];
function SessionItem({ session, idx, expanded, onToggle }) {
  const title   = session.case?.title   || 'Practice Session';
  const cat     = session.case?.category || '';
  const diff    = session.case?.difficulty || '';
  const status  = session.status || 'Completed';
  const score   = session.score;
  const ago     = timeAgo(session.start_time);
  const color   = CASE_COLORS[idx % CASE_COLORS.length];
  const initial = title.charAt(0).toUpperCase();

  const badgeStyle = status === 'Completed'
    ? { background: 'rgba(110,231,183,0.15)', color: '#6ee7b7' }
    : status === 'In Progress'
    ? { background: 'rgba(96,165,250,0.15)',  color: '#60a5fa' }
    : { background: 'rgba(251,191,36,0.15)',  color: '#fbbf24' };

  return (
    <div style={{ borderBottom: `1px solid ${P.border}` }}>
      <div
        className="flex items-start gap-3 py-4 cursor-pointer"
        onClick={onToggle}
      >
        {/* icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: color }}>
          {initial}
        </div>
        {/* content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate" style={{ color: P.text }}>{title}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={badgeStyle}>
              {status}
            </span>
          </div>
          {score != null && (
            <p className="text-xs mt-0.5" style={{ color: P.muted }}>{score.toFixed(1)} / 10</p>
          )}
        </div>
        <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ border: `1px solid ${P.border}` }}>
          {expanded
            ? <ChevronUp  size={13} style={{ color: P.muted }} />
            : <ChevronDown size={13} style={{ color: P.muted }} />
          }
        </div>
      </div>

      {/* expanded details */}
      {expanded && (
        <div className="pb-4 pl-13 ml-[52px]">
          <div className="flex gap-2 flex-wrap mb-2">
            {diff && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                style={{ background: P.tag, color: P.tagText }}>
                {diff}
              </span>
            )}
            {cat && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                style={{ background: P.tag, color: P.tagText }}>
                {cat}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: P.muted }}>
            <span className="flex items-center gap-1">
              <Stethoscope size={11} /> Clinical case
            </span>
            {ago && (
              <span className="flex items-center gap-1">
                <Clock size={11} /> {ago}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── AI assistant ── */
const HELP_FAQS = [
  { k: /practice|start|begin/i,    a: "Click **Start Practice** on your dashboard or **Browse Cases** to pick a case. Filter by difficulty and specialty to target your weak areas." },
  { k: /osce|exam|examination/i,   a: "**OSCE** (Objective Structured Clinical Examination) is a clinical skills assessment. Medupal lets you practise with AI patients to prepare." },
  { k: /score|scoring|mark|grade/i,a: "Sessions are scored out of 10 across 5 domains: History Taking, Communication, Clinical Reasoning, Examination, and Management Plan." },
  { k: /voice|mic|speak|stt/i,     a: "Click the **microphone** during a practice session. It auto-detects when you stop talking — no need to click again." },
  { k: /case|cases|patient/i,      a: "Cases span cardiology, respiratory, gastro, and more. Browse them under **Cases** and filter by difficulty." },
  { k: /streak|progress|history/i, a: "Your streak tracks consecutive practice days. See full history under **My Sessions**." },
  { k: /hello|hi|hey/i,            a: "Hey! 👋 Ask me about starting practice, scoring, OSCE, voice input, or anything else about Medupal." },
];
function faqAnswer(t) { return HELP_FAQS.find(f => f.k.test(t))?.a ?? null; }

function AiAssistantWidget() {
  const [reply, setReply]     = useState('');
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const send = async () => {
    const t = input.trim(); if (!t || loading) return;
    setInput(''); setReply(''); setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    setReply(faqAnswer(t) ?? "I'm not sure — try asking about practice, OSCE, scoring, voice input, or cases.");
    setLoading(false);
  };

  return (
    <div onClick={() => ref.current?.focus()} className="cursor-text">
      <p className="text-3xl font-bold leading-tight" style={{ color: P.text }}>
        Hey, Need help? 👋
      </p>
      <div className="flex items-center mt-1 gap-2">
        <input
          ref={ref}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Just ask me anything!"
          className="flex-1 bg-transparent outline-none border-none text-xl"
          style={{ color: P.muted, caretColor: P.accent }}
        />
        {input.trim() && (
          <button onClick={send} disabled={loading}
            className="transition-opacity disabled:opacity-40"
            style={{ color: P.accent }}>
            <Send size={18} />
          </button>
        )}
      </div>
      {loading && (
        <div className="flex gap-1 mt-2 items-center">
          {[0,1,2].map(i => (
            <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: P.muted, animationDelay: `${i*0.15}s` }} />
          ))}
        </div>
      )}
      {reply && !loading && (
        <p className="mt-2 text-sm leading-relaxed max-w-xs" style={{ color: P.muted }}>{reply}</p>
      )}
    </div>
  );
}


/* ── Profile card (right sidebar) ── */
function StudentProfileCard({ displayName, stats, loading, onGoToProfile }) {
  const initials = displayName.slice(0, 2).toUpperCase();
  const avgScore = stats.avgScore ? parseFloat(stats.avgScore) : null;
  const scorePct = avgScore ? avgScore / 10 : 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // SVG ring
  const R = 44, STROKE = 4;
  const circ = 2 * Math.PI * R;
  const dash = circ * scorePct;

  useEffect(() => {
    if (!menuOpen) return;
    const onDocDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [menuOpen]);

  return (
    <div className="rounded-2xl p-5" style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: P.shadow }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold" style={{ color: P.text }}>Profile</span>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ border: `1px solid ${P.border}` }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={16} style={{ color: P.muted }} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-40 rounded-xl overflow-hidden"
              style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: P.shadow }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); onGoToProfile?.(); }}
                className="w-full text-left px-3 py-2 text-sm hover:opacity-90"
                style={{ color: P.text, background: 'transparent' }}
              >
                Go to profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Avatar with progress ring */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => onGoToProfile?.()}
          className="relative w-24 h-24 mb-3 rounded-full"
          style={{ outline: 'none' }}
          aria-label="Go to profile"
        >
          <svg className="absolute inset-0" width="96" height="96" viewBox="0 0 96 96">
            {/* track */}
            <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
            {/* progress */}
            <circle
              cx="48" cy="48" r={R}
              fill="none"
              stroke={P.accent}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
            />
          </svg>
          {/* Avatar circle */}
          <div className="absolute inset-[8px] rounded-full flex items-center justify-center text-xl font-bold"
            style={{ background: 'rgba(110,231,183,0.15)', color: P.accent }}>
            {initials}
          </div>
          {/* Star badge */}
          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: P.accent }}>
            <span style={{ color: '#0a0a0a', fontSize: 11, fontWeight: 700 }}>★</span>
          </div>
        </button>

        <p className="font-bold text-base leading-tight" style={{ color: P.text }}>{displayName}</p>
        <p className="text-xs mt-0.5" style={{ color: P.muted }}>Student</p>
      </div>

      {/* Stats row */}
      <div className="mt-5 flex items-center justify-around pt-4" style={{ borderTop: `1px solid ${P.border}` }}>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <BookOpen size={13} style={{ color: '#4f8ef7' }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : stats.total || 0}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: P.muted }}>Sessions</span>
        </div>
        <div className="w-px h-8" style={{ background: P.border }} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <ClipboardCheck size={13} style={{ color: P.accent }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : avgScore ? `${Math.round(avgScore * 10)}%` : '—'}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: P.muted }}>Avg Score</span>
        </div>
        <div className="w-px h-8" style={{ background: P.border }} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <TrendingUp size={13} style={{ color: '#f97316' }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : stats.streak || 0}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: P.muted }}>Streak</span>
        </div>
      </div>
    </div>
  );
}

/* ── Card wrapper ── */
function Card({ children, className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: P.shadow, ...style }}
    >
      {children}
    </div>
  );
}

/* ── Main ── */
export function StudentHub({ setActiveTab }) {
  const { user, profile, role, has_hardware, can_exam, full_name } = useAuth();
  const displayName = full_name || profile?.full_name || user?.email?.split('@')[0] || 'Student';

  const [showExam, setShowExam]           = useState(false);
  const [stats, setStats]                 = useState({ total: 0, avgScore: null, streak: 0, upcoming: 0 });
  const [recentSessions, setRecent]       = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [domains, setDomains]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [expandedIdx, setExpandedIdx]     = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: completed } = await supabase
        .from('sessions')
        .select('id, start_time, score, status, case:cases(title, category, difficulty)')
        .eq('student_id', user.id).eq('status', 'Completed')
        .order('start_time', { ascending: false });
      const all = completed || [];

      const { data: recent } = await supabase
        .from('sessions')
        .select('id, start_time, status, score, case:cases(title, category, difficulty)')
        .eq('student_id', user.id)
        .order('start_time', { ascending: false }).limit(5);

      // Fetch exam sessions (instructor-assigned via Assign Exam page, stored in sessions with type='exam')
      let examsFromSessions = [];
      const { data: examSessions, error: examErr } = await supabase
        .from('sessions')
        .select(`id, start_time, status, session_type, case:cases(title), examiner:profiles!examiner_id(full_name)`)
        .eq('student_id', user.id)
        .eq('session_type', 'exam')
        .eq('status', 'Scheduled')
        .order('start_time', { ascending: true });

      if (!examErr && examSessions?.length) {
        examsFromSessions = examSessions.map((s) => ({
          id: s.id,
          exam_date: s.start_time,
          case_name: s.case?.title || 'Exam',
          status: 'scheduled',
          instructor: s.examiner,
        }));
      }

      // Legacy: also check exams table if used elsewhere
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, exam_date, case_name, status, station:stations(name, room_number), instructor:profiles!instructor_id(full_name)')
        .eq('student_id', user.id).eq('status', 'scheduled')
        .order('exam_date', { ascending: true });

      const allExams = [...examsFromSessions, ...(examsData || [])].sort(
        (a, b) => new Date(a.exam_date || 0) - new Date(b.exam_date || 0)
      );

      // Only include practice sessions in avg (students cannot see exam scores)
      const scored = allCompleted.filter(s => s.score != null && (s.session_type === 'practice' || s.type === 'practice'));
      const avgScore = scored.length
        ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1)
        : null;

      const sessionDays = new Set(allCompleted.map(s => new Date(s.start_time).toDateString()));
      let streak = 0;
      const cur = new Date();
      while (sessionDays.has(cur.toDateString())) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      }

      const domainScores = DEFAULT_DOMAINS.map((d, i) => ({
        label: d.label,
        score: scored.length ? Math.min(10, parseFloat(avgScore) * [1, 0.95, 0.9, 0.93, 0.85][i]) : 0,
      }));

      setStats({
        total: allCompleted.length,
        avgScore,
        streak,
        upcoming: allExams.length + (upcoming || []).length,
      });
      setRecent(recent || []);
      setUpcoming(upcoming || []);
      setUpcomingExams(allExams);
      setDomains(domainScores);
      setLoading(false);
    })();
  }, [user?.id]);

  if (showExam) {
    return (
      <AssignedExamStart
        onBack={() => setShowExam(false)}
        onStart={() => { setShowExam(false); setActiveTab?.('student-dashboard'); }}
      />
    );
  }

  const isStudent     = role === 'student';
  const showFull      = isStudent && has_hardware;
  const showExamOnly  = isStudent && !has_hardware && can_exam;
  const showNone      = isStudent && !has_hardware && !can_exam;

  const nextExam     = upcomingExams?.[0];
  const hour         = new Date().getHours();
  const greeting     = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const weekImproved = stats.streak > 0;

  const quickActions = [
    { icon: BookOpen,   label: 'Browse Cases',   sub: 'Filter by specialty',   color: '#4f8ef7', tab: 'student-practice' },
    { icon: Brain,      label: 'AI Practice',    sub: 'Voice-enabled session', color: '#8b5cf6', href: '/practice-history' },
    { icon: TrendingUp, label: 'My Sessions',    sub: 'View history & scores', color: '#34c97a', tab: 'student-history' },
    { icon: Activity,   label: 'My Profile',     sub: 'View your profile',     color: '#f59e0b', tab: 'student-profile' },
  ];

  // ── Upcoming Exam card (reusable) ──
  const UpcomingExamCard = () => (
    <div className={cn(CARD_CLASS, 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4')}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <ClipboardCheck size={24} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Upcoming Exam</h2>
          {nextExam ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmt(nextExam.start_time)} · {examinerName}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">No scheduled exam at this time.</p>
          )}
        </div>
      </div>
      {nextExam && (
        <button
          type="button"
          onClick={() => {
            setActiveTab?.('student-exam');
            window.history.pushState(null, '', '/exam');
          }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          Start Exam
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );

  // ── No capabilities card ──
  const NoCapabilitiesCard = () => (
    <div className={CARD_CLASS}>
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <ClipboardCheck size={28} />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">No capabilities enabled yet.</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Ask your instructor to enable practice or exam access in your profile settings.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab?.('student-settings')}
          className="px-6 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Contact Instructor
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ background: P.page, height: '100%' }} className="min-h-0">
      <div className="px-6 lg:px-10 py-6 rounded-2xl h-full min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-stretch h-full min-h-0 overflow-hidden">

        {/* ── Left: all main content ── */}
        <div className="relative min-h-0 h-full overflow-hidden pr-2">
          <div className="space-y-5 overflow-y-auto min-h-0 h-full no-scrollbar">

        {/* ── Header + Daily Tip ── */}
        <div className="pb-1">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: P.accent }}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <div className="flex items-baseline gap-4 flex-wrap">
            <h1 className="text-2xl font-bold shrink-0" style={{ color: P.text }}>
              {greeting}, {displayName} 👋
            </h1>
            <p className="text-sm px-3 py-1.5 rounded-lg"
              style={{ color: P.muted, border: `1px solid ${P.border}` }}>
              <span style={{ color: P.text }}>Daily tip:</span> {DAILY_TIPS[new Date().getDay() % DAILY_TIPS.length]}
            </p>
          </div>
        </div>

        {/* ── No capabilities ── */}
        {showNone && (
          <Card className="p-10 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: P.accentBg }}>
              <ClipboardCheck size={26} style={{ color: P.accent }} />
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: P.text }}>No capabilities enabled yet</h2>
            <p className="text-sm mb-5" style={{ color: P.muted }}>Ask your instructor to enable practice or exam access.</p>
            <button onClick={() => setActiveTab?.('student-settings')}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: P.accent, color: '#0a0a0a' }}>
              Go to Settings
            </button>
          </Card>
        )}

        {/* ── Exam only ── */}
        {showExamOnly && (
          <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#fef3c7' }}>
                <ClipboardCheck size={22} style={{ color: '#d97706' }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#d97706' }}>Upcoming Exam</p>
                {nextExam
                  ? <><p className="font-semibold" style={{ color: P.text }}>{nextExam.case_name}</p>
                      <p className="text-xs" style={{ color: P.muted }}>{fmt(nextExam.exam_date)}</p></>
                  : <p className="text-sm" style={{ color: P.muted }}>No scheduled exam.</p>}
              </div>
            </div>
            {nextExam && (
              <button onClick={() => { setActiveTab?.('student-exam'); window.history.pushState(null,'','/exam'); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#d97706' }}>
                View Exam <ChevronRight size={16} />
              </button>
            )}
          </Card>
        )}

        {/* ── Full dashboard ── */}
        {showFull && (
          <>
            {/* Upcoming exam banner */}
            {can_exam && nextExam && (
              <Card className="p-4 flex items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
                    <ClipboardCheck size={17} style={{ color: '#d97706' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#d97706' }}>Upcoming Exam · {fmt(nextExam.exam_date)}</p>
                    <p className="text-sm font-semibold" style={{ color: P.text }}>{nextExam.case_name}</p>
                  </div>
                </div>
                <button onClick={() => { setActiveTab?.('student-exam'); window.history.pushState(null,'','/exam'); }}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl"
                  style={{ background: P.accentBg, color: P.accent }}>
                  View <ChevronRight size={14} />
                </button>
              </Card>
            )}

            {/* ── Main grid ── */}
            <div className="space-y-6">

              {/* Top row: Practice Overview (2/3) + Recent Sessions (1/3) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                {/* Practice Overview */}
                <Card className="p-6 lg:col-span-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: P.accentBg }}>
                        <Stethoscope size={18} style={{ color: P.accent }} />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg" style={{ color: P.text }}>Practice Overview</h2>
                        <p className="text-xs mt-0.5" style={{ color: P.muted }}>
                          Track your session performance and progress
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: P.tag, color: P.tagText }}>
                      This Week <ChevronDown size={12} />
                    </div>
                  </div>

                  <LollipopChart todayIdx={new Date().getDay()} />

                  {(() => {
                    const mockMode      = stats.total === 0 && !loading;
                    const rawScore      = mockMode ? 8.4 : parseFloat(stats.avgScore) || 0;
                    const displayScore  = rawScore ? `${Math.round(rawScore * 10)}%` : '—';
                    const displayStreak = mockMode ? 5  : stats.streak;
                    const displayTotal  = mockMode ? 12 : stats.total;
                    return (
                      <div className="mt-4 flex items-end gap-4">
                        <div>
                          <p className="text-4xl font-bold leading-none" style={{ color: P.text }}>
                            {displayScore}
                          </p>
                          <p className="text-sm mt-2" style={{ color: P.muted }}>
                            {mockMode
                              ? '↑ Example data · start a session to see real stats'
                              : `${weekImproved ? '↑ Improving' : 'Keep going'} · ${displayTotal} session${displayTotal !== 1 ? 's' : ''} total`}
                          </p>
                        </div>
                        <div className="ml-auto flex flex-col items-end gap-1">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(110,231,183,0.15)', color: '#6ee7b7' }}>
                            {displayStreak} day streak 🔥
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </Card>

                {/* Score Trend chart */}
                <Card className="lg:col-span-1 p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-bold text-sm" style={{ color: P.text }}>Score Trend</h2>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                      style={{ background: P.tag, color: P.muted }}>This Week</span>
                  </div>
                  <p className="text-[11px] mb-4" style={{ color: P.muted }}>Daily practice points</p>

                  <SmallAreaChart data={MOCK_WEEK} color={P.accent} />

                  <div className="flex justify-between mt-2 px-0.5">
                    {DAY_LABELS.map((d, i) => {
                      const active = i === new Date().getDay();
                      return (
                        <div key={i} className="flex-1 flex justify-center">
                          <span className="text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center"
                            style={{
                              background: active ? P.accent : 'transparent',
                              color:      active ? '#0a0a0a' : P.muted,
                            }}>
                            {d}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${P.border}` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: P.muted }}>Weekly avg</span>
                      <span className="text-sm font-bold" style={{ color: P.accent }}>
                        {Math.round(MOCK_WEEK.reduce((a, b) => a + b, 0) / MOCK_WEEK.length)} pts
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px]" style={{ color: P.muted }}>Best day</span>
                      <span className="text-sm font-bold" style={{ color: P.text }}>
                        {Math.max(...MOCK_WEEK)} pts
                      </span>
                    </div>
                  </div>
                </Card>
              </div>{/* end top row */}

              {/* Bottom row: 3 cards full width */}
              <div className="grid gap-6 items-stretch" style={{ gridTemplateColumns: '0.65fr 0.65fr 2.5fr' }}>

                {/* Quick Actions */}
                <Card className="p-5 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm" style={{ color: P.text }}>Quick Actions</h3>
                    <button className="text-xs font-medium" style={{ color: P.muted }}>See all</button>
                  </div>
                  <div className="space-y-3">
                    {quickActions.map(({ icon: Icon, label, sub, color, tab, href }) => (
                      <div key={label}
                        onClick={() => href ? (window.location.href = href) : setActiveTab?.(tab)}
                        className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: color + '18' }}>
                          <Icon size={16} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: P.text }}>{label}</p>
                          <p className="text-[10px] truncate" style={{ color: P.muted }}>{sub}</p>
                        </div>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center border shrink-0 group-hover:border-zinc-400 transition-colors"
                          style={{ borderColor: P.border }}>
                          <span style={{ color: P.muted, fontSize: 14, lineHeight: 1 }}>+</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Start AI Practice CTA */}
                <Card className="p-5 flex flex-col h-full relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(110,231,183,0.12) 0%, rgba(96,165,250,0.08) 100%)',
                    border: '1px solid rgba(110,231,183,0.2)',
                  }}>
                  <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle, #8b9fc0 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }} />
                  <div className="relative flex-1">
                    <h3 className="font-bold text-sm leading-snug" style={{ color: P.text }}>
                      Start AI Practice
                    </h3>
                    <p className="text-[11px] mt-1 leading-relaxed" style={{ color: P.muted }}>
                      Voice-enabled sessions with an AI patient
                    </p>
                  </div>
                  <button
                    onClick={() => { setActiveTab?.('student-practice'); window.history.pushState(null,'','/practice'); }}
                    className="relative mt-auto flex items-center justify-between w-full rounded-xl px-3 py-2.5 text-xs font-semibold transition-all hover:opacity-90"
                    style={{ background: 'rgba(255,255,255,0.08)', color: P.text }}>
                    Start now
                    <ChevronRight size={14} style={{ color: P.muted }} />
                  </button>
                </Card>

                {/* Your Progress */}
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-sm" style={{ color: P.text }}>Your Progress</h3>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                      style={{ background: P.tag, color: P.muted }}>All time</span>
                  </div>

                  {(() => {
                    const mock = stats.total === 0 && !loading;
                    const t = mock ? 12  : stats.total;
                    const a = mock ? 8.4 : parseFloat(stats.avgScore) || 0;
                    const s = mock ? 5   : stats.streak;

                    const metrics = [
                      {
                        label:    'Sessions Completed',
                        value:    loading ? '—' : t,
                        unit:     `/ 20 goal`,
                        sub:      mock ? 'Example · start a session' : t === 0 ? 'No sessions yet' : `${t} total session${t !== 1 ? 's' : ''}`,
                        color:    P.accent,
                        progress: Math.min(1, t / 20),
                      },
                      {
                        label:    'Average Score',
                        value:    loading ? '—' : a ? a.toFixed(1) : '—',
                        unit:     '/ 10.0',
                        sub:      a ? `${Math.round(a * 10)}% accuracy across sessions` : 'Complete a session to score',
                        color:    '#60a5fa',
                        progress: a / 10,
                      },
                      {
                        label:    'Current Streak',
                        value:    loading ? '—' : s,
                        unit:     'days',
                        sub:      s > 0 ? `${s} consecutive day${s !== 1 ? 's' : ''} 🔥` : 'Practice today to start a streak',
                        color:    '#f97316',
                        progress: Math.min(1, s / 14),
                      },
                    ];

                    return (
                      <div className="grid grid-cols-3 gap-6">
                        {metrics.map((m) => (
                          <div key={m.label} className="flex flex-col gap-3">
                            <p className="text-[10px] uppercase tracking-widest font-semibold leading-none"
                              style={{ color: P.muted }}>{m.label}</p>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-3xl font-bold leading-none" style={{ color: m.color }}>{m.value}</span>
                              <span className="text-[11px]" style={{ color: P.muted }}>{m.unit}</span>
                            </div>
                            {/* progress track */}
                            <div className="h-[3px] rounded-full overflow-hidden"
                              style={{ background: 'rgba(255,255,255,0.07)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(3, (m.progress || 0) * 100)}%`,
                                  background: `linear-gradient(90deg, ${m.color}55, ${m.color})`,
                                  transition: 'width 0.6s ease',
                                }}
                              />
                            </div>
                            <p className="text-[10px] leading-snug" style={{ color: P.muted }}>{m.sub}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </Card>
              </div>{/* end bottom row */}

              {/* Manikin tutorial video */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
                {/* Video (left) */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${P.border}`, background: 'rgba(255,255,255,0.03)' }}>
                  <video
                    controls
                    preload="metadata"
                    className="w-full"
                    style={{ display: 'block', height: 420, objectFit: 'cover' }}
                  >
                    {/* Place your video at: public/videos/manikin-tutorial.mp4 */}
                    <source src="/videos/manikin-tutorial.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Text (right) */}
                <div className="pt-1 flex flex-col justify-center items-start text-left h-full">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: P.accent }}>
                    Manikin guide
                  </p>
                  <h3 className="font-bold text-2xl leading-tight" style={{ color: P.text }}>
                    Manikin Tutorial
                  </h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: P.muted }}>
                    Watch this walkthrough to learn how to set up the manikin, connect the hardware, and run a practice
                    station confidently.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setActiveTab?.('student-practice'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: P.accent, color: '#0a0a0a' }}
                  >
                    Get started <ChevronRight size={16} />
                  </button>
                </div>
              </div>

            </div>{/* end space-y-6 */}
          </>
        )}

          </div>
        </div>{/* end left main content */}

        {/* ── Right: AI assistant sidebar ── */}
        <div className="relative min-h-0 h-full overflow-hidden pl-1">
          <div className={`${showFull ? 'pt-20' : 'pt-16'} space-y-8 overflow-y-auto min-h-0 h-full no-scrollbar`}>

          {/* Profile widget */}
          <StudentProfileCard
            displayName={displayName}
            stats={stats}
            loading={loading}
            onGoToProfile={() => setActiveTab?.('student-profile')}
          />

          {/* AI assistant (no card background) */}
          <div className="px-1">
            <AiAssistantWidget />
          </div>

          {/* Recent Sessions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base" style={{ color: P.text }}>Your Recent Sessions</h2>
              <button onClick={() => setActiveTab?.('student-history')}
                className="text-xs font-medium hover:underline" style={{ color: P.muted }}>
                See all
              </button>
            </div>

            {(() => {
              const MOCK_SESSIONS = [
                { id: 'm1', status: 'Completed',  score: 8.4,  start_time: new Date(Date.now() - 2*3600000).toISOString(),  case: { title: 'Chest Pain Assessment',   category: 'Cardiology',       difficulty: 'Medium' } },
                { id: 'm2', status: 'In Progress', score: null, start_time: new Date(Date.now() - 26*3600000).toISOString(), case: { title: 'Respiratory Examination',  category: 'Respiratory',      difficulty: 'Hard'   } },
                { id: 'm3', status: 'Completed',  score: 7.2,  start_time: new Date(Date.now() - 50*3600000).toISOString(), case: { title: 'Abdominal Pain History',   category: 'Gastroenterology', difficulty: 'Easy'   } },
              ];
              const sessions = loading
                ? null
                : recentSessions.length > 0 ? recentSessions : MOCK_SESSIONS;

              if (!sessions) return (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: P.tag }} />)}
                </div>
              );

              return (
                <div>
                  {recentSessions.length === 0 && (
                    <p className="text-[10px] mb-2" style={{ color: P.muted }}>— Example data</p>
                  )}
                  {sessions.map((s, i) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      idx={i}
                      expanded={expandedIdx === i}
                      onToggle={() => setExpandedIdx(expandedIdx === i ? -1 : i)}
                    />
                  ))}
                </div>
              );
            })()}
          </div>

          </div>
          {/* soft fade edges */}
          <div
            className="pointer-events-none absolute left-0 right-0 bottom-0 h-14"
            style={{
              background: P.page,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
            }}
          />
        </div>

        </div>{/* end outer grid */}
      </div>
    </div>
  );
}
