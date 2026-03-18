import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileCheck,
  User,
  Mail,
  Loader2,
  Calendar,
  Clock,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

const CARD_CLASS = 'rounded-xl border border-neutral-800 bg-[#0f1111] p-6';
const INPUT_CLASS = 'w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50';

export function AssignExamPage({ setActiveTab }) {
  const { user, role } = useAuth();
  // IDs of students checked for receiving the exam.
  const [selectedStudents, setSelectedStudents] = useState([]);
  // Full profile objects for students advised by this instructor (backed by advisor_assignments).
  const [advisorStudents, setAdvisorStudents] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [skippedDueToConflict, setSkippedDueToConflict] = useState(0);
  const [caseId, setCaseId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const hasInitializedSelectionRef = useRef(false);

  const isInstructor = role === 'instructor' || role === 'admin';

  const fetchSelectedStudents = useCallback(async () => {
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
    const ids = safeProfiles.map((p) => p.id);
    setAdvisorStudents(safeProfiles);

    // On first load, default to selecting all advised students.
    // After that, preserve the instructor's current checkbox selection (including empty).
    if (!hasInitializedSelectionRef.current) {
      setSelectedStudents(ids);
      hasInitializedSelectionRef.current = true;
    } else {
      const idsSet = new Set(ids);
      setSelectedStudents((prev) => prev.filter((id) => idsSet.has(id)));
    }
    setLoading(false);
  }, [user?.id, isInstructor]);

  useEffect(() => {
    if (!isInstructor) {
      setLoading(false);
      return;
    }
    const load = async () => {
      await fetchSelectedStudents();
      const { data } = await supabase
        .from('cases')
        .select('id, title')
        .in('status', ['Published', 'Draft'])
        .order('title');
      setCases(data || []);
    };
    load();
  }, [isInstructor, fetchSelectedStudents]);

  const handleAssignExam = async (e) => {
    e.preventDefault();
    if (!selectedStudents.length || !caseId || !examDate || !examTime) {
      alert('Please select students, case, date, and time.');
      return;
    }
    const scheduledAt = new Date(`${examDate}T${examTime}`);
    if (isNaN(scheduledAt.getTime())) {
      alert('Please enter a valid date and time.');
      return;
    }
    setSkippedDueToConflict(0);
    setSubmitting(true);
    setSuccess(false);
    try {
      const selectedProfiles = advisorStudents.filter((s) => selectedStudents.includes(s.id));
      if (!selectedProfiles.length) {
        alert('Please select at least one student to assign.');
        setSubmitting(false);
        return;
      }

      const selectedIds = selectedProfiles.map((p) => p.id);
      const scheduledAtIso = scheduledAt.toISOString();

      // Prevent duplicates: don't create a scheduled exam session if the student already has one at the same time.
      let existingSessions = [];
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('student_id')
          .eq('session_type', 'exam')
          .eq('start_time', scheduledAtIso)
          .in('student_id', selectedIds)
          .neq('status', 'Cancelled');
        if (error) throw error;
        existingSessions = data || [];
      } catch (err) {
        // Backward compatibility for DB schema still using `type` instead of `session_type`.
        const { data, error } = await supabase
          .from('sessions')
          .select('student_id')
          .eq('type', 'exam')
          .eq('start_time', scheduledAtIso)
          .in('student_id', selectedIds)
          .neq('status', 'Cancelled');
        if (error) throw error;
        existingSessions = data || [];
      }

      const existingIds = new Set((existingSessions || []).map((s) => s.student_id));
      const toAssignProfiles = selectedProfiles.filter((p) => !existingIds.has(p.id));
      const skippedCount = selectedProfiles.length - toAssignProfiles.length;
      setSkippedDueToConflict(skippedCount > 0 ? skippedCount : 0);

      if (!toAssignProfiles.length) {
        alert('All selected students already have an exam scheduled at this time.');
        setSubmitting(false);
        return;
      }

      const baseInserts = toAssignProfiles.map((s) => ({
        student_id: s.id,
        examiner_id: user.id,
        case_id: caseId,
        start_time: scheduledAtIso,
        status: 'Scheduled',
      }));

      // Try `session_type` first, fallback to `type`.
      let insertError = null;
      try {
        const { error } = await supabase.from('sessions').insert(
          baseInserts.map((row) => ({ ...row, session_type: 'exam' }))
        );
        insertError = error;
      } catch (err) {
        insertError = err;
      }

      if (insertError) {
        const { error: fallbackError } = await supabase.from('sessions').insert(
          baseInserts.map((row) => ({ ...row, type: 'exam' }))
        );
        if (fallbackError) throw fallbackError;
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Failed to assign exam.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isInstructor) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={CARD_CLASS}>
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <FileCheck size={28} />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Access denied</h2>
            <p className="text-sm text-muted-foreground">
              This page is for instructors only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={CARD_CLASS}>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const canAssign = selectedStudents.length > 0 && !!caseId && !!examDate && !!examTime && !submitting && !success;
  const selectedCase = cases.find((c) => c.id === caseId);
  const previewDateTime = examDate && examTime ? `${examDate} ${examTime}` : '—';
  const selectedProfilesForPreview = advisorStudents.filter((s) => selectedStudents.includes(s.id));
  const previewSelectedNames = selectedProfilesForPreview.map((s) => s.full_name || 'Unnamed');
  const previewStudentsToShow = previewSelectedNames.slice(0, 4);
  const previewExtraCount = Math.max(0, previewSelectedNames.length - previewStudentsToShow.length);

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) => {
      const isSelected = prev.includes(studentId);
      return isSelected ? prev.filter((id) => id !== studentId) : [...prev, studentId];
    });
    if (success) {
      setSuccess(false);
      setSkippedDueToConflict(0);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Selected Students */}
        <section className={CARD_CLASS}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Selected Students
            </h2>
            <div className="text-xs text-muted-foreground">
              {selectedStudents.length} selected
            </div>
          </div>

          {advisorStudents.length === 0 ? (
            <div className="text-center py-10">
              <User size={40} className="mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No students selected yet.</p>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Go to <strong>Students</strong> and click <strong>Advise</strong>.
              </p>
            </div>
          ) : (
            <div>
              {selectedStudents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Use the checkboxes below to choose who receives the exam.
                </p>
              )}
              <div className="space-y-3">
                {advisorStudents.map((student) => {
                const isChecked = selectedStudents.includes(student.id);
                return (
                <div
                  key={student.id}
                  className="flex items-start justify-between gap-3 p-3 bg-muted/20 border border-white/5 rounded-lg"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStudentSelection(student.id)}
                      disabled={submitting}
                      className="mt-1.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900/50 text-primary focus:ring-primary/50"
                      aria-label={`Select ${student.full_name || 'student'}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {student.full_name || 'Unnamed'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <Mail size={13} />
                        <span className="truncate">{student.email || 'No email'}</span>
                      </p>
                    </div>
                  </div>
                </div>
                );
                })}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: Exam setup */}
        <section className={CARD_CLASS}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <FileCheck size={24} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Assign Exam</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure the case and schedule. Students are selected from <strong>advisor_assignments</strong>.
              </p>
            </div>
          </div>

          <form onSubmit={handleAssignExam} className="space-y-4">
            {/* Select Case */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Select Case
              </label>
              <select
                value={caseId}
                onChange={(e) => {
                  setCaseId(e.target.value);
                  if (success) {
                    setSuccess(false);
                    setSkippedDueToConflict(0);
                  }
                }}
                className={INPUT_CLASS}
                required
              >
                <option value="">Select Case</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Select Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => {
                  setExamDate(e.target.value);
                  if (success) {
                    setSuccess(false);
                    setSkippedDueToConflict(0);
                  }
                }}
                className={INPUT_CLASS}
                required
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Select Time
              </label>
              <input
                type="time"
                value={examTime}
                onChange={(e) => {
                  setExamTime(e.target.value);
                  if (success) {
                    setSuccess(false);
                    setSkippedDueToConflict(0);
                  }
                }}
                className={INPUT_CLASS}
                required
              />
            </div>

            {submitting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                <span>Assigning exams...</span>
              </div>
            )}

            {success && (
              <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-400">
                  Exams assigned successfully
                </p>
                {skippedDueToConflict > 0 && (
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Skipped {skippedDueToConflict} student{skippedDueToConflict === 1 ? '' : 's'} due to a time conflict.
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccess(false);
                      setActiveTab?.('sessions');
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    View Sessions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccess(false);
                      setSkippedDueToConflict(0);
                      setCaseId('');
                      setExamDate('');
                      setExamTime('');
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border border-neutral-700 text-foreground hover:bg-neutral-800/50 transition-colors"
                  >
                    Assign Another
                  </button>
                </div>
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={!canAssign}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Assigning exams...
                </>
              ) : (
                <>
                  <FileCheck size={18} />
                  Assign Exam
                </>
              )}
            </button>
          </form>

          {/* Exam Preview */}
          <div className="mt-5 pt-5 border-t border-white/5">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
              Exam Preview
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Case</span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedCase?.title || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Students</span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedStudents.length || 0}
                </span>
              </div>
              {selectedProfilesForPreview.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Selected students</p>
                  <div className="space-y-1">
                    {previewStudentsToShow.map((name, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground truncate">{name}</span>
                      </div>
                    ))}
                    {previewExtraCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        +{previewExtraCount} more
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Date & Time</span>
                <span className="text-sm font-semibold text-foreground">
                  {previewDateTime}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
