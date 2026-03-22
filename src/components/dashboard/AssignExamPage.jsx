import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileCheck,
  User,
  Mail,
  Loader2,
  Calendar,
  Clock,
  FileText,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  TrendingUp,
  Settings2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

const CARD_CLASS = 'rounded-xl border border-neutral-800 bg-[#0f1111] p-6 transition-all duration-200';
const INPUT_CLASS = 'w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50';

const CHART_COLORS = ['#64a091', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];

function getMinDateString() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function getMinTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

export function AssignExamPage({ setActiveTab }) {
  const { user, role } = useAuth();
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [advisorStudents, setAdvisorStudents] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [skippedDueToConflict, setSkippedDueToConflict] = useState(0);
  const [caseId, setCaseId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [assignToAll, setAssignToAll] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [examStats, setExamStats] = useState({ upcoming: 0, thisWeek: 0, byCase: [], byStatus: [] });

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

      setExamStats({ upcoming, thisWeek, byCase, byStatus });
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

  const selectedProfiles = useMemo(
    () => advisorStudents.filter((s) => selectedStudents.includes(s.id)),
    [advisorStudents, selectedStudents]
  );

  const selectedCase = cases.find((c) => c.id === caseId);
  const minDate = getMinDateString();
  const minTime = getMinTimeString();

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
    const d = new Date(`${examDate}T${examTime}`);
    return d <= new Date();
  }, [examDate, examTime]);

  useEffect(() => {
    if (examDate && examTime) {
      if (isDateInPast) setDateError('Please select a future date.');
      else setDateError('');
      if (isDateTimeInPast) setTimeError('Please select a future time.');
      else setTimeError('');
    } else {
      setDateError('');
      setTimeError('');
    }
  }, [examDate, examTime, isDateInPast, isDateTimeInPast]);

  const canAssign =
    selectedStudents.length > 0 &&
    !!caseId &&
    !!examDate &&
    !!examTime &&
    !isDateInPast &&
    !isDateTimeInPast &&
    !submitting;

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
    setSuccess(false);
    setError('');
  };

  const handleAssignToAll = (checked) => {
    setAssignToAll(checked);
    if (checked) setSelectedStudents(advisorStudents.map((s) => s.id));
    setSuccess(false);
    setError('');
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredStudents.map((s) => s.id);
    setSelectedStudents((prev) => [...new Set([...prev, ...visibleIds])]);
  };

  const handleDeselectAllVisible = () => {
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
      const selectedProfilesLocal = advisorStudents.filter((s) =>
        selectedStudents.includes(s.id)
      );
      const selectedIds = selectedProfilesLocal.map((p) => p.id);
      const scheduledAt = new Date(`${examDate}T${examTime}`);
      const scheduledAtIso = scheduledAt.toISOString();

      let existingSessions = [];
      try {
        const { data, err } = await supabase
          .from('sessions')
          .select('student_id')
          .eq('session_type', 'exam')
          .eq('start_time', scheduledAtIso)
          .in('student_id', selectedIds)
          .neq('status', 'Cancelled');
        if (err) throw err;
        existingSessions = data || [];
      } catch {
        const { data, err } = await supabase
          .from('sessions')
          .select('student_id')
          .eq('type', 'exam')
          .eq('start_time', scheduledAtIso)
          .in('student_id', selectedIds)
          .neq('status', 'Cancelled');
        if (err) throw err;
        existingSessions = data || [];
      }

      const existingIds = new Set(existingSessions.map((s) => s.student_id));
      const toAssign = selectedProfilesLocal.filter((p) => !existingIds.has(p.id));
      setSkippedDueToConflict(selectedProfilesLocal.length - toAssign.length);

      if (!toAssign.length) {
        setError('All selected students already have an exam scheduled at this time.');
        setSubmitting(false);
        return;
      }

      const baseInserts = toAssign.map((s) => ({
        student_id: s.id,
        examiner_id: user.id,
        case_id: caseId,
        start_time: scheduledAtIso,
        status: 'Scheduled',
      }));

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
    setCaseId('');
    setExamDate('');
    setExamTime('');
  };

  const formattedDateTime =
    examDate && examTime
      ? new Date(`${examDate}T${examTime}`).toLocaleString([], {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '—';

  if (!isInstructor) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={CARD_CLASS}>
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <FileCheck size={28} />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Access denied</h2>
            <p className="text-sm text-muted-foreground">This page is for instructors only.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={CARD_CLASS}>
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <FileCheck size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assign Exam</h1>
            <p className="text-sm text-muted-foreground">Schedule exams and manage your students.</p>
          </div>
        </div>
      </div>

      {/* Success card */}
      {success && (
        <div className={cn(CARD_CLASS, 'border-emerald-500/30 bg-emerald-500/5')}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-emerald-400">Exams assigned successfully</h3>
              {skippedDueToConflict > 0 && (
                <p className="text-sm text-emerald-200/90 mt-1">
                  Skipped {skippedDueToConflict} student{skippedDueToConflict === 1 ? '' : 's'} due to a scheduling conflict.
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab?.('sessions')}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                >
                  View Sessions
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium border border-neutral-600 text-foreground hover:bg-neutral-800/50"
                >
                  Assign Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error card */}
      {error && (
        <div className={cn(CARD_CLASS, 'border-red-500/30 bg-red-500/5')}>
          <div className="flex items-start gap-4">
            <AlertCircle size={24} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-red-400">Error</h3>
              <p className="text-sm text-red-200/90 mt-1">{error}</p>
              <button
                type="button"
                onClick={() => setError('')}
                className="mt-3 text-sm text-red-400 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats + Graphs row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={CARD_CLASS}>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            Exam Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-neutral-900/50 p-4 border border-neutral-800">
              <span className="block text-2xl font-bold text-foreground">{examStats.upcoming}</span>
              <span className="text-xs text-muted-foreground">Upcoming exams</span>
            </div>
            <div className="rounded-xl bg-neutral-900/50 p-4 border border-neutral-800">
              <span className="block text-2xl font-bold text-primary">{examStats.thisWeek}</span>
              <span className="text-xs text-muted-foreground">This week</span>
            </div>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-primary" />
            Exams by case
          </h3>
          <div className="h-[120px]">
            {examStats.byCase.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examStats.byCase} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={55} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                    {examStats.byCase.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No upcoming exams yet</p>
            )}
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-primary" />
            Exam status
          </h3>
          <div className="h-[120px]">
            {examStats.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={examStats.byStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={2}
                  >
                    {examStats.byStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    formatter={(v) => [v, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No exam data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Control panel: all cards in one view */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Card 1: Select Exam */}
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Select exam
          </h2>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Case</label>
            <select
              value={caseId}
              onChange={(e) => {
                setCaseId(e.target.value);
                setSuccess(false);
                setError('');
              }}
              className={INPUT_CLASS}
            >
              <option value="">— Select a case —</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">Choose the OSCE case for this exam.</p>
          </div>
        </div>

        {/* Card 2: Schedule */}
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Schedule
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Date</label>
              <input
                type="date"
                value={examDate}
                min={minDate}
                onChange={(e) => {
                  setExamDate(e.target.value);
                  setDateError('');
                  setSuccess(false);
                  setError('');
                }}
                className={cn(INPUT_CLASS, dateError && 'border-red-500/50')}
              />
              {dateError && (
                <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} /> {dateError}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">No past dates allowed.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Time</label>
              <input
                type="time"
                value={examTime}
                min={examDate === minDate ? minTime : undefined}
                onChange={(e) => {
                  setExamTime(e.target.value);
                  setTimeError('');
                  setSuccess(false);
                  setError('');
                }}
                className={cn(INPUT_CLASS, timeError && 'border-red-500/50')}
              />
              {timeError && (
                <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} /> {timeError}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">If today, select a future time.</p>
            </div>
          </div>
        </div>

        {/* Card 3: Control panel */}
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Settings2 size={18} className="text-primary" />
            Control panel
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl bg-neutral-900/30 border border-neutral-800 p-4">
              <p className="text-xs text-muted-foreground mb-1">Summary</p>
              <p className="text-sm font-medium text-foreground">
                {selectedCase?.title || '—'} → {selectedStudents.length} students
              </p>
              <p className="text-xs text-muted-foreground mt-1">{formattedDateTime}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => canAssign && setShowConfirmModal(true)}
                disabled={!canAssign}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <FileCheck size={18} />
                    Assign exam
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-neutral-700 text-foreground hover:bg-neutral-800/50"
              >
                Reset form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab?.('sessions')}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-neutral-700 text-muted-foreground hover:bg-neutral-800/50 hover:text-foreground"
              >
                View sessions
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card: Select Students (full width) */}
      <div className={CARD_CLASS}>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users size={18} className="text-primary" />
          Select students
        </h2>

        {advisorStudents.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-neutral-800 bg-neutral-900/30">
            <User size={40} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No students in your advisee list.</p>
            <p className="text-sm text-muted-foreground/80 mt-1">Go to Students and assign advisees first.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className={cn(INPUT_CLASS, 'pl-10')}
                />
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignToAll}
                    onChange={(e) => handleAssignToAll(e.target.checked)}
                    className="rounded border-neutral-700 bg-neutral-900/50 text-primary focus:ring-primary/50"
                  />
                  Assign to all
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25"
                >
                  Select visible
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllVisible}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 text-muted-foreground hover:bg-neutral-700"
                >
                  Deselect visible
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedStudents.length} / {advisorStudents.length} selected
                </span>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl border border-neutral-800 p-3">
              {filteredStudents.map((student) => {
                const isChecked = selectedStudents.includes(student.id);
                return (
                  <label
                    key={student.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      isChecked ? 'bg-primary/10 border-primary/30' : 'bg-neutral-900/30 border-neutral-800 hover:bg-neutral-800/50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStudent(student.id)}
                      className="rounded border-neutral-700 bg-neutral-900/50 text-primary focus:ring-primary/50"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{student.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Mail size={12} /> {student.email || 'No email'}
                      </p>
                    </div>
                  </label>
                );
              })}
              {filteredStudents.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No students match your search.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirmation modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !submitting && setShowConfirmModal(false)}
        >
          <div
            className={cn(CARD_CLASS, 'max-w-md w-full shadow-2xl')}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">Confirm assignment</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Assign <strong>{selectedCase?.title}</strong> to <strong>{selectedStudents.length}</strong> student
              {selectedStudents.length === 1 ? '' : 's'} on {formattedDateTime}.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-neutral-700 text-foreground hover:bg-neutral-800/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignExam}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Assigning...</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
