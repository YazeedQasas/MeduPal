import { useState, useEffect } from 'react';
import {
  FileCheck,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  User,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AssignedExamStart from './AssignedExamStart';
import { cn } from '../../lib/utils';

const CARD_CLASS = 'rounded-xl border border-neutral-800 bg-[#0f1111] p-6';

const STATUS_COLOR = {
  'Completed': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'In Progress': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Scheduled': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Cancelled': 'bg-red-500/15 text-red-400 border-red-500/25',
};

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString([], { dateStyle: 'long' });
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ExamPage({ setActiveTab }) {
  const { user, role, can_exam } = useAuth();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssignedExam, setShowAssignedExam] = useState(false);

  useEffect(() => {
    if (!user?.id || role !== 'student' || !can_exam) {
      setLoading(false);
      return;
    }

    const fetchUpcomingExam = async () => {
      // Fetch from sessions table (instructor-assigned via Assign Exam page, session_type='exam')
      const { data: sessionData } = await supabase
        .from('sessions')
        .select(
          `id, start_time, status, session_type, case:cases(title), examiner:profiles!examiner_id(full_name)`
        )
        .eq('student_id', user.id)
        .eq('session_type', 'exam')
        .eq('status', 'Scheduled')
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setExam({
          id: sessionData.id,
          case: { title: sessionData.case?.title || 'Exam' },
          start_time: sessionData.start_time,
          status: 'Scheduled',
          station: null,
          examiner: sessionData.examiner,
        });
      } else {
        // Fallback: legacy exams table
        const { data: examData } = await supabase
          .from('exams')
          .select(
            `id, exam_date, case_name, status, station:stations(name, room_number), instructor:profiles!instructor_id(full_name)`
          )
          .eq('student_id', user.id)
          .eq('status', 'scheduled')
          .order('exam_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (examData) {
          setExam({
            id: examData.id,
            case: { title: examData.case_name },
            start_time: examData.exam_date,
            status: examData.status === 'scheduled' ? 'Scheduled' : examData.status,
            station: examData.station,
            examiner: examData.instructor,
          });
        } else {
          setExam(null);
        }
      }
      setLoading(false);
    };

    fetchUpcomingExam();
  }, [user?.id, role, can_exam]);

  // Not a student or cannot take exams
  if (role !== 'student' || !can_exam) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={CARD_CLASS}>
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <FileCheck size={28} />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No exam assigned yet.</h2>
            <p className="text-sm text-muted-foreground">
              {role !== 'student'
                ? 'Exam access is available for students only.'
                : 'Ask your instructor to enable exam access in your profile settings.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={CARD_CLASS}>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading exam details...</p>
          </div>
        </div>
      </div>
    );
  }

  // No exam found
  if (!exam) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={CARD_CLASS}>
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <FileCheck size={28} />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No exam assigned yet.</h2>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any scheduled exams at this time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusCls = STATUS_COLOR[exam.status] || STATUS_COLOR['Scheduled'];
  const stationName =
    exam.station?.name ||
    (exam.station?.room_number ? `Room ${exam.station.room_number}` : null) ||
    '—';
  const examinerName = exam.examiner?.full_name || 'Instructor';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Exam</h1>

      <div className={CARD_CLASS}>
        {/* Card header with exam icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <FileCheck size={24} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Exam Information</h2>
            <p className="text-xs text-muted-foreground">Your upcoming OSCE examination</p>
          </div>
        </div>

        {/* Exam details */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <ClipboardList className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Title</p>
              <p className="text-sm font-semibold text-foreground">
                Scheduled OSCE exam
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Instructor</p>
              <p className="text-sm font-semibold text-foreground">{examinerName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Date</p>
              <p className="text-sm font-semibold text-foreground">{fmtDate(exam.start_time)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Time</p>
              <p className="text-sm font-semibold text-foreground">{fmtTime(exam.start_time)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Location / Station
              </p>
              <p className="text-sm font-semibold text-foreground">
                {stationName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Status</span>
            <span
              className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full border',
                statusCls
              )}
            >
              {exam.status || 'Scheduled'}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-neutral-800">
          <button
            type="button"
            onClick={() => setShowAssignedExam(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start Exam
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium border border-neutral-700 text-foreground hover:bg-neutral-800/50 transition-colors"
          >
            <ClipboardList size={16} />
            View Instructions
          </button>
        </div>
      </div>

      {showAssignedExam && (
        <AssignedExamStart
          onBack={() => setShowAssignedExam(false)}
          onStart={() => {
            setShowAssignedExam(false);
            setActiveTab?.('student-dashboard');
            window.history.replaceState(null, '', '/student-dashboard');
          }}
        />
      )}
    </div>
  );
}
