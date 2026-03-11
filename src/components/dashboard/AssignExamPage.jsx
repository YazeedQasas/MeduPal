import { useState, useEffect } from 'react';
import {
  FileCheck,
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

const CARD_CLASS = 'rounded-xl border border-neutral-800 bg-[#0f1111] p-6';

export function AssignExamPage() {
  const { user, role } = useAuth();
  const [students, setStudents] = useState([]);
  const [cases, setCases] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [stationId, setStationId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [notes, setNotes] = useState('');

  const isInstructor = role === 'instructor' || role === 'faculty' || role === 'admin';

  useEffect(() => {
    if (!isInstructor) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const [studentsRes, casesRes, stationsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'student')
          .order('full_name'),
        supabase
          .from('cases')
          .select('id, title')
          .in('status', ['Published', 'Draft'])
          .order('title'),
        supabase
          .from('stations')
          .select('id, name, room_number')
          .order('name'),
      ]);

      if (studentsRes.data) setStudents(studentsRes.data);
      if (casesRes.data) setCases(casesRes.data);
      if (stationsRes.data) setStations(stationsRes.data);
      setLoading(false);
    };

    fetchData();
  }, [isInstructor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId || !caseId || !examDate || !examTime) {
      alert('Please fill in Student, Case/Station, Date, and Time.');
      return;
    }

    const selectedCase = cases.find((c) => c.id === caseId);
    const caseName = selectedCase?.title || '';

    // Combine date and time into ISO string
    const examDateTime = new Date(`${examDate}T${examTime}`);
    if (isNaN(examDateTime.getTime())) {
      alert('Please enter a valid date and time.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('exams').insert({
      student_id: studentId,
      instructor_id: user.id,
      case_id: caseId,
      case_name: caseName,
      station_id: stationId || null,
      exam_date: examDateTime.toISOString(),
      notes: notes.trim() || null,
      status: 'scheduled',
    });

    setSubmitting(false);
    if (error) {
      console.error('Assign exam error:', error);
      alert(`Error assigning exam: ${error.message}`);
      return;
    }

    setSuccess(true);
    setStudentId('');
    setCaseId('');
    setStationId('');
    setExamDate('');
    setExamTime('');
    setNotes('');

    setTimeout(() => setSuccess(false), 4000);
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

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <FileCheck size={24} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assign Exam</h1>
          <p className="text-sm text-muted-foreground">
            Assign an OSCE exam to a student
          </p>
        </div>
      </div>

      {success && (
        <div
          className={cn(
            CARD_CLASS,
            'flex items-center gap-3 border-emerald-500/30 bg-emerald-500/5'
          )}
        >
          <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-400">
            Exam assigned successfully.
          </p>
        </div>
      )}

      <div className={CARD_CLASS}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Student */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <User className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Student
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || 'Unnamed'} — {s.email || 'No email'}
                </option>
              ))}
            </select>
          </div>

          {/* Case / Station */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Case / Station
            </label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className={inputClass}
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

          {/* Station (optional) */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <MapPin className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Station <span className="text-muted-foreground/70 font-normal">(optional)</span>
            </label>
            <select
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select Station</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.room_number ? ` (Room ${s.room_number})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Date
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Time
            </label>
            <input
              type="time"
              value={examTime}
              onChange={(e) => setExamTime(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Notes (optional) */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Notes <span className="text-muted-foreground/70 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional instructions or notes..."
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
