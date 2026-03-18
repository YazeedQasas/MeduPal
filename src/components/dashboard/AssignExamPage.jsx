import { useState, useEffect, useCallback } from 'react';
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

export function AssignExamPage() {
  const { user, role } = useAuth();
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [studentId, setStudentId] = useState('');
  const [lastAssignedCount, setLastAssignedCount] = useState(0);

  const isInstructor = role === 'instructor' || role === 'admin';

  const fetchSelectedStudents = useCallback(async () => {
    if (!user?.id || !isInstructor) return;
    const { data: assignments } = await supabase
      .from('advisor_assignments')
      .select('student_id')
      .eq('instructor_id', user.id);

    if (!assignments?.length) {
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

    setSelectedStudents(profiles || []);
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

  const studentsToAssign =
    !studentId
      ? []
      : studentId === '__all__'
        ? selectedStudents
        : selectedStudents.filter((s) => s.id === studentId);

  const handleAssignExam = async (e) => {
    e.preventDefault();
    if (!caseId || !examDate || !examTime || studentsToAssign.length === 0) {
      alert('Please select a student, case, date, and time.');
      return;
    }
    const scheduledAt = new Date(`${examDate}T${examTime}`);
    if (isNaN(scheduledAt.getTime())) {
      alert('Please enter a valid date and time.');
      return;
    }
    setSubmitting(true);
    setSuccess(false);
    try {
      const inserts = studentsToAssign.map((s) => ({
        student_id: s.id,
        examiner_id: user.id,
        case_id: caseId,
        start_time: scheduledAt.toISOString(),
        status: 'Scheduled',
        session_type: 'exam',
      }));
      const { error } = await supabase.from('sessions').insert(inserts);
      if (error) throw error;
      setLastAssignedCount(inserts.length);
      setSuccess(true);
      setCaseId('');
      setExamDate('');
      setExamTime('');
      setStudentId('');
      setTimeout(() => setSuccess(false), 4000);
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <FileCheck size={24} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assign Exam</h1>
          <p className="text-sm text-muted-foreground">
            Students you advised. Go to Students and click Advise to add more.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Selected Students for Exam Assignment
        </h2>
        {selectedStudents.length === 0 ? (
          <div className={cn(CARD_CLASS, 'text-center py-12')}>
            <User size={40} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              No students selected yet.
            </p>
            <p className="text-sm text-muted-foreground/80 mt-1">
              Go to the Students page and click <strong>Advise</strong> next to a student to add them here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {selectedStudents.map((student) => (
              <div
                key={student.id}
                className={cn(CARD_CLASS, 'flex items-center gap-4')}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <User size={24} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">
                    {student.full_name || 'Unnamed'}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail size={14} />
                    {student.email || 'No email'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedStudents.length > 0 && (
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Assign Exam
          </h2>
          <form onSubmit={handleAssignExam} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                <User className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Select Student
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className={INPUT_CLASS}
                required
              >
                <option value="">Choose a student</option>
                <option value="__all__">All advised students ({selectedStudents.length})</option>
                {selectedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || 'Unnamed'} — {s.email || 'No email'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Select Case
              </label>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className={INPUT_CLASS}
                required
              >
                <option value="">Select Case</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className={INPUT_CLASS}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Time
              </label>
              <input
                type="time"
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
                className={INPUT_CLASS}
                required
              />
            </div>
            {success && (
              <p className="text-sm text-emerald-400">
                Exam assigned successfully to {lastAssignedCount} student{lastAssignedCount !== 1 ? 's' : ''}.
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <FileCheck size={18} />
                  Assign Exam
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
