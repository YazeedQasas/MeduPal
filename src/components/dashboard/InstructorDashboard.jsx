import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ActiveStations } from './ActiveStations';
import { QuickActions } from './QuickActions';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { glassCardStyle, DASHBOARD_THEME as T } from './DashboardShell';
import {
  Calendar,
  MapPin,
  User,
  ChevronRight,
  Clock,
  Activity,
  Zap,
  FileCheck,
  Search,
  Users,
  TrendingUp,
  BarChart2,
  AlertCircle,
  Trophy,
  Loader2,
  Play,
  Plus,
  Maximize2,
  Award,
  FileText,
  UserX,
  Sparkles,
  MoreHorizontal,
  ClipboardCheck,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/* StudentHub-aligned page palette */
const P = {
  page: 'hsl(var(--background))',
  card: 'hsl(var(--card))',
  border: 'rgba(255,255,255,0.07)',
  shadow: '0 1px 3px rgba(0,0,0,0.35)',
  text: '#f4f4f5',
  muted: '#71717a',
  tag: 'rgba(255,255,255,0.06)',
  tagText: '#a1a1aa',
  accent: '#6ee7b7',
  accentBg: 'rgba(110,231,183,0.12)',
};

const CHART_COLORS = ['#60a5fa', '#6ee7b7', '#a78bfa', '#f472b6', '#fb923c'];

/** Rotating teaching-focus lines (aligned with StudentHub daily tips pattern) */
const INSTRUCTOR_PLAN_TIPS = [
  'Block time to review at-risk advisees before afternoon sessions.',
  'Skim case notes for the next session so feedback is specific.',
  'Check hardware diagnostics if you have exams running today.',
  'Triage pending exam assignments before new requests pile up.',
  'Scan the roster for a week of inactivity — a short message helps.',
  'Balance new assignments with students who still need follow-up.',
  'End the day by logging outcomes — trends are easier to spot early.',
];

const GLASS_STRONG = {
  background: '#060909',
  border: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.45), 0 20px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
};

/** Profile card (right rail) — mirrors StudentHub `StudentProfileCard` for instructors */
function InstructorProfileCard({ displayName, stats, loading, onGoToProfile }) {
  const initials = (displayName || '?').slice(0, 2).toUpperCase();
  const avgPct = stats.avgClassPct != null ? Math.min(100, Math.max(0, stats.avgClassPct)) : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const scorePct = avgPct != null ? avgPct / 100 : 0;

  const R = 44;
  const STROKE = 4;
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
            onClick={() => setMenuOpen((v) => !v)}
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
              className="absolute right-0 mt-2 w-40 rounded-xl overflow-hidden z-20"
              style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: P.shadow }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onGoToProfile?.();
                }}
                className="w-full text-left px-3 py-2 text-sm hover:opacity-90"
                style={{ color: P.text, background: 'transparent' }}
              >
                Go to profile
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => onGoToProfile?.()}
          className="relative w-24 h-24 mb-3 rounded-full"
          style={{ outline: 'none' }}
          aria-label="Go to profile"
        >
          <svg className="absolute inset-0" width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
            <circle
              cx="48"
              cy="48"
              r={R}
              fill="none"
              stroke={P.accent}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
            />
          </svg>
          <div className="absolute inset-[8px] rounded-full flex items-center justify-center text-xl font-bold" style={{ background: 'rgba(110,231,183,0.15)', color: P.accent }}>
            {initials}
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: P.accent }}>
            <span style={{ color: '#0a0a0a', fontSize: 11, fontWeight: 700 }}>★</span>
          </div>
        </button>

        <p className="font-bold text-base leading-tight text-center" style={{ color: P.text }}>{displayName}</p>
        <p className="text-xs mt-0.5" style={{ color: P.muted }}>Instructor</p>
      </div>

      <div className="mt-5 flex items-center justify-around pt-4" style={{ borderTop: `1px solid ${P.border}` }}>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <Users size={13} style={{ color: '#4f8ef7' }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : stats.advisees ?? 0}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: P.muted }}>
            Advisees
          </span>
        </div>
        <div className="w-px h-8" style={{ background: P.border }} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <ClipboardCheck size={13} style={{ color: P.accent }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : avgPct != null ? `${avgPct}%` : '—'}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: P.muted }}>
            Class avg
          </span>
        </div>
        <div className="w-px h-8" style={{ background: P.border }} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <Calendar size={13} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : stats.upcoming ?? 0}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: P.muted }}>
            Upcoming
          </span>
        </div>
      </div>
    </div>
  );
}

/** Compact “today’s plan” strip — replaces a large greeting (StudentHub-style date + tailored copy) */
function InstructorTodaysPlanCard({ dateLine, firstName, summaryLine, focusTip, onAssignExam }) {
  return (
    <div
      className="rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3"
      style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.accent }}>
            {dateLine}
          </p>
          <p className="text-sm font-semibold leading-tight" style={{ color: P.text }}>
            Today&apos;s plan{' '}
            <span className="font-normal" style={{ color: P.muted }}>
              · {firstName}
            </span>
          </p>
          <p className="text-xs leading-snug line-clamp-2" style={{ color: P.muted }}>
            {summaryLine}
          </p>
          <p className="text-[11px] leading-snug flex items-start gap-1.5 pt-1 mt-0.5 border-t" style={{ borderColor: P.border, color: P.tagText }}>
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-80" style={{ color: P.accent }} />
            <span>{focusTip}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onAssignExam}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{ background: P.accent, color: '#0a0a0a' }}
        >
          <FileCheck size={13} strokeWidth={2.5} />
          Assign exam
        </button>
      </div>
    </div>
  );
}

/* Circular progress ring (Operations style) */
function ProgressRing({ value, size = 40, stroke = 3, color = T.accent }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, value) / 100);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
    </svg>
  );
}

/* Pill action button (Operations style) */
function PillButton({ children, icon: Icon, onClick, variant = 'primary' }) {
  const styles = {
    primary: { background: T.gradientBtn, color: '#fff' },
    secondary: { background: 'rgba(100,170,145,0.2)', color: T.accent, border: '1px solid rgba(100,170,145,0.3)' },
    muted: { background: 'rgba(255,255,255,0.06)', color: T.text, border: '1px solid rgba(255,255,255,0.08)' },
  };
  const s = styles[variant] || styles.primary;
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90" style={s}>
      {Icon && <Icon size={18} />}
      {children}
      <ChevronRight size={16} className="opacity-70" />
    </button>
  );
}

export function InstructorDashboard({ setActiveTab, onViewStudentProfile }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Instructor';

  // Core data
  const [advisorStudents, setAdvisorStudents] = useState([]);
  const [cases, setCases] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [studentsWithExams, setStudentsWithExams] = useState(new Set());
  const [leaderboard, setLeaderboard] = useState([]);
  const [assignmentsTrend, setAssignmentsTrend] = useState([]);
  const [studentActivity, setStudentActivity] = useState([]);
  const [popularCases, setPopularCases] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [performanceDistribution, setPerformanceDistribution] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [studentLastActivity, setStudentLastActivity] = useState({});
  const [competencyGaps, setCompetencyGaps] = useState([]);
  const [passRate, setPassRate] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [noShowRate, setNoShowRate] = useState(0);
  const [selectedUpcomingId, setSelectedUpcomingId] = useState(null);
  const [avgThisWeek, setAvgThisWeek] = useState(0);
  const [avgLastWeek, setAvgLastWeek] = useState(0);

  // Assign Exam panel state
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [caseSearch, setCaseSearch] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [chartRange, setChartRange] = useState('14d');
  const [activityTab, setActivityTab] = useState('upcoming');
  const [opsTab, setOpsTab] = useState('ongoing');
  const [selectedSession, setSelectedSession] = useState(null);
  /** Right rail: toggle quick actions vs student status (same slot below profile) */
  const [instructorRailTab, setInstructorRailTab] = useState('actions');

  const formatTime = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  const fetchAllData = useCallback(async () => {
    if (!user?.id) return;

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Advisor students
    const { data: assignments } = await supabase
      .from('advisor_assignments')
      .select('student_id')
      .eq('instructor_id', user.id);
    const studentIds = (assignments || []).map((a) => a.student_id);

    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)
        .eq('role', 'student');
      setAdvisorStudents(profiles || []);
    } else {
      setAdvisorStudents([]);
    }

    // Cases
    const { data: casesData } = await supabase
      .from('cases')
      .select('id, title')
      .order('title');
    setCases(casesData || []);

    // Sessions (upcoming, exams for stats)
    const examFilter = { examiner_id: user.id };
    let sessionsRaw = [];
    const { data: byType } = await supabase
      .from('sessions')
      .select('id, start_time, status, case_id, student_id, score, case:cases(title, category)')
      .eq('examiner_id', user.id)
      .eq('session_type', 'exam');
    sessionsRaw = byType || [];
    if (sessionsRaw.length === 0) {
      const { data: byLegacy } = await supabase
        .from('sessions')
        .select('id, start_time, status, case_id, student_id, score, case:cases(title, category)')
        .eq('examiner_id', user.id)
        .eq('type', 'exam');
      sessionsRaw = byLegacy || [];
    }

    const allSessions = sessionsRaw;

    const { data: sessionsWithStudent } = await supabase
      .from('sessions')
      .select('id, start_time, status, case_id, student_id, case:cases(title), student:profiles!student_id(full_name)')
      .eq('examiner_id', user.id)
      .in('status', ['Scheduled', 'In Progress'])
      .gte('start_time', now.toISOString())
      .order('start_time', { ascending: true })
      .limit(10);

    const upcomingFormatted = (sessionsWithStudent || []).map((s) => ({
      id: s.id,
      title: s.case?.title || 'Session',
      student: s.student?.full_name || '—',
      station: '—',
      startTime: s.start_time,
      status: s.status,
    }));
    setUpcomingSessions(upcomingFormatted);

    const studentsWithExamsSet = new Set(allSessions.map((s) => s.student_id).filter(Boolean));
    setStudentsWithExams(studentsWithExamsSet);

    const allStudentIds = [...new Set(allSessions.map((s) => s.student_id).filter(Boolean))];
    let nameMap = {};
    if (allStudentIds.length > 0) {
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', allStudentIds);
      nameMap = Object.fromEntries((studentProfiles || []).map((p) => [p.id, p.full_name || 'Unknown']));
    }

    // Leaderboard (completed sessions with score)
    const completedWithScore = allSessions.filter((s) => s.status === 'Completed' && s.score != null);
    const avgByStudent = {};
    completedWithScore.forEach((s) => {
      if (!avgByStudent[s.student_id]) avgByStudent[s.student_id] = { sum: 0, count: 0 };
      avgByStudent[s.student_id].sum += s.score <= 10 ? s.score * 10 : s.score;
      avgByStudent[s.student_id].count++;
    });
    const leaderboardData = Object.entries(avgByStudent)
      .map(([id, { sum, count }]) => ({
        id,
        name: nameMap[id] || 'Unknown',
        score: Math.round(sum / count),
        count,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    setLeaderboard(leaderboardData);

    const noShowCount = allSessions.filter((s) => /no[\s-]?show/i.test(String(s.status || ''))).length;
    const completedCount = allSessions.filter((s) => s.status === 'Completed').length;
    setCompletionRate(allSessions.length ? Math.round((completedCount / allSessions.length) * 100) : 0);
    setNoShowRate(allSessions.length ? Math.round((noShowCount / allSessions.length) * 100) : 0);
    const passCount = completedWithScore.filter((s) => {
      const pct = s.score <= 10 ? s.score * 10 : s.score;
      return pct >= 50;
    }).length;
    setPassRate(completedWithScore.length ? Math.round((passCount / completedWithScore.length) * 100) : 0);

    const domainScores = {};
    completedWithScore.forEach((s) => {
      const domain = s.case?.category || 'General';
      const pct = s.score <= 10 ? s.score * 10 : s.score;
      if (!domainScores[domain]) domainScores[domain] = { total: 0, count: 0 };
      domainScores[domain].total += pct;
      domainScores[domain].count += 1;
    });
    const gaps = Object.entries(domainScores)
      .map(([domain, v]) => {
        const avg = v.count ? Math.round(v.total / v.count) : 0;
        return { domain, avg, gap: Math.max(0, 100 - avg) };
      })
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 4);
    setCompetencyGaps(gaps);

    // Assignments trend (last 14 days)
    const dayCounts = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (13 - i));
      dayCounts[d.toISOString().split('T')[0]] = 0;
    }
    allSessions.forEach((s) => {
      const key = s.start_time ? new Date(s.start_time).toISOString().split('T')[0] : null;
      if (key && dayCounts[key] !== undefined) dayCounts[key]++;
    });
    setAssignmentsTrend(
      Object.entries(dayCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date: date.slice(5), count }))
    );

    // Student activity
    const sc = {};
    allSessions.forEach((s) => {
      sc[s.student_id] = (sc[s.student_id] || 0) + 1;
    });
    const sa = Object.entries(sc)
      .map(([id, count]) => ({ id, name: nameMap[id] || 'Unknown', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    setStudentActivity(sa);

    // Popular cases
    const pc = {};
    allSessions.forEach((s) => {
      const name = s.case?.title || 'Unknown';
      pc[name] = (pc[name] || 0) + 1;
    });
    setPopularCases(
      Object.entries(pc)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );

    // Performance distribution (0-20, 20-40, 40-60, 60-80, 80-100)
    const buckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    completedWithScore.forEach((s) => {
      const pct = s.score <= 10 ? s.score * 10 : s.score;
      if (pct <= 20) buckets['0-20']++;
      else if (pct <= 40) buckets['21-40']++;
      else if (pct <= 60) buckets['41-60']++;
      else if (pct <= 80) buckets['61-80']++;
      else buckets['81-100']++;
    });
    setPerformanceDistribution(
      Object.entries(buckets).map(([range, count]) => ({ range, count }))
    );

    // Performance trend (avg per week, last 4 weeks)
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 28);
    const weeklyAvg = {};
    for (let w = 0; w < 4; w++) {
      const start = new Date(weekAgo);
      start.setDate(start.getDate() + w * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const weekSessions = completedWithScore.filter((s) => {
        const t = new Date(s.start_time).getTime();
        return t >= start.getTime() && t < end.getTime();
      });
      const avg = weekSessions.length
        ? Math.round(weekSessions.reduce((a, x) => a + (x.score <= 10 ? x.score * 10 : x.score), 0) / weekSessions.length)
        : 0;
      weeklyAvg[start.toISOString().slice(0, 10)] = avg;
    }
    setPerformanceTrend(
      Object.entries(weeklyAvg)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, avg]) => ({ week: week.slice(5), avg }))
    );

    // Last activity per student (advisor students)
    const lastByStudent = {};
    allSessions.forEach((s) => {
      if (!s.student_id || !s.start_time) return;
      const t = new Date(s.start_time).getTime();
      if (!lastByStudent[s.student_id] || lastByStudent[s.student_id] < t) {
        lastByStudent[s.student_id] = t;
      }
    });
    setStudentLastActivity(lastByStudent);

    // This week vs last week avg (for "performance dropped" insight)
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const thisWeekSessions = completedWithScore.filter(
      (s) => new Date(s.start_time) >= thisWeekStart
    );
    const lastWeekSessions = completedWithScore.filter(
      (s) => {
        const t = new Date(s.start_time);
        return t >= lastWeekStart && t < thisWeekStart;
      }
    );
    const twAvg = thisWeekSessions.length
      ? Math.round(thisWeekSessions.reduce((a, x) => a + (x.score <= 10 ? x.score * 10 : x.score), 0) / thisWeekSessions.length)
      : 0;
    const lwAvg = lastWeekSessions.length
      ? Math.round(lastWeekSessions.reduce((a, x) => a + (x.score <= 10 ? x.score * 10 : x.score), 0) / lastWeekSessions.length)
      : 0;
    setAvgThisWeek(twAvg);
    setAvgLastWeek(lwAvg);

    // Calendar data (exams per day this month)
    const cal = {};
    const thisMonth = now.getMonth();
    allSessions
      .filter((s) => s.start_time && new Date(s.start_time) >= now)
      .forEach((s) => {
        const d = new Date(s.start_time);
        if (d.getMonth() === thisMonth) {
          const key = d.getDate();
          cal[key] = (cal[key] || 0) + 1;
        }
      });
    setCalendarData(cal);

    // Recent assignments
    const recent = allSessions
      .filter((s) => s.start_time && new Date(s.start_time) >= now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 5);
    setRecentAssignments(recent.map((s) => ({ title: s.case?.title || 'Unknown', date: s.start_time })));

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  useEffect(() => {
    setSelectedStudents(advisorStudents.map((s) => s.id));
  }, [advisorStudents]);

  useEffect(() => {
    if (!selectedUpcomingId && upcomingSessions.length > 0) {
      setSelectedUpcomingId(upcomingSessions[0].id);
    }
  }, [upcomingSessions, selectedUpcomingId]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return advisorStudents;
    const q = studentSearch.toLowerCase();
    return advisorStudents.filter((s) => (s.full_name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
  }, [advisorStudents, studentSearch]);

  const filteredCases = useMemo(() => {
    if (!caseSearch.trim()) return cases;
    const q = caseSearch.toLowerCase();
    return cases.filter((c) => (c.title || '').toLowerCase().includes(q));
  }, [cases, caseSearch]);

  const studentsWithoutExam = advisorStudents.filter((s) => !studentsWithExams.has(s.id));
  const avgPerformance = leaderboard.length > 0 ? Math.round(leaderboard.reduce((a, b) => a + b.score, 0) / leaderboard.length) : 0;
  const performanceDropped = avgLastWeek > 0 && avgThisWeek < avgLastWeek && (avgLastWeek - avgThisWeek) >= 5;
  const mostPracticedCase = popularCases[0];
  const inactiveStudents = useMemo(() => {
    const now = Date.now();
    return advisorStudents
      .map((s) => {
        const last = studentLastActivity[s.id];
        if (!last) return { ...s, daysInactive: 999 };
        const days = Math.floor((now - last) / (24 * 60 * 60 * 1000));
        return { ...s, daysInactive: days };
      })
      .filter((s) => s.daysInactive >= 7)
      .sort((a, b) => b.daysInactive - a.daysInactive);
  }, [advisorStudents, studentLastActivity]);

  const minDate = new Date().toISOString().split('T')[0];
  const minTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
  const canAssign = selectedStudents.length > 0 && selectedCaseIds.length > 0 && examDate && examTime && !assignSubmitting;

  const handleAssignExam = async () => {
    if (!canAssign) return;
    setAssignSubmitting(true);
    setAssignError('');
    try {
      const scheduledAt = new Date(`${examDate}T${examTime}`);
      const scheduledAtIso = scheduledAt.toISOString();

      let existing = [];
      try {
        const { data } = await supabase
          .from('sessions')
          .select('student_id, case_id')
          .eq('session_type', 'exam')
          .eq('start_time', scheduledAtIso)
          .in('student_id', selectedStudents)
          .in('case_id', selectedCaseIds)
          .neq('status', 'Cancelled');
        existing = data || [];
      } catch {
        const { data } = await supabase
          .from('sessions')
          .select('student_id, case_id')
          .eq('type', 'exam')
          .eq('start_time', scheduledAtIso)
          .in('student_id', selectedStudents)
          .in('case_id', selectedCaseIds)
          .neq('status', 'Cancelled');
        existing = data || [];
      }
      const existingSet = new Set(existing.map((s) => `${s.student_id}:${s.case_id}`));
      const inserts = [];
      for (const sid of selectedStudents) {
        for (const cid of selectedCaseIds) {
          if (!existingSet.has(`${sid}:${cid}`)) {
            inserts.push({
              student_id: sid,
              examiner_id: user.id,
              case_id: cid,
              start_time: scheduledAtIso,
              status: 'Scheduled',
            });
          }
        }
      }
      if (inserts.length === 0) {
        setAssignError('All selected students already have these exams at this time.');
        setAssignSubmitting(false);
        return;
      }
      const { error } = await supabase.from('sessions').insert(inserts.map((r) => ({ ...r, session_type: 'exam' })));
      if (error) {
        const { error: e2 } = await supabase.from('sessions').insert(inserts.map((r) => ({ ...r, type: 'exam' })));
        if (e2) throw e2;
      }
      setSelectedCaseIds([]);
      setExamDate('');
      setExamTime('');
      fetchAllData();
    } catch (err) {
      setAssignError(err?.message || 'Failed to assign.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleCase = (id) => {
    setSelectedCaseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const activeSessions = upcomingSessions.filter((s) => s.status === 'In Progress');
  const scheduledSessions = upcomingSessions.filter((s) => s.status === 'Scheduled');
  const completedList = recentAssignments.map((r, i) => ({ id: `r-${i}`, title: r.title, student: '—', startTime: r.date, status: 'Completed' }));
  const opsList = opsTab === 'ongoing' ? activeSessions : opsTab === 'scheduled' ? scheduledSessions : completedList;
  const selectedSessionData = selectedSession ? [...upcomingSessions, ...completedList].find((s) => s.id === selectedSession) : opsList[0];
  const INPUT_CLASS = 'w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all';

  const pieData = popularCases.map((c, i) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
    value: c.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();

  if (loading) {
    return (
      <div style={{ background: P.page, height: '100%' }} className="min-h-0">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: T.accent }} />
        </div>
      </div>
    );
  }

  const hasNoStudents = advisorStudents.length === 0;
  const hasNoActivity = assignmentsTrend.every((d) => d.count === 0) && leaderboard.length === 0;
  const shouldHighlightAssign = studentsWithoutExam.length > 0 && advisorStudents.length > 0;

  const instructorProfileStats = {
    advisees: advisorStudents.length,
    avgClassPct: avgPerformance > 0 ? avgPerformance : null,
    upcoming: scheduledSessions.length,
  };
  const permissionItems = [
    { label: 'Run exams', enabled: !!profile?.can_exam },
    { label: 'Hardware controls', enabled: !!profile?.has_hardware },
    { label: 'Manage students', enabled: true },
    { label: 'Case management', enabled: true },
  ];
  const quickCommands = [
    { label: 'Start session', onClick: () => setActiveTab('sessions'), icon: Play, helper: 'Launch or continue sessions' },
    { label: 'Assign exam', onClick: () => setActiveTab('assign-exam'), icon: FileCheck, helper: 'Create student assessments' },
    { label: 'Open students', onClick: () => setActiveTab('students'), icon: Users, helper: 'Review advisees and profiles' },
    { label: 'Hardware diagnostics', onClick: () => setActiveTab('hardware'), icon: Activity, helper: 'Check station readiness' },
  ];
  const compactAssignments = assignmentsTrend.slice(-7).map((item) => ({ label: item.date, value: item.count }));
  const compactPerformance = performanceTrend.slice(-7).map((item) => ({ label: item.week, value: item.avg }));
  const completionTrend = assignmentsTrend.slice(-7).map((item) => {
    const total = item.count || 0;
    const completedEstimate = Math.max(0, total - 1);
    const completionPct = total > 0 ? Math.round((completedEstimate / total) * 100) : 0;
    return { label: item.date, value: completionPct };
  });
  const averageDelta = compactPerformance.length >= 2
    ? compactPerformance[compactPerformance.length - 1].value - compactPerformance[compactPerformance.length - 2].value
    : 0;
  const assignmentsDelta = compactAssignments.length >= 2
    ? compactAssignments[compactAssignments.length - 1].value - compactAssignments[compactAssignments.length - 2].value
    : 0;
  const completionDelta = completionTrend.length >= 2
    ? completionTrend[completionTrend.length - 1].value - completionTrend[completionTrend.length - 2].value
    : 0;
  const selectedUpcoming = upcomingSessions.find((s) => s.id === selectedUpcomingId) || upcomingSessions[0] || null;
  const atRiskStudents = inactiveStudents.slice(0, 4).map((s) => ({
    id: s.id,
    name: s.full_name || s.email || 'Student',
    reason: s.daysInactive === 999 ? 'No recorded activity' : `${s.daysInactive} days inactive`,
  }));
  const trackedHours = assignmentsTrend.reduce((sum, item) => sum + (item.count || 0), 0);
  const performanceChartData = assignmentsTrend.map((item) => {
    const completionPoint = completionTrend.find((c) => c.label === item.date);
    return {
      date: item.date,
      assignments: item.count || 0,
      completion: completionPoint?.value || 0,
    };
  });
  const readinessChecks = [
    {
      label: 'Students assigned exams',
      ready: studentsWithoutExam.length === 0 || advisorStudents.length === 0,
      onReview: () => setActiveTab('assign-exam'),
    },
    {
      label: 'At least one upcoming session',
      ready: scheduledSessions.length > 0,
      onReview: () => setActiveTab('sessions'),
    },
    {
      label: 'No high inactivity alerts',
      ready: inactiveStudents.length < 3,
      onReview: () => setActiveTab('students'),
    },
  ];
  const readinessScore = Math.round((readinessChecks.filter((i) => i.ready).length / readinessChecks.length) * 100);
  const cardHover = { y: -4, scale: 1.02, boxShadow: '0 12px 26px rgba(0,0,0,0.24)' };
  const cardTransition = { duration: 0.26, ease: 'easeOut' };
  const entrance = (delay = 0) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: 'easeOut', delay },
  });

  const studentStatusBuckets = (() => {
    const now = Date.now();
    let active = 0;
    let warning = 0;
    let inactive = 0;
    advisorStudents.forEach((s) => {
      const last = studentLastActivity[s.id];
      if (!last) {
        inactive += 1;
        return;
      }
      const days = Math.floor((now - last) / (24 * 60 * 60 * 1000));
      if (days <= 2) active += 1;
      else if (days <= 7) warning += 1;
      else inactive += 1;
    });
    return { active, warning, inactive };
  })();

  const sessionTypeData = [
    {
      name: 'Practice',
      value: Math.max(0, (assignmentsTrend.reduce((sum, item) => sum + (item.count || 0), 0)) - scheduledSessions.length),
      fill: '#60a5fa',
    },
    { name: 'Exam', value: Math.max(0, scheduledSessions.length), fill: '#6ee7b7' },
    { name: 'Review', value: Math.max(0, recentAssignments.length), fill: '#f59e0b' },
  ].filter((item) => item.value > 0);

  const latestActivities = [
    ...recentAssignments.slice(0, 4).map((entry) => ({
      id: `assign-${entry.date}`,
      title: `Assigned ${entry.title}`,
      when: formatTime(entry.date),
      action: 'Assignment',
    })),
    ...upcomingSessions.slice(0, 3).map((entry) => ({
      id: `upcoming-${entry.id}`,
      title: `Scheduled ${entry.title} for ${entry.student}`,
      when: formatTime(entry.startTime),
      action: 'Session',
    })),
  ].slice(0, 6);

  const firstName = (displayName || 'Instructor').trim().split(/\s+/)[0];
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const sessionsScheduledToday = upcomingSessions.filter((s) => {
    const t = new Date(s.startTime);
    return t >= todayStart && t < todayEnd;
  });
  const sortedToday = [...sessionsScheduledToday].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  const nextSessionToday = sortedToday[0];
  const planSummaryLine = (() => {
    const parts = [];
    if (activeSessions.length > 0) parts.push(`${activeSessions.length} in progress`);
    if (sessionsScheduledToday.length > 0) {
      parts.push(`${sessionsScheduledToday.length} scheduled`);
    } else {
      parts.push('Clear schedule');
    }
    if (nextSessionToday) parts.push(`Next ${formatTime(nextSessionToday.startTime)}`);
    if (studentsWithoutExam.length > 0) {
      parts.push(`${studentsWithoutExam.length} need exam${studentsWithoutExam.length === 1 ? '' : 's'}`);
    }
    return parts.join(' · ');
  })();
  const focusTip = INSTRUCTOR_PLAN_TIPS[new Date().getDay() % INSTRUCTOR_PLAN_TIPS.length];

  return (
    <div className="w-full max-w-[min(100%,1800px)] mx-auto min-h-0 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_min(380px,36vw)] gap-6 lg:gap-8 lg:items-start min-h-0">
        <div className="space-y-6 min-h-0 min-w-0 max-lg:order-2">
      <InstructorTodaysPlanCard
        dateLine={dateLine}
        firstName={firstName}
        summaryLine={planSummaryLine}
        focusTip={focusTip}
        onAssignExam={() => setActiveTab('assign-exam')}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assigned Students', value: advisorStudents.length, icon: Users, color: '#60a5fa', sub: 'Current advisees' },
          { label: 'Upcoming Sessions', value: scheduledSessions.length, icon: Calendar, color: '#a78bfa', sub: 'Today and next' },
          { label: 'Pending Requests', value: studentsWithoutExam.length, icon: AlertCircle, color: '#f59e0b', sub: 'Need exam assignment' },
          { label: 'Instructor Performance', value: avgPerformance > 0 ? `${avgPerformance}%` : '—', icon: Award, color: '#6ee7b7', sub: 'Cohort average score' },
        ].map((item) => (
          <motion.div
            key={item.label}
            className="rounded-2xl p-5 border"
            style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: P.text }}>{item.value}</p>
                <p className="text-xs mt-1" style={{ color: P.muted }}>{item.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}22` }}>
                <item.icon size={18} style={{ color: item.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 border lg:col-span-1" style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: P.text }}>Sessions Over Time</h3>
            <span className="text-xs" style={{ color: P.muted }}>Weekly</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={assignmentsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip contentStyle={{ background: '#111', border: `1px solid ${P.border}`, borderRadius: 10 }} />
                <Line type="monotone" dataKey="count" stroke={P.accent} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl p-5 border lg:col-span-1" style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: P.text }}>Performance Distribution</h3>
            <span className="text-xs" style={{ color: P.muted }}>Students</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="range" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip contentStyle={{ background: '#111', border: `1px solid ${P.border}`, borderRadius: 10 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {performanceDistribution.map((entry, idx) => (
                    <Cell key={`${entry.range}-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl p-5 border lg:col-span-1" style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: P.text }}>Session Types</h3>
            <span className="text-xs" style={{ color: P.muted }}>Mix</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sessionTypeData.length ? sessionTypeData : [{ name: 'No data', value: 1, fill: '#3f3f46' }]} dataKey="value" nameKey="name" innerRadius={45} outerRadius={74} paddingAngle={3}>
                  {(sessionTypeData.length ? sessionTypeData : [{ name: 'No data', value: 1, fill: '#3f3f46' }]).map((entry, idx) => (
                    <Cell key={`${entry.name}-${idx}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#111', border: `1px solid ${P.border}`, borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

          <div className="rounded-2xl border overflow-hidden" style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: P.border }}>
              <h2 className="text-sm font-semibold" style={{ color: P.text }}>Assigned Students</h2>
              <button className="text-xs" style={{ color: P.accent }} onClick={() => setActiveTab('students')}>Open students</button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {advisorStudents.length === 0 ? (
                <div className="p-5 text-sm" style={{ color: P.muted }}>No assigned students yet.</div>
              ) : (
                advisorStudents.map((student) => {
                  const last = studentLastActivity[student.id];
                  const days = last ? Math.floor((Date.now() - last) / (24 * 60 * 60 * 1000)) : null;
                  const status = days == null ? 'Inactive' : days <= 2 ? 'Active' : days <= 7 ? 'At Risk' : 'Inactive';
                  const statusColor = status === 'Active' ? '#6ee7b7' : status === 'At Risk' ? '#fcd34d' : '#f87171';
                  const progress = leaderboard.find((l) => l.id === student.id)?.score ?? 0;
                  return (
                    <button
                      key={student.id}
                      className="w-full px-5 py-3 flex items-center gap-3 text-left transition-colors hover:bg-white/5"
                      onClick={() => onViewStudentProfile?.(student)}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: P.text }}>
                        {(student.full_name || student.email || 'S').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: P.text }}>{student.full_name || student.email || 'Student'}</p>
                        <p className="text-xs truncate" style={{ color: P.muted }}>
                          Last activity: {last ? formatTime(new Date(last).toISOString()) : 'No record'}
                        </p>
                        <div className="h-1.5 mt-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, progress)}%`, background: 'linear-gradient(90deg, #60a5fa, #6ee7b7)' }} />
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-full" style={{ color: statusColor, background: `${statusColor}22` }}>
                        {status}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: P.border }}>
              <h2 className="text-sm font-semibold" style={{ color: P.text }}>Upcoming Sessions</h2>
              <button className="text-xs" style={{ color: P.accent }} onClick={() => setActiveTab('sessions')}>View all</button>
            </div>
            <div className="divide-y" style={{ borderColor: P.border }}>
              {upcomingSessions.length === 0 ? (
                <div className="p-5 text-sm" style={{ color: P.muted }}>No upcoming sessions.</div>
              ) : (
                upcomingSessions.slice(0, 6).map((session) => (
                  <div key={session.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors">
                    <div>
                      <p className="text-sm font-medium" style={{ color: P.text }}>{session.title}</p>
                      <p className="text-xs" style={{ color: P.muted }}>{formatTime(session.startTime)} · {session.student}</p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: session.status === 'In Progress' ? 'rgba(96,165,250,0.18)' : 'rgba(110,231,183,0.16)', color: session.status === 'In Progress' ? '#60a5fa' : '#6ee7b7' }}>
                      {session.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: P.border }}>
              <h2 className="text-sm font-semibold" style={{ color: P.text }}>Recent Activity</h2>
            </div>
            <div className="divide-y" style={{ borderColor: P.border }}>
              {latestActivities.length === 0 ? (
                <div className="p-5 text-sm" style={{ color: P.muted }}>No recent activity yet.</div>
              ) : (
                latestActivities.map((activity) => (
                  <div key={activity.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: P.text }}>{activity.title}</p>
                      <p className="text-xs" style={{ color: P.muted }}>{activity.when}</p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: 'rgba(167,139,250,0.16)', color: '#c4b5fd' }}>
                      {activity.action}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6 max-lg:order-1 lg:sticky lg:top-4 lg:self-start z-[1]">
          <InstructorProfileCard
            displayName={displayName}
            stats={instructorProfileStats}
            loading={false}
            onGoToProfile={() => setActiveTab('profile')}
          />

          <div className="rounded-2xl border overflow-hidden" style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}>
            <div className="flex p-1 gap-0.5" style={{ borderBottom: `1px solid ${P.border}` }}>
              <button
                type="button"
                onClick={() => setInstructorRailTab('actions')}
                className={cn(
                  'flex-1 rounded-lg py-2 px-2 text-xs font-semibold transition-colors',
                  instructorRailTab === 'actions' ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                )}
                style={{ color: instructorRailTab === 'actions' ? P.text : P.muted }}
              >
                Quick actions
              </button>
              <button
                type="button"
                onClick={() => setInstructorRailTab('status')}
                className={cn(
                  'flex-1 rounded-lg py-2 px-2 text-xs font-semibold transition-colors',
                  instructorRailTab === 'status' ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                )}
                style={{ color: instructorRailTab === 'status' ? P.text : P.muted }}
              >
                Student status
              </button>
            </div>
            <div className="p-4">
              {instructorRailTab === 'actions' ? (
                <QuickActions
                  onAssignExam={() => setActiveTab('assign-exam')}
                  onManageStudents={() => setActiveTab('students')}
                  onViewAnalytics={() => setActiveTab('cases')}
                  onRunDiagnostics={() => setActiveTab('hardware')}
                  onOpenSettings={() => setActiveTab('settings')}
                  onOpenProfile={() => setActiveTab('profile')}
                  variant="glass"
                  layout="grid"
                  embedded
                  highlightAssign={shouldHighlightAssign}
                />
              ) : (
                <div className="space-y-2.5 pt-0.5">
                  <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: P.muted }}>
                    Roster breakdown
                  </p>
                  {[
                    { label: 'Active', value: studentStatusBuckets.active, color: '#6ee7b7' },
                    { label: 'At Risk', value: studentStatusBuckets.warning, color: '#fcd34d' },
                    { label: 'Inactive', value: studentStatusBuckets.inactive, color: '#f87171' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-2">
                      <span className="text-xs" style={{ color: P.muted }}>{item.label}</span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
