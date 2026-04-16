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
  RefreshCw,
  Play,
  Plus,
  Maximize2,
  Award,
  FileText,
  UserX,
  Sparkles,
  MoreHorizontal,
  ClipboardCheck,
  Square,
  CheckSquare2,
  Trash2,
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
const GLASS_STRONG = {
  background: '#060909',
  border: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.45), 0 20px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
};

/** Profile card (right rail) — mirrors StudentHub `StudentProfileCard` for instructors */
function InstructorProfileCard({ displayName, stats, loading, onGoToProfile, suggestions = [] }) {
  const initials = (displayName || '?').slice(0, 2).toUpperCase();
  const avgPct = stats.avgClassPct != null ? Math.min(100, Math.max(0, stats.avgClassPct)) : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [menuOpen]);

  return (
    <div
      className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5"
      style={{ ...GLASS_STRONG }}
    >
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: `1px solid ${P.border}` }}>
        <span className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: P.muted }}>
          Instructor Profile
        </span>
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
              style={{ background: 'rgba(10,14,20,0.92)', border: `1px solid ${P.border}`, boxShadow: P.shadow, backdropFilter: 'blur(10px)' }}
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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onGoToProfile?.()}
          className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
          style={{ outline: 'none' }}
          aria-label="Go to profile"
        >
          <div className="w-full h-full rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(110,231,183,0.2))', color: '#d1fae5', border: '1px solid rgba(110,231,183,0.28)' }}>
            {initials}
          </div>
        </button>
        <div className="min-w-0">
          <p className="font-semibold text-base leading-tight truncate" style={{ color: P.text }}>
            {displayName}
          </p>
          <p className="text-xs mt-1" style={{ color: P.muted }}>
            Clinical Instructor
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
            <p className="text-[11px]" style={{ color: P.muted }}>Online</p>
          </div>
        </div>
        <div className="ml-auto text-right">
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-md"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.28)', color: '#93c5fd' }}
          >
            Instructor
          </span>
          <p className="text-[11px] mt-2" style={{ color: P.muted }}>
            {loading ? '—' : `${stats.advisees ?? 0} advisees`}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-2.5" style={{ color: '#93c5fd' }}>
          Suggestions
        </p>
        <div className="space-y-2">
          {suggestions.slice(0, 2).map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className="w-full text-left rounded-lg px-2.5 py-2.5 transition-colors hover:bg-white/5"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(168,85,247,0.1))', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}
            >
              <p className="text-xs font-semibold" style={{ color: P.text }}>{item.title}</p>
              <p className="text-[11px] mt-0.5" style={{ color: P.muted }}>{item.note}</p>
            </button>
          ))}
          {suggestions.length === 0 && (
            <div className="rounded-lg px-2.5 py-2 text-xs" style={{ color: P.muted, background: 'rgba(255,255,255,0.03)' }}>
              No suggestions available.
            </div>
          )}
        </div>
      </div>

      <div
        className="mt-5 grid grid-cols-3 gap-2 pt-4"
        style={{ borderTop: `1px solid ${P.border}` }}
      >
        <div className="rounded-lg px-2 py-2 text-center" style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)' }}>
          <div className="flex items-center justify-center gap-1">
            <Users size={13} style={{ color: '#4f8ef7' }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : stats.advisees ?? 0}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: '#93c5fd' }}>
            Advisees
          </span>
        </div>
        <div className="rounded-lg px-2 py-2 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center justify-center gap-1">
            <ClipboardCheck size={13} style={{ color: P.accent }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : avgPct != null ? `${avgPct}%` : '—'}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: '#6ee7b7' }}>
            Class avg
          </span>
        </div>
        <div className="rounded-lg px-2 py-2 text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center justify-center gap-1">
            <Calendar size={13} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : stats.upcoming ?? 0}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: '#fcd34d' }}>
            Upcoming
          </span>
        </div>
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
  const [todoInput, setTodoInput] = useState('');
  const [todoItems, setTodoItems] = useState([]);
  const [chartRange, setChartRange] = useState('14d');
  const [activityTab, setActivityTab] = useState('upcoming');
  const [opsTab, setOpsTab] = useState('ongoing');
  const [selectedSession, setSelectedSession] = useState(null);

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

  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`medupal_instructor_todos_${user.id}`);
      if (raw) setTodoItems(JSON.parse(raw));
    } catch (_) {
      setTodoItems([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`medupal_instructor_todos_${user.id}`, JSON.stringify(todoItems));
    } catch (_) {}
  }, [todoItems, user?.id]);

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
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
  const handleAddTodo = () => {
    const text = todoInput.trim();
    if (!text) return;
    setTodoItems((prev) => [{ id: `${Date.now()}`, text, done: false }, ...prev]);
    setTodoInput('');
  };
  const handleToggleTodo = (id) => {
    setTodoItems((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };
  const handleDeleteTodo = (id) => {
    setTodoItems((prev) => prev.filter((t) => t.id !== id));
  };
  const instructorSuggestions = [
    studentsWithoutExam.length > 0
      ? {
          title: `Assign exams to ${studentsWithoutExam.length} student${studentsWithoutExam.length !== 1 ? 's' : ''}`,
          note: 'Keep the weekly schedule complete and track readiness.',
          onClick: () => setActiveTab('assign-exam'),
        }
      : {
          title: 'Review next upcoming sessions',
          note: 'Validate cases and timing before your next block.',
          onClick: () => setActiveTab('sessions'),
        },
    inactiveStudents.length > 0
      ? {
          title: `Follow up ${inactiveStudents.length} inactive student${inactiveStudents.length !== 1 ? 's' : ''}`,
          note: 'Reach out to prevent drop-off in performance.',
          onClick: () => setActiveTab('students'),
        }
      : {
          title: 'Open analytics for performance trends',
          note: 'Check cohort progression and identify weak areas.',
          onClick: () => setActiveTab('cases'),
        },
  ];
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

  return (
    <div className="min-h-0 h-full w-full">
      <div className="h-full min-h-0">
        <div className="h-full min-h-0 space-y-5">
          <QuickActions
            onAssignExam={() => setActiveTab('assign-exam')}
            onCreateCase={() => {
              try { sessionStorage.setItem('medupal_open_create_case', '1'); } catch (_) {}
              setActiveTab('cases');
            }}
            onManageStudents={() => setActiveTab('students')}
            onViewAnalytics={() => setActiveTab('cases')}
            onRunDiagnostics={() => setActiveTab('hardware')}
            onOpenSettings={() => setActiveTab('settings')}
            onOpenProfile={() => setActiveTab('profile')}
            variant="glass"
            highlightAssign={shouldHighlightAssign}
            iconOnly
            oneRow
          />

        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_0.9fr] gap-6 h-[calc(100%-6rem)] min-h-0">
          <div className="min-h-0 overflow-y-auto no-scrollbar space-y-5 pr-1">
            <motion.section
              className="rounded-2xl p-5 md:p-6"
              style={{
                ...GLASS_STRONG,
              }}
              {...entrance(0)}
              whileHover={cardHover}
              whileTap={{ scale: 0.998 }}
              transition={cardTransition}
              layout
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: T.text }}>Today&apos;s Teaching Plan</h1>
                  <p className="text-sm mt-1" style={{ color: T.muted }}>
                    Upcoming sessions, readiness checks, and your next teaching actions.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: T.muted }}>Readiness</p>
                  <p className="text-xl font-semibold" style={{ color: readinessScore >= 67 ? T.accent : '#fcd34d' }}>{readinessScore}%</p>
                  <button
                    type="button"
                    onClick={fetchAllData}
                    className="mt-2 w-9 h-9 rounded-lg flex items-center justify-center ml-auto transition-colors hover:bg-white/5"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    title="Refresh plan"
                  >
                    <RefreshCw size={15} style={{ color: T.text }} />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div
                  className="rounded-xl p-4 transition-all duration-300 hover:border-emerald-400/30"
                  style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <p className="text-xs uppercase tracking-wider mb-3" style={{ color: T.muted }}>Upcoming timeline</p>
                  <div className="space-y-2.5">
                    <AnimatePresence mode="popLayout">
                    {upcomingSessions.slice(0, 3).map((s, idx) => (
                      <motion.button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedUpcomingId(s.id)}
                        className="w-full text-left flex items-start gap-3 transition-opacity"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.24 }}
                        whileHover={{ x: 3, backgroundColor: 'rgba(255,255,255,0.03)' }}
                      >
                        <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: idx === 0 ? T.accent : 'rgba(255,255,255,0.35)' }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: T.text }}>{s.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: T.muted }}>{s.student} · {formatTime(s.startTime)}</p>
                        </div>
                      </motion.button>
                    ))}
                    </AnimatePresence>
                    {upcomingSessions.length === 0 && (
                      <p className="text-sm" style={{ color: T.muted }}>No upcoming sessions scheduled.</p>
                    )}
                  </div>
                  {selectedUpcoming && (
                    <div className="mt-3 rounded-lg p-2.5" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-[11px] uppercase tracking-wider" style={{ color: T.muted }}>Session drilldown</p>
                      <p className="text-sm font-semibold mt-1" style={{ color: T.text }}>{selectedUpcoming.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.muted }}>{selectedUpcoming.student} · {selectedUpcoming.status}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('sessions')}
                          className="text-[11px] px-2 py-1 rounded-md"
                          style={{ color: T.text, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}
                        >
                          Open session
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('assign-exam')}
                          className="text-[11px] px-2 py-1 rounded-md"
                          style={{ color: T.accent, border: '1px solid rgba(110,231,183,0.25)', background: 'rgba(110,231,183,0.08)' }}
                        >
                          Reassign
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="rounded-xl p-4 transition-all duration-300 hover:border-amber-400/30"
                  style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <p className="text-xs uppercase tracking-wider mb-3" style={{ color: T.muted }}>Readiness checklist</p>
                  <div className="space-y-2.5">
                    <AnimatePresence mode="popLayout">
                    {readinessChecks.map((item) => (
                      <motion.div
                        key={item.label}
                        className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22 }}
                        whileHover={{ x: 3, backgroundColor: 'rgba(255,255,255,0.04)' }}
                        layout
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <motion.span
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={item.ready ? { opacity: 1, scale: 1 } : { opacity: 1, scale: [1, 1.08, 1] }}
                            transition={item.ready ? { duration: 0.24 } : { duration: 1.2, repeat: Infinity, repeatType: 'loop' }}
                          >
                            {item.ready ? (
                              <CheckCircle2 size={14} style={{ color: '#6ee7b7' }} />
                            ) : (
                              <AlertCircle size={14} style={{ color: '#fcd34d' }} />
                            )}
                          </motion.span>
                          <p className="text-sm truncate" style={{ color: T.text }}>{item.label}</p>
                        </div>
                        <motion.button
                          type="button"
                          onClick={() => item.onReview()}
                          className="text-xs px-2 py-0.5 rounded-full font-medium transition-all hover:opacity-90"
                          style={{ background: item.ready ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)', color: item.ready ? '#6ee7b7' : '#fcd34d' }}
                          whileHover={{ scale: 1.06, filter: 'brightness(1.08)' }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          {item.ready ? 'Ready' : 'Review'}
                        </motion.button>
                      </motion.div>
                    ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <motion.button
                  type="button"
                  onClick={() => setActiveTab('sessions')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-transform hover:scale-[1.03]"
                  style={{ background: T.gradientBtn, color: '#fff' }}
                  whileHover={{ scale: 1.04, filter: 'brightness(1.08)' }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  Start
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-transform hover:scale-[1.03]"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', color: T.text, background: 'rgba(255,255,255,0.03)' }}
                  whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  Review
                </motion.button>
              </div>

              <div className="mt-5 rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-xs uppercase tracking-wider" style={{ color: T.muted }}>To-Do List</p>
                  <p className="text-xs" style={{ color: T.muted }}>
                    {todoItems.filter((t) => t.done).length}/{todoItems.length} completed
                  </p>
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={todoInput}
                    onChange={(e) => setTodoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTodo();
                    }}
                    placeholder="Add a task for today..."
                    className="flex-1 h-9 px-3 rounded-lg text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: T.text }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTodo}
                    className="h-9 px-3 rounded-lg text-sm font-medium"
                    style={{ background: T.gradientBtn, color: '#fff' }}
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                  {todoItems.map((item) => (
                    <motion.div
                      key={item.id}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      whileHover={{ x: 2, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      layout
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTodo(item.id)}
                        className="shrink-0"
                        aria-label={item.done ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {item.done ? (
                          <CheckSquare2 size={16} style={{ color: T.accent }} />
                        ) : (
                          <Square size={16} style={{ color: T.muted }} />
                        )}
                      </button>
                      <p
                        className="text-sm flex-1"
                        style={{
                          color: item.done ? T.muted : T.text,
                          textDecoration: item.done ? 'line-through' : 'none',
                        }}
                      >
                        {item.text}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDeleteTodo(item.id)}
                        className="shrink-0 opacity-75 hover:opacity-100"
                        aria-label="Delete task"
                      >
                        <Trash2 size={14} style={{ color: '#f87171' }} />
                      </button>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                  {todoItems.length === 0 && (
                    <p className="text-sm px-1" style={{ color: T.muted }}>
                      No tasks yet. Add your first teaching task above.
                    </p>
                  )}
                </div>
              </div>
            </motion.section>

            <motion.section
              className="rounded-2xl p-5 md:p-6"
              style={GLASS_STRONG}
              {...entrance(0.1)}
              whileHover={cardHover}
              whileTap={{ scale: 0.998 }}
              transition={cardTransition}
              layout
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: T.text }}>Competency Gap Heatmap</h4>
                  <div className="space-y-2.5">
                    {(competencyGaps.length > 0 ? competencyGaps : [
                      { domain: 'History Taking', avg: 78, gap: 22 },
                      { domain: 'Communication', avg: 82, gap: 18 },
                      { domain: 'Examination', avg: 74, gap: 26 },
                      { domain: 'Clinical Reasoning', avg: 70, gap: 30 },
                    ]).map((g) => (
                      <div key={g.domain}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span style={{ color: T.text }}>{g.domain}</span>
                          <span style={{ color: '#fcd34d' }}>Gap {g.gap}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${g.gap}%`, background: 'linear-gradient(90deg, rgba(245,158,11,0.9), rgba(239,68,68,0.9))' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: T.text }}>Outcome Snapshot (Weekly)</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: 'Pass rate', value: `${passRate}%`, delta: avgThisWeek >= avgLastWeek ? 'up' : 'down' },
                      { label: 'Average score', value: `${avgPerformance || 0}%`, delta: avgThisWeek >= avgLastWeek ? 'up' : 'down' },
                      { label: 'Completion rate', value: `${completionRate}%`, delta: completionDelta >= 0 ? 'up' : 'down' },
                      { label: 'No-show rate', value: `${noShowRate}%`, delta: noShowRate <= 10 ? 'up' : 'down' },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <p className="text-[11px]" style={{ color: T.muted }}>{metric.label}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm font-semibold" style={{ color: T.text }}>{metric.value}</p>
                          <span style={{ color: metric.delta === 'up' ? '#6ee7b7' : '#f87171', fontSize: 12 }}>
                            {metric.delta === 'up' ? '↑' : '↓'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              className="p-0"
              style={{ background: 'transparent', border: '1px solid transparent', boxShadow: 'none' }}
              {...entrance(0.2)}
              whileHover={cardHover}
              transition={cardTransition}
              layout
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold" style={{ color: T.text }}>Performance Snapshot</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider" style={{ color: T.muted }}>Assignments</p>
                    <p className="text-xs font-semibold" style={{ color: '#60a5fa' }}>{trackedHours}</p>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceChartData}>
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: 'rgba(10,12,16,0.96)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                        <Bar dataKey="assignments" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider" style={{ color: T.muted }}>Completion rate</p>
                    <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                      {completionTrend.length ? `${completionTrend[completionTrend.length - 1].value}%` : '0%'}
                    </p>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={completionTrend}>
                        <defs>
                          <linearGradient id="completionMini" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" hide />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: 'rgba(10,12,16,0.96)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                        <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="url(#completionMini)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider" style={{ color: T.muted }}>Class average</p>
                    <p className="text-xs font-semibold" style={{ color: T.accent }}>
                      {avgPerformance > 0 ? `${avgPerformance}%` : '—'}
                    </p>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={compactPerformance}>
                        <XAxis dataKey="label" hide />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: 'rgba(10,12,16,0.96)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                        <Line type="monotone" dataKey="value" stroke={T.accent} strokeWidth={2.2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.section>

          </div>

          <aside className="min-h-0 overflow-y-auto no-scrollbar space-y-5">
            <InstructorProfileCard
              displayName={displayName}
              stats={instructorProfileStats}
              loading={false}
              onGoToProfile={() => setActiveTab('profile')}
                suggestions={instructorSuggestions}
            />

            <motion.section
              className="p-0"
              style={{ background: 'transparent', border: '1px solid transparent', boxShadow: 'none' }}
              {...entrance(0.3)}
              whileHover={cardHover}
              transition={cardTransition}
              layout
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: T.text }}>Advisee Assignment Status</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('assign-exam')}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ color: T.accent, border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Assign exams
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                <AnimatePresence mode="popLayout">
                {advisorStudents.map((student) => {
                  const hasAssignedExam = studentsWithExams.has(student.id);
                  return (
                    <motion.div
                      key={student.id}
                      className="rounded-xl p-3 flex items-center justify-between gap-3"
                      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      whileHover={{ x: 3, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      layout
                    >
                      <button
                        type="button"
                        onClick={() => onViewStudentProfile?.(student)}
                        className="text-left min-w-0 flex-1"
                      >
                        <p className="text-sm font-semibold truncate" style={{ color: T.text }}>
                          {student.full_name || student.email || 'Student'}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: T.muted }}>
                          {student.email || 'No email provided'}
                        </p>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <motion.span
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={hasAssignedExam ? { opacity: 1, scale: 1 } : { opacity: 1, scale: [1, 1.08, 1] }}
                          transition={hasAssignedExam ? { duration: 0.22 } : { duration: 1.2, repeat: Infinity, repeatType: 'loop' }}
                        >
                          {hasAssignedExam ? (
                            <CheckCircle2 size={14} style={{ color: '#6ee7b7' }} />
                          ) : (
                            <AlertCircle size={14} style={{ color: '#fcd34d' }} />
                          )}
                        </motion.span>
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            background: hasAssignedExam ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)',
                            color: hasAssignedExam ? '#6ee7b7' : '#fcd34d',
                          }}
                        >
                          {hasAssignedExam ? 'Assigned' : 'Not Assigned'}
                        </span>
                        {!hasAssignedExam && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('assign-exam')}
                            className="text-[11px] font-medium px-2 py-1 rounded-md"
                            style={{ color: T.text, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
                {advisorStudents.length === 0 && (
                  <div className="rounded-xl p-4 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', color: T.muted }}>
                    No advisee students yet. Add students first, then assign exams.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl p-3.5" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold" style={{ color: T.text }}>At-Risk Students</h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('students')}
                    className="text-xs"
                    style={{ color: T.accent }}
                  >
                    Open students
                  </button>
                </div>
                <div className="space-y-2">
                  {atRiskStudents.length > 0 ? (
                    atRiskStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between gap-2">
                        <p className="text-xs truncate" style={{ color: T.text }}>{student.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.14)', color: '#fcd34d' }}>
                          {student.reason}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs" style={{ color: T.muted }}>
                      No students are currently at risk. This is a placeholder for future risk signals.
                    </p>
                  )}
                </div>
              </div>
            </motion.section>
          </aside>
        </div>
        </div>
      </div>
    </div>
  );
}
