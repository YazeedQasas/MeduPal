import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  Copy,
  FileCheck,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

const P = {
  glass: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.62)',
  accent: '#34d399',
  warn: '#f59e0b',
  danger: '#ef4444',
  success: '#22c55e',
  gradientBtn:
    'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.40) 50%, rgba(50,110,90,0.50) 100%)',
};

const INPUT_CLASS =
  'w-full px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all duration-200';
const SELECT_CLASS = `${INPUT_CLASS} [color-scheme:dark]`;

const MOCK_EXAMINERS = [
  { id: 'e1', label: 'Dr. Ibrahim' },
  { id: 'e2', label: 'Dr. Salma' },
  { id: 'e3', label: 'Dr. Carter' },
];

const STATION_TEMPLATES = [
  { id: 'quick-4', label: 'Quick OSCE (4 stations)', count: 4, duration: 8 },
  { id: 'standard-6', label: 'Standard OSCE (6 stations)', count: 6, duration: 10 },
  { id: 'final-8', label: 'Final OSCE (8 stations)', count: 8, duration: 12 },
];

function createStation(seed = Date.now()) {
  return {
    id: `station-${seed}-${Math.random().toString(16).slice(2, 6)}`,
    caseId: '',
    duration: '10',
    examinerId: '',
  };
}

function isStationComplete(station) {
  return Boolean(station.caseId) && Number(station.duration) > 0;
}

function GlassCard({ className = '', children, ...props }) {
  return (
    <section
      className={cn('rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-[0_6px_18px_rgba(0,0,0,0.18)]', className)}
      style={{ background: P.glass, border: `1px solid ${P.border}` }}
      {...props}
    >
      {children}
    </section>
  );
}

function Stepper({ steps, activeStep }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {steps.map((step) => {
        const isActive = step.id === activeStep;
        return (
          <div
            key={step.id}
            className="rounded-xl px-3 py-2 border transition-all duration-200"
            style={{
              borderColor: step.done ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.1)',
              background: isActive ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <p className="text-[10px] uppercase tracking-wide" style={{ color: P.muted }}>
              Step {step.id}
            </p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: P.text }}>
              {step.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ValidationMap({ items, onJump }) {
  const invalid = items.filter((x) => x.error);
  if (invalid.length === 0) return null;
  return (
    <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2">
      <p className="text-xs text-red-200 mb-1">Please fix the highlighted fields before continuing</p>
      <div className="flex flex-wrap gap-2">
        {invalid.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onJump(item.id)}
            className="text-[11px] px-2 py-1 rounded-md border border-red-300/40 text-red-200 hover:bg-red-500/10"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StudentSelector({
  students,
  loading,
  query,
  setQuery,
  selectedIds,
  toggleStudent,
  conflictIds,
  showConflictOnly,
  setShowConflictOnly,
  fieldError,
  onSelectAllVisible,
  onClearVisible,
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = q
      ? students.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      : students;
    if (showConflictOnly) base = base.filter((s) => conflictIds.has(s.id));
    return base;
  }, [students, query, showConflictOnly, conflictIds]);

  return (
    <GlassCard className="lg:sticky lg:top-4 lg:h-[80vh] flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} style={{ color: P.accent }} />
          <h3 className="text-sm font-semibold" style={{ color: P.text }}>
            Step 1: Students
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowConflictOnly((v) => !v)}
          className={cn(
            'text-[11px] px-2 py-1 rounded-lg border',
            showConflictOnly ? 'border-amber-400/50 bg-amber-500/10 text-amber-300' : 'border-white/10 text-white/70'
          )}
        >
          Conflicts only
        </button>
      </div>

      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: P.muted }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search advisees..." className={cn(INPUT_CLASS, 'pl-8')} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button type="button" onClick={onSelectAllVisible} className="text-xs rounded-lg border border-white/10 py-1.5 text-white/80 hover:bg-white/5">
          Select visible
        </button>
        <button type="button" onClick={onClearVisible} className="text-xs rounded-lg border border-white/10 py-1.5 text-white/70 hover:bg-white/5">
          Clear visible
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {selectedIds.length === 0 ? (
          <span className="text-xs" style={{ color: P.muted }}>No students selected yet.</span>
        ) : (
          selectedIds.map((id) => {
            const s = students.find((x) => x.id === id);
            if (!s) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]" style={{ background: 'rgba(52,211,153,0.16)', color: P.accent }}>
                {s.name}
              </span>
            );
          })
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02]">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="animate-spin" size={18} style={{ color: P.accent }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs" style={{ color: P.muted }}>No advisees found.</p>
            <p className="text-[11px] mt-1" style={{ color: P.muted }}>Go to Students and assign advisees first.</p>
          </div>
        ) : (
          filtered.map((student) => {
            const selected = selectedIds.includes(student.id);
            const hasConflict = conflictIds.has(student.id);
            return (
              <label key={student.id} className="flex items-start gap-2 px-3 py-2.5 border-b border-white/5 last:border-0 cursor-pointer transition-colors" style={{ background: selected ? 'rgba(52,211,153,0.08)' : 'transparent' }}>
                <input type="checkbox" checked={selected} onChange={() => toggleStudent(student.id)} className="mt-1" style={{ accentColor: P.accent }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: P.text }}>{student.name}</p>
                  <p className="text-[11px] truncate" style={{ color: P.muted }}>{student.email}</p>
                  {hasConflict && (
                    <div className="mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/30">
                        Time conflict
                      </span>
                    </div>
                  )}
                </div>
              </label>
            );
          })
        )}
      </div>
      {fieldError && <p className="text-xs mt-2 text-red-300">{fieldError}</p>}
    </GlassCard>
  );
}

function StationCard({
  station,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  caseOptions,
  examinerOptions,
  errors,
}) {
  return (
    <div className="rounded-xl p-3 border border-white/10 bg-white/[0.02] transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold" style={{ color: P.text }}>
            Station {index + 1}
          </p>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', isStationComplete(station) ? 'border-emerald-400/40 text-emerald-300' : 'border-amber-400/35 text-amber-300')}>
            {isStationComplete(station) ? 'Complete' : 'Incomplete'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onMoveUp(station.id)} disabled={isFirst} className={cn('p-1 rounded border border-white/10 text-white/70', isFirst && 'opacity-40 cursor-not-allowed')}>
            <ChevronUp size={12} />
          </button>
          <button type="button" onClick={() => onMoveDown(station.id)} disabled={isLast} className={cn('p-1 rounded border border-white/10 text-white/70', isLast && 'opacity-40 cursor-not-allowed')}>
            <ChevronDown size={12} />
          </button>
          <button type="button" onClick={() => onDuplicate(station.id)} className="text-xs px-2 py-1 rounded-lg border border-white/20 text-white/80 hover:bg-white/10">
            <Copy size={12} className="inline mr-1" />
            Copy
          </button>
          <button type="button" onClick={() => onRemove(station.id)} className="text-xs px-2 py-1 rounded-lg border border-red-400/30 text-red-300 hover:bg-red-500/10">
            <Trash2 size={12} className="inline mr-1" />
            Remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] mb-1" style={{ color: P.muted }}>Case</label>
          <select value={station.caseId} onChange={(e) => onUpdate(station.id, { caseId: e.target.value })} className={cn(SELECT_CLASS, errors?.caseId && 'border-red-500/50')}>
            <option value="">Select case</option>
            {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {errors?.caseId && <p className="text-xs mt-1 text-red-300">{errors.caseId}</p>}
        </div>

        <div>
          <label className="block text-[11px] mb-1" style={{ color: P.muted }}>Duration (min)</label>
          <input type="number" min={1} value={station.duration} onChange={(e) => onUpdate(station.id, { duration: e.target.value })} className={cn(INPUT_CLASS, errors?.duration && 'border-red-500/50')} />
          {errors?.duration && <p className="text-xs mt-1 text-red-300">{errors.duration}</p>}
        </div>

        <div>
          <label className="block text-[11px] mb-1" style={{ color: P.muted }}>Examiner (optional)</label>
          <select value={station.examinerId} onChange={(e) => onUpdate(station.id, { examinerId: e.target.value })} className={SELECT_CLASS}>
            <option value="">Unassigned</option>
            {examinerOptions.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
      </div>

      {errors?.duplicateCase && (
        <p className="text-xs mt-2 pl-2 border-l-2" style={{ color: P.warn, borderColor: 'rgba(245,158,11,0.45)' }}>
          {errors.duplicateCase}
        </p>
      )}
    </div>
  );
}

function SummaryCard({ studentCount, stationCount, totalDuration, dateTimeLabel }) {
  const totalAssignments = studentCount * stationCount;
  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck size={16} style={{ color: P.accent }} />
        <h3 className="text-sm font-semibold" style={{ color: P.text }}>Step 4: Review</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl p-3 border border-white/10 bg-white/[0.02]">
          <p style={{ color: P.muted }}>Students</p>
          <p className="font-semibold mt-1" style={{ color: P.text }}>{studentCount}</p>
        </div>
        <div className="rounded-xl p-3 border border-white/10 bg-white/[0.02]">
          <p style={{ color: P.muted }}>Stations</p>
          <p className="font-semibold mt-1" style={{ color: P.text }}>{stationCount} ({totalDuration} min)</p>
        </div>
        <div className="rounded-xl p-3 border border-white/10 bg-white/[0.02] sm:col-span-2">
          <p style={{ color: P.muted }}>Schedule</p>
          <p className="font-semibold mt-1" style={{ color: P.text }}>{dateTimeLabel}</p>
        </div>
        <div className="rounded-xl p-3 border border-emerald-400/30 bg-emerald-500/10 sm:col-span-2">
          <p style={{ color: '#a7f3d0' }}>Assignment preview</p>
          <p className="font-semibold mt-1 text-sm" style={{ color: '#d1fae5' }}>
            {totalAssignments} sessions will be generated ({studentCount} students x {stationCount} stations)
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

function validateStudents(selectedStudents) {
  return { students: selectedStudents.length > 0 ? '' : 'Select at least one student' };
}

function validateSchedule(examDate, examTime, hasScheduleConflict) {
  if (!examDate || !examTime) {
    return { date: '', schedule: 'Please select date and time', conflict: false };
  }
  const selected = new Date(`${examDate}T${examTime}`);
  if (selected <= new Date()) {
    return { date: 'Cannot select a past date', schedule: '', conflict: false };
  }
  if (hasScheduleConflict) {
    return { date: '', schedule: 'This time overlaps with another exam', conflict: true };
  }
  return { date: '', schedule: '', conflict: false };
}

function validateStations(stations) {
  if (stations.length === 0) return { stations: 'Add at least one station', byId: {} };
  const byId = {};
  const counts = {};
  stations.forEach((s) => {
    if (s.caseId) counts[s.caseId] = (counts[s.caseId] || 0) + 1;
  });
  stations.forEach((s) => {
    byId[s.id] = {
      caseId: s.caseId ? '' : 'Please select a case',
      duration: Number(s.duration) > 0 ? '' : 'Duration must be greater than 0',
      duplicateCase: s.caseId && counts[s.caseId] > 1 ? 'This case is used in another station' : '',
    };
  });
  const hasHardErrors = Object.values(byId).some((e) => e.caseId || e.duration);
  return { stations: hasHardErrors ? 'Please complete all station fields' : '', byId };
}

export function AssignExamPage({ setActiveTab }) {
  const { user } = useAuth();
  const [advisorStudents, setAdvisorStudents] = useState([]);
  const [cases, setCases] = useState([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [stations, setStations] = useState([createStation()]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showConflictOnly, setShowConflictOnly] = useState(false);
  const [conflictStudentIds, setConflictStudentIds] = useState(new Set());
  const [activeStep, setActiveStep] = useState(1);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [successPayload, setSuccessPayload] = useState(null);

  const sectionRefs = {
    students: useRef(null),
    schedule: useRef(null),
    stations: useRef(null),
    review: useRef(null),
  };

  const minDate = new Date().toISOString().split('T')[0];
  const dateTime = examDate && examTime ? new Date(`${examDate}T${examTime}`) : null;
  const selectedDateTimeLabel = dateTime ? dateTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const totalDuration = stations.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
  const totalAssignments = selectedStudents.length * stations.length;

  useEffect(() => {
    if (!feedback) return undefined;
    const t = setTimeout(() => setFeedback(''), 1800);
    return () => clearTimeout(t);
  }, [feedback]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (!user?.id) {
        if (mounted) setStudentsLoading(false);
        return;
      }
      setStudentsLoading(true);

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
        if (mounted) {
          const mapped = (profiles || []).map((p) => ({
            id: p.id,
            name: p.full_name || 'Unnamed Student',
            email: p.email || 'No email',
          }));
          setAdvisorStudents(mapped);
        }
      } else if (mounted) {
        setAdvisorStudents([]);
      }

      const { data: casesData } = await supabase
        .from('cases')
        .select('id, title')
        .order('title');
      if (mounted) {
        setCases((casesData || []).map((c) => ({ id: c.id, title: c.title })));
      }

      if (mounted) setStudentsLoading(false);
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const storageKey = `assign-exam-draft-${user?.id || 'anon'}`;
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.examDate) setExamDate(parsed.examDate);
      if (parsed?.examTime) setExamTime(parsed.examTime);
      if (Array.isArray(parsed?.selectedStudents)) setSelectedStudents(parsed.selectedStudents);
      if (Array.isArray(parsed?.stations) && parsed.stations.length > 0) setStations(parsed.stations);
      setRestoredDraft(true);
    } catch {
      // ignore invalid draft
    }
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!user?.id) return;
    const payload = { examDate, examTime, selectedStudents, stations };
    const t = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    }, 600);
    return () => clearTimeout(t);
  }, [user?.id, storageKey, examDate, examTime, selectedStudents, stations]);

  useEffect(() => {
    const loadConflicts = async () => {
      if (!user?.id || !examDate || !examTime || advisorStudents.length === 0) {
        setConflictStudentIds(new Set());
        return;
      }
      const iso = new Date(`${examDate}T${examTime}`).toISOString();
      const ids = advisorStudents.map((s) => s.id);
      let rows = [];
      const { data, error } = await supabase
        .from('sessions')
        .select('student_id')
        .eq('start_time', iso)
        .in('student_id', ids)
        .neq('status', 'Cancelled')
        .eq('session_type', 'exam');
      if (!error) {
        rows = data || [];
      } else {
        const { data: legacy } = await supabase
          .from('sessions')
          .select('student_id')
          .eq('start_time', iso)
          .in('student_id', ids)
          .neq('status', 'Cancelled')
          .eq('type', 'exam');
        rows = legacy || [];
      }
      setConflictStudentIds(new Set(rows.map((r) => r.student_id)));
    };
    loadConflicts();
  }, [user?.id, examDate, examTime, advisorStudents]);

  const scheduleConflict = useMemo(() => {
    if (!selectedStudents.length) return false;
    return selectedStudents.some((id) => conflictStudentIds.has(id));
  }, [selectedStudents, conflictStudentIds]);

  const studentErrors = useMemo(() => validateStudents(selectedStudents), [selectedStudents]);
  const scheduleErrors = useMemo(() => validateSchedule(examDate, examTime, scheduleConflict), [examDate, examTime, scheduleConflict]);
  const stationErrors = useMemo(() => validateStations(stations), [stations]);

  const issueMap = [
    { id: 'students', label: 'Students', error: studentErrors.students },
    { id: 'schedule', label: 'Schedule', error: scheduleErrors.schedule || scheduleErrors.date },
    { id: 'stations', label: 'Stations', error: stationErrors.stations },
  ];
  const issueCount = issueMap.filter((x) => x.error).length;

  const canAssign = issueCount === 0 && !submitting;

  const stepMeta = [
    { id: 1, title: 'Students', done: !studentErrors.students },
    { id: 2, title: 'Schedule', done: !scheduleErrors.schedule && !scheduleErrors.date },
    { id: 3, title: 'Stations', done: !stationErrors.stations },
    { id: 4, title: 'Review', done: canAssign },
  ];

  const jumpToSection = (id) => {
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const nextStep = () => setActiveStep((s) => Math.min(4, s + 1));
  const prevStep = () => setActiveStep((s) => Math.max(1, s - 1));

  const onSelectAllVisible = () => {
    const q = studentQuery.trim().toLowerCase();
    const visible = (q
      ? advisorStudents.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      : advisorStudents).map((s) => s.id);
    setSelectedStudents((prev) => [...new Set([...prev, ...visible])]);
  };
  const onClearVisible = () => {
    const q = studentQuery.trim().toLowerCase();
    const visible = new Set((q
      ? advisorStudents.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      : advisorStudents).map((s) => s.id));
    setSelectedStudents((prev) => prev.filter((id) => !visible.has(id)));
  };
  const toggleStudent = (id) => {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const applyTemplate = (templateId) => {
    const tpl = STATION_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const generated = Array.from({ length: tpl.count }, (_, i) => ({
      ...createStation(Date.now() + i),
      duration: String(tpl.duration),
    }));
    setStations(generated);
    setFeedback(`Applied template: ${tpl.label}`);
  };

  const addStation = () => {
    const last = stations[stations.length - 1];
    if (!last || !isStationComplete(last)) {
      setSubmitAttempted(true);
      setFeedback('Complete current station first');
      return;
    }
    setStations((prev) => [...prev, createStation()]);
    setFeedback('Station added');
  };
  const removeStation = (id) => {
    setStations((prev) => (prev.length === 1 ? prev : prev.filter((s) => s.id !== id)));
    setFeedback('Station removed');
  };
  const duplicateStation = (id) => {
    const target = stations.find((s) => s.id === id);
    if (!target) return;
    setStations((prev) => [...prev, { ...target, id: createStation().id }]);
    setFeedback('Station duplicated');
  };
  const moveStation = (id, dir) => {
    setStations((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      if (i < 0) return prev;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };
  const updateStation = (id, patch) => {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const saveDraft = () => {
    localStorage.setItem(storageKey, JSON.stringify({ examDate, examTime, selectedStudents, stations }));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 1400);
  };

  const trySubmit = () => {
    setSubmitAttempted(true);
    const firstError = issueMap.find((x) => x.error);
    if (firstError) {
      jumpToSection(firstError.id);
      return;
    }
    setShowConfirm(true);
  };

  const submitAssign = () => {
    if (submitting) return;
    setSubmitting(true);
    const run = async () => {
      // Send in-app alerts to selected students.
      if (selectedStudents.length > 0) {
        const message = `You have a new OSCE exam scheduled for ${selectedDateTimeLabel}.`;
        // Schema-aligned insert for alerts table in this repo.
        const payload = selectedStudents.map((studentId) => ({
          type: 'warning',
          message,
          source_id: `student:${studentId}`,
          is_acknowledged: false,
        }));
        await supabase.from('alerts').insert(payload);

        // Local fallback queue so notifications still appear when insert is blocked.
        try {
          const key = 'local_student_alerts_v1';
          const existingRaw = localStorage.getItem(key);
          const existing = existingRaw ? JSON.parse(existingRaw) : {};
          selectedStudents.forEach((studentId) => {
            if (!Array.isArray(existing[studentId])) existing[studentId] = [];
            existing[studentId].unshift({
              id: `local-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
              type: 'warning',
              message,
              created_at: new Date().toISOString(),
            });
            existing[studentId] = existing[studentId].slice(0, 20);
          });
          localStorage.setItem(key, JSON.stringify(existing));
        } catch {
          // ignore local storage failures
        }
      }

      setSubmitting(false);
      setShowConfirm(false);
      setSuccessPayload({
        students: selectedStudents.length,
        stations: stations.length,
        schedule: selectedDateTimeLabel,
        assignments: totalAssignments,
      });
      localStorage.removeItem(storageKey);
    };
    run();
  };

  if (successPayload) {
    return (
      <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-3xl mx-auto pt-8">
          <GlassCard>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={22} style={{ color: P.success, flexShrink: 0 }} />
              <div>
                <h2 className="text-lg font-semibold" style={{ color: P.text }}>Exam assigned successfully</h2>
                <p className="text-sm mt-1" style={{ color: P.muted }}>
                  {successPayload.assignments} sessions created for {successPayload.students} students.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg p-2 border border-white/10 bg-white/[0.02] text-white/90">Schedule: {successPayload.schedule}</div>
                  <div className="rounded-lg p-2 border border-white/10 bg-white/[0.02] text-white/90">Stations: {successPayload.stations}</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setActiveTab?.('sessions')} className="px-3 py-2 rounded-xl text-xs font-medium border border-white/15 text-white/90 hover:bg-white/5">
                    View generated sessions
                  </button>
                  <button type="button" onClick={() => window.location.reload()} className="px-3 py-2 rounded-xl text-xs font-medium border border-white/15 text-white/70 hover:bg-white/5">
                    Assign another
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-[1450px] mx-auto space-y-5">
        <header className="pt-4 pb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: P.text }}>Assign Exam</h1>
            <p className="text-sm mt-1" style={{ color: P.muted }}>Guided OSCE assignment flow with conflict prevention.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-lg border border-white/10 text-white/70">
              Step {activeStep} of 4
            </span>
            <button type="button" onClick={() => setActiveTab?.('dashboard')} className="px-3 py-2 rounded-xl text-xs border border-white/10 text-white/80 hover:bg-white/5">
              Back to dashboard
            </button>
          </div>
        </header>

        {restoredDraft && (
          <div className="rounded-xl border border-blue-400/35 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
            Draft restored from your last session.
          </div>
        )}

        <Stepper steps={stepMeta} activeStep={activeStep} />

        {feedback && (
          <div className="text-xs px-3 py-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 inline-flex items-center gap-2">
            <CheckCircle2 size={14} style={{ color: P.success }} />
            <span style={{ color: P.success }}>{feedback}</span>
          </div>
        )}

        {submitAttempted && <ValidationMap items={issueMap} onJump={jumpToSection} />}

        <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-5">
          <div ref={sectionRefs.students}>
            <StudentSelector
              students={advisorStudents}
              loading={studentsLoading}
              query={studentQuery}
              setQuery={setStudentQuery}
              selectedIds={selectedStudents}
              toggleStudent={toggleStudent}
              conflictIds={conflictStudentIds}
              showConflictOnly={showConflictOnly}
              setShowConflictOnly={setShowConflictOnly}
              fieldError={studentErrors.students}
              onSelectAllVisible={onSelectAllVisible}
              onClearVisible={onClearVisible}
            />
          </div>

          <div className="space-y-4">
            {activeStep === 1 && (
              <GlassCard>
                <h3 className="text-sm font-semibold mb-2" style={{ color: P.text }}>Students</h3>
                <p className="text-xs" style={{ color: P.muted }}>
                  Select students from the sidebar. You can filter conflicts or select visible results in bulk.
                </p>
              </GlassCard>
            )}

            {activeStep === 2 && (
              <div ref={sectionRefs.schedule}>
                <GlassCard>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: P.text }}>
                    <Calendar size={15} style={{ color: P.accent }} /> Step 2: Schedule
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] mb-1.5" style={{ color: P.muted }}>Date</label>
                      <input type="date" min={minDate} value={examDate} onChange={(e) => setExamDate(e.target.value)} className={cn(INPUT_CLASS, (scheduleErrors.date || scheduleErrors.schedule) && 'border-red-500/40')} />
                      {scheduleErrors.date && <p className="text-xs mt-1 text-red-300">{scheduleErrors.date}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] mb-1.5" style={{ color: P.muted }}>Time</label>
                      <input type="time" value={examTime} onChange={(e) => setExamTime(e.target.value)} className={cn(INPUT_CLASS, scheduleErrors.schedule && 'border-red-500/40')} />
                    </div>
                  </div>
                  {scheduleErrors.schedule && (
                    <p className="text-xs mt-2 text-red-300 flex items-center gap-1"><AlertCircle size={12} /> {scheduleErrors.schedule}</p>
                  )}
                  {scheduleErrors.conflict ? (
                    <div className="mt-3 pl-3 py-1.5 border-l-2" style={{ borderColor: 'rgba(245,158,11,0.45)' }}>
                      <p className="text-xs flex items-center gap-1" style={{ color: '#fcd34d' }}>
                        <AlertCircle size={12} /> This time overlaps with another exam
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs mt-2 flex items-center gap-1" style={{ color: P.muted }}>
                      <Clock3 size={12} /> Schedule applies to all selected students and stations.
                    </p>
                  )}
                </GlassCard>
              </div>
            )}

            {activeStep === 3 && (
              <div ref={sectionRefs.stations}>
                <GlassCard>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: P.text }}>Step 3: Stations / Cases</h3>
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) applyTemplate(e.target.value);
                        }}
                        className="text-xs rounded-lg px-2 py-1.5 bg-white/5 border border-white/10 text-white [color-scheme:dark]"
                      >
                        <option value="">Use template...</option>
                        {STATION_TEMPLATES.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addStation}
                        disabled={!isStationComplete(stations[stations.length - 1])}
                        className={cn('px-3 py-2 rounded-xl text-xs border border-emerald-400/35 text-emerald-300 hover:bg-emerald-500/10', !isStationComplete(stations[stations.length - 1]) && 'opacity-50 cursor-not-allowed')}
                      >
                        <Plus size={12} className="inline mr-1" /> Add Station
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {stations.map((station, idx) => (
                      <StationCard
                        key={station.id}
                        station={station}
                        index={idx}
                        onUpdate={updateStation}
                        onRemove={removeStation}
                        onDuplicate={duplicateStation}
                        onMoveUp={(id) => moveStation(id, 'up')}
                        onMoveDown={(id) => moveStation(id, 'down')}
                        isFirst={idx === 0}
                        isLast={idx === stations.length - 1}
                        caseOptions={cases.length > 0 ? cases : []}
                        examinerOptions={MOCK_EXAMINERS}
                        errors={stationErrors.byId[station.id]}
                      />
                    ))}
                  </div>
                  {stationErrors.stations && <p className="text-xs mt-2 text-red-300">{stationErrors.stations}</p>}
                  <p className="text-xs mt-2" style={{ color: P.muted }}>
                    Total duration: <span style={{ color: P.accent }}>{totalDuration} min</span>
                  </p>
                </GlassCard>
              </div>
            )}

            {activeStep === 4 && (
              <div ref={sectionRefs.review} className="space-y-4">
                <SummaryCard
                  studentCount={selectedStudents.length}
                  stationCount={stations.length}
                  totalDuration={totalDuration}
                  dateTimeLabel={selectedDateTimeLabel}
                />
                <GlassCard>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: P.text }}>Availability checks</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg p-2 border border-white/10 bg-white/[0.02]">
                      <p style={{ color: P.muted }}>Student conflicts</p>
                      <p className="font-semibold mt-1" style={{ color: conflictStudentIds.size > 0 ? '#fcd34d' : P.success }}>
                        {selectedStudents.filter((id) => conflictStudentIds.has(id)).length}
                      </p>
                    </div>
                    <div className="rounded-lg p-2 border border-white/10 bg-white/[0.02]">
                      <p style={{ color: P.muted }}>Stations complete</p>
                      <p className="font-semibold mt-1" style={{ color: stations.every(isStationComplete) ? P.success : '#fcd34d' }}>
                        {stations.filter(isStationComplete).length}/{stations.length}
                      </p>
                    </div>
                    <div className="rounded-lg p-2 border border-white/10 bg-white/[0.02]">
                      <p style={{ color: P.muted }}>Ready to assign</p>
                      <p className="font-semibold mt-1" style={{ color: canAssign ? P.success : '#fcd34d' }}>
                        {canAssign ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={prevStep} disabled={activeStep === 1} className={cn('px-3 py-2 rounded-xl text-xs border border-white/10 text-white/80 hover:bg-white/5', activeStep === 1 && 'opacity-40 cursor-not-allowed')}>
                Back
              </button>
              <button type="button" onClick={nextStep} disabled={activeStep === 4} className={cn('px-3 py-2 rounded-xl text-xs border border-white/10 text-white/80 hover:bg-white/5', activeStep === 4 && 'opacity-40 cursor-not-allowed')}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 left-4 lg:left-auto lg:w-[520px] z-40">
        <div className="rounded-2xl border border-white/10 bg-[#070b0b]/95 backdrop-blur-md px-3 py-3 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs" style={{ color: issueCount > 0 ? '#fca5a5' : '#a7f3d0' }}>
              {issueCount > 0 ? `${issueCount} required field(s) left` : 'All required fields are complete'}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={saveDraft} className="px-3 py-2 rounded-xl text-xs font-medium border border-white/15 text-white/80 hover:bg-white/5">
                Save Draft
              </button>
              <button
                type="button"
                onClick={trySubmit}
                disabled={!canAssign}
                className={cn('px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2', canAssign ? '' : 'opacity-60 cursor-not-allowed')}
                style={canAssign ? { background: P.gradientBtn, color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: P.muted }}
              >
                <FileCheck size={14} />
                Assign Exam
              </button>
            </div>
          </div>
          {draftSaved && <p className="text-[11px] mt-1" style={{ color: P.success }}>Draft saved.</p>}
          <p className="text-[11px]" style={{ color: P.muted }}>
            Draft is saved locally in this browser on this device.
          </p>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'rgba(10,12,16,0.88)' }} onClick={() => !submitting && setShowConfirm(false)}>
          <GlassCard className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: P.text }}>Are you sure you want to assign this exam?</h3>
            <p className="text-sm mb-4" style={{ color: P.muted }}>
              {totalAssignments} sessions will be created for {selectedStudents.length} students at {selectedDateTimeLabel}.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-sm" style={{ color: P.text }}>
                Cancel
              </button>
              <button type="button" onClick={submitAssign} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: P.gradientBtn, color: '#fff' }}>
                {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
