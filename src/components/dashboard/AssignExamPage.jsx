import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FileCheck,
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

/* ── LandingPage-matching theme ── */
const P = {
  page: '#060909',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.5)',
  accent: '#34d399',
  accentSage: 'rgba(100,170,145,0.9)',
  accentGlow: 'rgba(100,170,145,0.25)',
  accentBg: 'rgba(100,170,145,0.15)',
  gradientBtn: 'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.40) 50%, rgba(50,110,90,0.50) 100%)',
  gradientProgress: 'linear-gradient(90deg, #60a5fa 0%, #34d399 100%)',
  success: '#34d399',
  danger: '#ef4444',
};

const CHART_COLORS = ['#60a5fa', '#34d399', '#a78bfa', '#f472b6', '#fb923c'];

function GlassCard({ children, className = '', glow }) {
  return (
    <div
      className={cn('rounded-2xl p-5 backdrop-blur-xl transition-all duration-300', className)}
      style={{
        background: P.glass,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: glow ? '0 0 30px rgba(100,170,145,0.12), 0 0 60px rgba(100,170,145,0.05)' : '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {children}
    </div>
  );
}

const Card = ({ children, className }) => <GlassCard className={className}>{children}</GlassCard>;

const INPUT_CLASS =
  'w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 focus:shadow-[0_0_20px_rgba(52,211,153,0.15)] transition-all duration-200';

function getMinDateString() {
  return new Date().toISOString().split('T')[0];
}

function getMinTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function AssignExamPage({ setActiveTab }) {
  const { user, role } = useAuth();
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [advisorStudents, setAdvisorStudents] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [caseSearch, setCaseSearch] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [skippedDueToConflict, setSkippedDueToConflict] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [examStats, setExamStats] = useState({
    upcoming: 0,
    thisWeek: 0,
    byCase: [],
    popularCases: [],
    byStatus: [],
    recentAssignments: [],
    assignmentsTrend: [],
    studentActivity: [],
  });

  const isInstructor = role === 'instructor' || role === 'admin';

  const fetchData = useCallback(async () => {
    if (!user?.id || !isInstructor) return;
    const { data: assignments } = await supabase
      .from('advisor_assignments')
      .select('student_id')
      .eq('instructor_id', user.id);
    if (!assignments?.length) {
      setAdvisorStudents([]);
      setSelectedStudents([]);
      setLoading(false);
      return;
    }
    const studentIds = assignments.map((a) => a.student_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds)
      .eq('role', 'student');
    const safeProfiles = profiles || [];
    setAdvisorStudents(safeProfiles);
    setSelectedStudents(safeProfiles.map((p) => p.id));
    setLoading(false);
  }, [user?.id, isInstructor]);

  const fetchExamStats = useCallback(async () => {
    if (!user?.id || !isInstructor) return;
    try {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);

      let sessions = [];
      const { data: sessionsByType } = await supabase
        .from('sessions')
        .select('id, start_time, status, case_id, case:cases(title)')
        .eq('examiner_id', user.id)
        .eq('session_type', 'exam')
        .gte('start_time', now.toISOString())
        .order('start_time', { ascending: true });
      sessions = sessionsByType || [];
      if (sessions.length === 0) {
        const { data: sessionsByLegacy } = await supabase
          .from('sessions')
          .select('id, start_time, status, case_id, case:cases(title)')
          .eq('examiner_id', user.id)
          .eq('type', 'exam')
          .gte('start_time', now.toISOString())
          .order('start_time', { ascending: true });
        sessions = sessionsByLegacy || [];
      }

      const upcoming = sessions.length;
      const thisWeek = sessions.filter((s) => new Date(s.start_time) <= weekEnd).length;

      const caseCounts = {};
      sessions.forEach((s) => {
        const name = s.case?.title || 'Unknown';
        caseCounts[name] = (caseCounts[name] || 0) + 1;
      });
      const byCase = Object.entries(caseCounts).map(([name, count]) => ({ name, count }));

      let allCaseSessions = [];
      const { data: allCaseByType } = await supabase
        .from('sessions')
        .select('case_id, case:cases(title)')
        .eq('examiner_id', user.id)
        .eq('session_type', 'exam');
      allCaseSessions = allCaseByType || [];
      if (allCaseSessions.length === 0) {
        const { data: allCaseByLegacy } = await supabase
          .from('sessions')
          .select('case_id, case:cases(title)')
          .eq('examiner_id', user.id)
          .eq('type', 'exam');
        allCaseSessions = allCaseByLegacy || [];
      }
      const allCaseCounts = {};
      allCaseSessions.forEach((s) => {
        const name = s.case?.title || 'Unknown';
        allCaseCounts[name] = (allCaseCounts[name] || 0) + 1;
      });
      const popularCases = Object.entries(allCaseCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const { data: allByType } = await supabase
        .from('sessions')
        .select('status')
        .eq('examiner_id', user.id)
        .eq('session_type', 'exam');
      let allExams = allByType || [];
      if (allExams.length === 0) {
        const { data: allByLegacy } = await supabase
          .from('sessions')
          .select('status')
          .eq('examiner_id', user.id)
          .eq('type', 'exam');
        allExams = allByLegacy || [];
      }

      const statusCounts = { Scheduled: 0, Completed: 0, 'In Progress': 0, Cancelled: 0 };
      allExams.forEach((s) => {
        if (statusCounts[s.status] !== undefined) statusCounts[s.status]++;
      });
      const byStatus = Object.entries(statusCounts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }));

      let recent = [];
      const { data: recentByType } = await supabase
        .from('sessions')
        .select('id, start_time, case:cases(title)')
        .eq('examiner_id', user.id)
        .eq('session_type', 'exam')
        .order('start_time', { ascending: false })
        .limit(5);
      recent = recentByType || [];
      if (recent.length === 0) {
        const { data: recentByLegacy } = await supabase
          .from('sessions')
          .select('id, start_time, case:cases(title)')
          .eq('examiner_id', user.id)
          .eq('type', 'exam')
          .order('start_time', { ascending: false })
          .limit(5);
        recent = recentByLegacy || [];
      }
      const recentAssignments = recent.map((s) => ({
        title: s.case?.title || 'Unknown',
        date: s.start_time ? new Date(s.start_time).toLocaleDateString() : '—',
      }));

      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      let allForTrend = [];
      const { data: trendByType } = await supabase
        .from('sessions')
        .select('start_time')
        .eq('examiner_id', user.id)
        .eq('session_type', 'exam')
        .gte('start_time', twoWeeksAgo.toISOString());
      allForTrend = trendByType || [];
      if (allForTrend.length === 0) {
        const { data: trendByLegacy } = await supabase
          .from('sessions')
          .select('start_time')
          .eq('examiner_id', user.id)
          .eq('type', 'exam')
          .gte('start_time', twoWeeksAgo.toISOString());
        allForTrend = trendByLegacy || [];
      }
      const dayCounts = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - (13 - i));
        const key = d.toISOString().split('T')[0];
        dayCounts[key] = 0;
      }
      allForTrend.forEach((s) => {
        const key = s.start_time ? new Date(s.start_time).toISOString().split('T')[0] : null;
        if (key && dayCounts[key] !== undefined) dayCounts[key]++;
      });
      const assignmentsTrend = Object.entries(dayCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date: date.slice(5), count }));

      let studentSessions = [];
      const { data: studentByType } = await supabase
        .from('sessions')
        .select('student_id')
        .eq('examiner_id', user.id)
        .eq('session_type', 'exam');
      studentSessions = studentByType || [];
      if (studentSessions.length === 0) {
        const { data: studentByLegacy } = await supabase
          .from('sessions')
          .select('student_id')
          .eq('examiner_id', user.id)
          .eq('type', 'exam');
        studentSessions = studentByLegacy || [];
      }
      const studentCounts = {};
      studentSessions.forEach((s) => {
        const id = s.student_id;
        studentCounts[id] = (studentCounts[id] || 0) + 1;
      });
      const studentIds = Object.keys(studentCounts);
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);
      const nameMap = Object.fromEntries((studentProfiles || []).map((p) => [p.id, p.full_name || 'Unknown']));
      const studentActivity = Object.entries(studentCounts)
        .map(([id, count]) => ({ name: nameMap[id] || 'Unknown', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      setExamStats({
        upcoming,
        thisWeek,
        byCase,
        popularCases,
        byStatus,
        recentAssignments,
        assignmentsTrend,
        studentActivity,
      });
    } catch (err) {
      console.error(err);
    }
  }, [user?.id, isInstructor]);

  useEffect(() => {
    if (!isInstructor) {
      setLoading(false);
      return;
    }
    const load = async () => {
      await fetchData();
      await fetchExamStats();
      const { data } = await supabase
        .from('cases')
        .select('id, title')
        .in('status', ['Published', 'Draft'])
        .order('title');
      setCases(data || []);
    };
    load();
  }, [isInstructor, fetchData, fetchExamStats]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return advisorStudents;
    const q = studentSearch.toLowerCase();
    return advisorStudents.filter(
      (s) =>
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
    );
  }, [advisorStudents, studentSearch]);

  const filteredCases = useMemo(() => {
    if (!caseSearch.trim()) return cases;
    const q = caseSearch.toLowerCase();
    return cases.filter((c) => (c.title || '').toLowerCase().includes(q));
  }, [cases, caseSearch]);

  const isDateInPast = useMemo(() => {
    if (!examDate) return false;
    const d = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }, [examDate]);

  const isDateTimeInPast = useMemo(() => {
    if (!examDate || !examTime) return false;
    return new Date(`${examDate}T${examTime}`) <= new Date();
  }, [examDate, examTime]);

  useEffect(() => {
    if (examDate && examTime) {
      setDateError(isDateInPast ? 'Please select a future date.' : '');
      setTimeError(isDateTimeInPast ? 'Please select a future time.' : '');
    } else {
      setDateError('');
      setTimeError('');
    }
  }, [examDate, examTime, isDateInPast, isDateTimeInPast]);

  const canAssign =
    selectedStudents.length > 0 &&
    selectedCaseIds.length > 0 &&
    !!examDate &&
    !!examTime &&
    !isDateInPast &&
    !isDateTimeInPast &&
    !submitting;

  const minDate = getMinDateString();
  const minTime = getMinTimeString();
  const selectedCases = cases.filter((c) => selectedCaseIds.includes(c.id));
  const formattedDateTime =
    examDate && examTime
      ? new Date(`${examDate}T${examTime}`).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      : '—';

  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSuccess(false);
    setError('');
  };

  const toggleCase = (id) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSuccess(false);
    setError('');
  };

  const handleSelectAllStudents = () => {
    setSelectedStudents(filteredStudents.map((s) => s.id));
    setSuccess(false);
    setError('');
  };

  const handleDeselectAllStudents = () => {
    const visibleIds = new Set(filteredStudents.map((s) => s.id));
    setSelectedStudents((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  const handleAssignExam = async () => {
    if (!canAssign) return;
    setSubmitting(true);
    setSuccess(false);
    setError('');
    setShowConfirmModal(false);

    try {
      const scheduledAt = new Date(`${examDate}T${examTime}`);
      const scheduledAtIso = scheduledAt.toISOString();

      let existingSessions = [];
      try {
        const { data, err } = await supabase
          .from('sessions')
          .select('student_id, case_id')
          .eq('session_type', 'exam')
          .eq('start_time', scheduledAtIso)
          .in('student_id', selectedStudents)
          .in('case_id', selectedCaseIds)
          .neq('status', 'Cancelled');
        if (err) throw err;
        existingSessions = data || [];
      } catch {
        const { data, err } = await supabase
          .from('sessions')
          .select('student_id, case_id')
          .eq('type', 'exam')
          .eq('start_time', scheduledAtIso)
          .in('student_id', selectedStudents)
          .in('case_id', selectedCaseIds)
          .neq('status', 'Cancelled');
        if (err) throw err;
        existingSessions = data || [];
      }

      const existingSet = new Set(existingSessions.map((s) => `${s.student_id}:${s.case_id}`));
      const baseInserts = [];
      for (const studentId of selectedStudents) {
        for (const caseId of selectedCaseIds) {
          if (!existingSet.has(`${studentId}:${caseId}`)) {
            baseInserts.push({
              student_id: studentId,
              examiner_id: user.id,
              case_id: caseId,
              start_time: scheduledAtIso,
              status: 'Scheduled',
            });
          }
        }
      }

      const skipped = selectedStudents.length * selectedCaseIds.length - baseInserts.length;
      setSkippedDueToConflict(skipped);

      if (baseInserts.length === 0) {
        setError('All selected students already have these exams scheduled at this time.');
        setSubmitting(false);
        return;
      }

      let insertError = null;
      try {
        const { error: err } = await supabase.from('sessions').insert(
          baseInserts.map((row) => ({ ...row, session_type: 'exam' }))
        );
        insertError = err;
      } catch (err) {
        insertError = err;
      }

      if (insertError) {
        const { error: fallbackErr } = await supabase.from('sessions').insert(
          baseInserts.map((row) => ({ ...row, type: 'exam' }))
        );
        if (fallbackErr) throw fallbackErr;
      }

      setSuccess(true);
      fetchExamStats();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to assign exam.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setError('');
    setSkippedDueToConflict(0);
    setSelectedCaseIds([]);
    setExamDate('');
    setExamTime('');
    setSelectedStudents(advisorStudents.map((s) => s.id));
  };

  if (!isInstructor) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <div className="flex flex-col items-center text-center py-12">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
              style={{ background: P.accentBg }}
            >
              <FileCheck size={28} style={{ color: P.accent }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: P.text }}>
              Access denied
            </h2>
            <p className="text-sm" style={{ color: P.muted }}>
              This page is for instructors only.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: P.accent }} />
            <p className="text-sm" style={{ color: P.muted }}>Loading...</p>
          </div>
        </Card>
      </div>
    );
  }

  const pieData = (examStats.popularCases || examStats.byCase || []).slice(0, 5).map((c, i) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
    value: c.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const readinessPct = advisorStudents.length > 0
    ? Math.min(100, Math.round((selectedStudents.length / advisorStudents.length) * 100))
    : 0;

  return (
    <div
      className="w-full min-h-screen min-h-[100vh] px-4 sm:px-6 lg:px-8 pb-12 relative overflow-hidden"
    >
      <div className="relative z-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: P.text }}>
            Assign Exam
          </h1>
          <p className="text-sm mt-0.5" style={{ color: P.muted }}>
            AI-powered exam assignment dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-sm">
            <span style={{ color: P.muted }}>Upcoming</span>
            <span className="font-bold" style={{ color: P.accent }}>{examStats.upcoming}</span>
            <span className="text-slate-600">|</span>
            <span style={{ color: P.muted }}>This week</span>
            <span className="font-bold" style={{ color: P.accent }}>{examStats.thisWeek}</span>
          </div>
          <div className="relative w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.muted }} />
            <input
              type="text"
              placeholder="Search..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className={cn(INPUT_CLASS, 'pl-9')}
            />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total students', value: advisorStudents.length, color: P.accent },
          { label: 'Selected', value: selectedStudents.length, color: P.accent },
          { label: 'Cases selected', value: selectedCaseIds.length, color: CHART_COLORS[0] },
          { label: 'Ready', value: canAssign ? 'Yes' : 'No', color: canAssign ? P.success : P.muted },
        ].map((s) => (
          <GlassCard key={s.label} className="py-3">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] mt-0.5 uppercase tracking-wider" style={{ color: P.muted }}>{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Progress bar */}
      <GlassCard className="mb-6 py-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm" style={{ color: P.muted }}>Selection progress</span>
          <span className="text-sm font-semibold" style={{ color: P.accent }}>{readinessPct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${readinessPct}%`, background: P.gradientProgress, boxShadow: `0 0 20px ${P.accentGlow}` }}
          />
        </div>
      </GlassCard>

      {/* Success / Error */}
      {success && (
        <GlassCard className="mb-5 py-4" style={{ borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.08)' }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} style={{ color: P.success, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold" style={{ color: P.success }}>
                Exams assigned successfully
              </h3>
              {skippedDueToConflict > 0 && (
                <p className="text-xs mt-0.5" style={{ color: P.muted }}>
                  Skipped {skippedDueToConflict} due to conflict.
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab?.('sessions')}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-90"
                  style={{ background: 'rgba(100,170,145,0.2)', color: P.accent, border: '1px solid rgba(100,170,145,0.35)' }}
                >
                  View Sessions
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-90"
                  style={{ background: 'rgba(255,255,255,0.05)', color: P.text, border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Assign Another
                </button>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {error && (
        <GlassCard className="mb-5 py-4" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} style={{ color: P.danger, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm" style={{ color: P.danger }}>{error}</p>
              <button type="button" onClick={() => setError('')} className="mt-2 text-xs hover:underline" style={{ color: P.danger }}>
                Dismiss
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Workflow board style Assign panel */}
      <div
        className="rounded-2xl p-5 sm:p-6 mb-8 backdrop-blur-xl relative overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(100,170,145,0.25)',
          boxShadow: '0 0 40px rgba(100,170,145,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: P.text }}>New Exam Workflow</h2>
          <span className="text-xs px-3 py-1.5 rounded-full" style={{ color: P.accent, border: '1px solid rgba(100,170,145,0.35)', background: 'rgba(100,170,145,0.12)' }}>
            {selectedStudents.length} students · {selectedCaseIds.length} cases
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 relative">
          {/* connectors (desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-[24%] w-[8%] h-px -translate-y-1/2" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <div className="hidden lg:block absolute top-1/2 left-[49%] w-[8%] h-px -translate-y-1/2" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <div className="hidden lg:block absolute top-1/2 left-[74%] w-[8%] h-px -translate-y-1/2" style={{ background: 'rgba(255,255,255,0.15)' }} />

          {/* Stage 1: Student allocation */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: P.muted }}>Student allocation</p>
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={handleSelectAllStudents} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(100,170,145,0.2)', color: P.accent, border: '1px solid rgba(100,170,145,0.3)' }}>
                Select all
              </button>
              <button type="button" onClick={handleDeselectAllStudents} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: P.muted, border: '1px solid rgba(255,255,255,0.1)' }}>
                Clear
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              {advisorStudents.length === 0 ? (
                <p className="text-xs py-6 text-center" style={{ color: P.muted }}>No advisees found</p>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudents.includes(student.id);
                  const initials = (student.full_name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className="flex items-center gap-2 px-2.5 py-2 cursor-pointer border-b border-white/5 last:border-0"
                      style={{ background: isSelected ? 'rgba(100,170,145,0.1)' : 'transparent' }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: P.text }}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate" style={{ color: P.text }}>{student.full_name || 'Unnamed'}</p>
                      </div>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleStudent(student.id)} onClick={(e) => e.stopPropagation()} style={{ accentColor: P.accent }} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Stage 2: Issue identification (cases) */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: P.muted }}>Case identification</p>
            <input
              type="text"
              placeholder="Search cases..."
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
              className={cn(INPUT_CLASS, 'mb-3')}
            />
            {selectedCaseIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedCases.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]" style={{ background: 'rgba(100,170,145,0.15)', color: P.accent, border: '1px solid rgba(100,170,145,0.35)' }}>
                    {c.title}
                    <button type="button" onClick={() => toggleCase(c.id)}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="max-h-44 overflow-y-auto rounded-xl p-2" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              {filteredCases.map((c) => {
                const isSelected = selectedCaseIds.includes(c.id);
                return (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleCase(c.id)} style={{ accentColor: P.accent }} />
                    <span className="text-xs truncate" style={{ color: P.text }}>{c.title}</span>
                  </label>
                );
              })}
              {filteredCases.length === 0 && <p className="text-xs py-4 text-center" style={{ color: P.muted }}>No matching cases</p>}
            </div>
          </div>

          {/* Stage 3: Technical resolution (schedule) */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: P.muted }}>Schedule setup</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: P.text }}>Date</label>
                <input
                  type="date"
                  value={examDate}
                  min={minDate}
                  onChange={(e) => {
                    setExamDate(e.target.value);
                    setSuccess(false);
                    setError('');
                  }}
                  className={cn(INPUT_CLASS, dateError && 'border-red-500/50')}
                />
                {dateError && <p className="mt-1 text-xs text-red-400">{dateError}</p>}
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: P.text }}>Time</label>
                <input
                  type="time"
                  value={examTime}
                  min={examDate === minDate ? minTime : undefined}
                  onChange={(e) => {
                    setExamTime(e.target.value);
                    setSuccess(false);
                    setError('');
                  }}
                  className={cn(INPUT_CLASS, timeError && 'border-red-500/50')}
                />
                {timeError && <p className="mt-1 text-xs text-red-400">{timeError}</p>}
              </div>
            </div>
          </div>

          {/* Stage 4: New tasks */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: P.muted }}>New tasks</p>
            <div className="space-y-2">
              <div className="rounded-lg px-3 py-2 text-xs" style={{ border: '1px solid rgba(255,255,255,0.08)', color: P.text }}>
                Students selected: <span style={{ color: P.accent }}>{selectedStudents.length}</span>
              </div>
              <div className="rounded-lg px-3 py-2 text-xs" style={{ border: '1px solid rgba(255,255,255,0.08)', color: P.text }}>
                Cases selected: <span style={{ color: P.accent }}>{selectedCaseIds.length}</span>
              </div>
              <div className="rounded-lg px-3 py-2 text-xs" style={{ border: '1px solid rgba(255,255,255,0.08)', color: P.text }}>
                Schedule: <span style={{ color: P.accent }}>{formattedDateTime}</span>
              </div>
              <button
                type="button"
                onClick={() => canAssign && setShowConfirmModal(true)}
                disabled={!canAssign}
                className={cn(
                  'w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  canAssign ? 'hover:scale-[1.02]' : 'opacity-60 cursor-not-allowed'
                )}
                style={canAssign ? { background: P.gradientBtn, color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: P.muted }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <FileCheck size={16} />}
                {submitting ? 'Assigning...' : 'Assign Exam'}
              </button>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={resetForm} className="flex-1 px-2 py-1.5 rounded-lg text-xs" style={{ color: P.text, border: '1px solid rgba(255,255,255,0.1)' }}>
                  Reset
                </button>
                <button type="button" onClick={() => setActiveTab?.('sessions')} className="flex-1 px-2 py-1.5 rounded-lg text-xs" style={{ color: P.text, border: '1px solid rgba(255,255,255,0.1)' }}>
                  Sessions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics — glass cards with charts */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold" style={{ color: P.text }}>
          Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignments trend */}
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} style={{ color: P.accent }} />
              <h3 className="text-sm font-semibold" style={{ color: P.text }}>
                Assignments trend
              </h3>
            </div>
            <div className="h-[200px]">
              {examStats.assignmentsTrend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={examStats.assignmentsTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fill: P.muted, fontSize: 11 }} />
                    <YAxis tick={{ fill: P.muted, fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(6,9,9,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: P.text, backdropFilter: 'blur(12px)' }}
                      labelStyle={{ color: P.muted }}
                    />
                    <Area type="monotone" dataKey="count" stroke="none" fill="url(#lineGradient)" />
                    <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={{ fill: '#34d399', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm" style={{ color: P.muted }}>
                  No trend data yet
                </div>
              )}
            </div>
          </Card>

          {/* Student activity — bar chart */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={18} style={{ color: P.accent }} />
              <h3 className="text-sm font-semibold" style={{ color: P.text }}>
                Student activity
              </h3>
            </div>
            <div className="h-[200px]">
              {examStats.studentActivity?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={examStats.studentActivity} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" opacity={0.5} horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fill: P.muted, fontSize: 11 }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: P.muted, fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(6,9,9,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: P.text, backdropFilter: 'blur(12px)' }}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm" style={{ color: P.muted }}>
                  No activity data yet
                </div>
              )}
            </div>
          </Card>

          {/* Popular cases — thin-ring donut (Threats By Virus style) */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={18} style={{ color: P.accent }} />
              <h3 className="text-sm font-semibold" style={{ color: P.text }}>
                Popular cases
              </h3>
            </div>
            <div className="h-[200px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'rgba(6,9,9,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: P.text, backdropFilter: 'blur(12px)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm" style={{ color: P.muted }}>
                  No case data yet
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Row 2: Exam status + Recent assignments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Exam status breakdown */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileCheck size={16} style={{ color: P.accent }} />
              <h3 className="text-sm font-semibold" style={{ color: P.text }}>
                Exam status
              </h3>
            </div>
            {examStats.byStatus?.length > 0 ? (
              <div className="space-y-2">
                {examStats.byStatus.map((item) => {
                  const total = examStats.byStatus.reduce((a, x) => a + x.value, 0);
                  const pct = total > 0 ? (item.value / total) * 100 : 0;
                  const colors = { Scheduled: CHART_COLORS[0], Completed: P.accent, 'In Progress': '#fb923c', Cancelled: P.muted };
                  const c = colors[item.name] || P.accent;
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: P.text }}>{item.name}</span>
                        <span style={{ color: P.muted }}>{item.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-sm" style={{ color: P.muted }}>No data</div>
            )}
          </Card>

        {/* Recent assignments */}
        {examStats.recentAssignments?.length > 0 ? (
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4" style={{ color: P.text }}>
              Recent Assignments
            </h3>
            <div className="space-y-0">
              {examStats.recentAssignments.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3"
                  style={{ borderBottom: i < examStats.recentAssignments.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(100,170,145,0.15)' }}>
                    <FileCheck size={18} style={{ color: P.success }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: P.text }}>{r.title}</p>
                    <p className="text-xs" style={{ color: P.muted }}>{r.date}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${P.success}30` }}>
                    <CheckCircle2 size={16} style={{ color: P.success }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        ) : (
          <Card>
            <h3 className="text-sm font-semibold mb-4" style={{ color: P.text }}>Recent Assignments</h3>
            <div className="flex items-center justify-center h-24 text-sm" style={{ color: P.muted }}>No recent assignments</div>
          </Card>
        )}
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ background: 'rgba(10,12,16,0.9)', backdropFilter: 'blur(8px)' }}
          onClick={() => !submitting && setShowConfirmModal(false)}
        >
          <GlassCard className="max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: P.text }}>
              Confirm assignment
            </h3>
            <p className="text-sm mb-4" style={{ color: P.muted }}>
              Assign {selectedCaseIds.length} case{selectedCaseIds.length !== 1 ? 's' : ''} (
              {selectedCases.map((c) => c.title).join(', ')}
              ) to {selectedStudents.length} student{selectedStudents.length === 1 ? '' : 's'} on {formattedDateTime}.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.05)', color: P.text, border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignExam}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: P.gradientBtn, color: '#fff', boxShadow: '0 0 20px rgba(100,170,145,0.3)' }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
      </div>
    </div>
  );
}
