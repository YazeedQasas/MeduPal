import React, { useState, useEffect, useCallback } from 'react';

import {
    Search,
    Filter,
    Plus,
    Play,
    CheckCircle2,
    Clock,
    Calendar,
    Users,
    MoreVertical,
    ChevronRight,
    Activity,
    AlertCircle,
    Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { formatExamStation } from '../../lib/examStationDisplay';
import { useAuth } from '../../context/AuthContext';
import { CreateSessionForm } from './CreateSessionForm';
import SessionTypeSelect from './SessionTypeSelect';
import SessionWorkspace from './SessionWorkspace';
import StudentPracticeFlow from './StudentPracticeFlow';
import { HistoryEvalReview } from './HistoryEvalReview';
import {
    pickHistoryEval,
    pickPhysicalEval,
    historyEvalStatusLabel,
    physicalEvalStatusLabel,
    fetchEvaluationsForSessions,
    HISTORY_EVAL_TYPE,
    PHYSICAL_EVAL_TYPE,
} from '../../lib/historyEvaluations';
import {
    canJoinExamSession,
    canInstructorStartExam,
    autoCompleteExpiredSessions,
    joinSession,
    startExamSession,
    sessionToPracticeLaunch,
    isExamSession,
} from '../../lib/joinSession';

function Sessions() {
    const { user, role } = useAuth();
    const isInstructor = role === 'instructor' || role === 'admin';
    const isInstructorOnly = role === 'instructor';
    const [advisedStudentIds, setAdvisedStudentIds] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sessions, setSessions] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [showTypeSelect, setShowTypeSelect] = useState(false);
    const [selectedMode, setSelectedMode] = useState(null);
    const [activeSession, setActiveSession] = useState(null);
    const [clockTick, setClockTick] = useState(0);
    const [showPractice, setShowPractice] = useState(false);
    const [examLaunch, setExamLaunch] = useState(null);
    const [sessionActionBusy, setSessionActionBusy] = useState(null);
    const [reviewSession, setReviewSession] = useState(null);

    const fetchMyAdvisees = useCallback(async () => {
        if (!isInstructorOnly) {
            setAdvisedStudentIds([]);
            return;
        }
        if (!user?.id) return;
        const { data } = await supabase
            .from('advisor_assignments')
            .select('student_id')
            .eq('instructor_id', user.id);
        setAdvisedStudentIds((data || []).map((r) => r.student_id));
    }, [isInstructorOnly, user?.id]);

    useEffect(() => {
        fetchMyAdvisees();
    }, [fetchMyAdvisees]);

    const [stats, setStats] = useState([
        { label: 'Active Sessions', value: '0', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Completed Today', value: '0', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Upcoming', value: '0', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Avg. Score', value: '0%', icon: Play, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ]);

    const fetchSessions = useCallback(async () => {
        if (!user?.id) return;

        await autoCompleteExpiredSessions();

        let query = supabase
            .from('sessions')
            .select(`
                *,
                student:profiles!student_id(full_name),
                case:cases(title),
                station:stations(name, room_number, location),
                examiner:profiles!examiner_id(full_name),
                history_eval:history_evaluations(
                    evaluation_type,
                    final_percent,
                    ai_percent,
                    review_status,
                    released_to_student,
                    items_covered,
                    total_items
                )
            `)
            .order('start_time', { ascending: false });

        // Instructors only see their own sessions; admins see all
        if (role === 'instructor') {
            query = query.eq('examiner_id', user.id);
        }

        const { data } = await query;

        if (data) {
            const examIds = data
                .filter((s) => (s.session_type ?? s.type) === 'exam')
                .map((s) => s.id);
            const { history: historyEvalMap, physical: physicalEvalMap } =
                await fetchEvaluationsForSessions(examIds);

            const formatted = data.map(s => ({
                id: s.id.split('-')[0],
                fullId: s.id,
                caseTitle: s.case?.title || 'Unknown Case',
                caseId: s.case_id,
                student: s.student?.full_name || 'Unknown',
                examiner: s.examiner?.full_name || 'Unknown',
                date: new Date(s.start_time).toLocaleString(),
                duration: s.end_time
                    ? `${Math.max(1, Math.round((new Date(s.end_time) - new Date(s.start_time)) / 60000))} min`
                    : '—',
                status: s.status,
                score: s.score,
                sessionType: s.session_type ?? s.type ?? 'practice',
                station: s.station?.name || '—',
                roomName: formatExamStation(s.station, s.room_name),
                startTime: s.start_time,
                endTime: s.end_time,
                historyEval: pickHistoryEval(s.history_eval) || historyEvalMap[s.id] || null,
                physicalEval: pickPhysicalEval(s.history_eval) || physicalEvalMap[s.id] || null,
            }));
            setSessions(formatted);

            // Compute live stats
            const todayStr = new Date().toDateString();
            const active    = formatted.filter(s => s.status === 'In Progress').length;
            const doneToday = formatted.filter(s => s.status === 'Completed' && new Date(s.startTime).toDateString() === todayStr).length;
            const upcoming  = formatted.filter(s => s.status === 'Scheduled').length;
            const scored    = formatted.filter(s => s.score != null);
            const avgScore  = scored.length
                ? Math.round(scored.reduce((sum, s) => sum + (s.score <= 10 ? s.score * 10 : s.score), 0) / scored.length)
                : null;

            setStats([
                { label: 'Active Sessions',  value: String(active),              icon: Activity,    color: 'text-blue-500',    bg: 'bg-blue-500/10' },
                { label: 'Completed Today',  value: String(doneToday),           icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Upcoming',         value: String(upcoming),            icon: Clock,       color: 'text-amber-500',   bg: 'bg-amber-500/10' },
                { label: 'Avg. Score',       value: avgScore != null ? `${avgScore}%` : '—', icon: Play, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            ]);
        }
    }, [user?.id, role]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    useEffect(() => {
        const id = setInterval(() => {
            setClockTick((t) => t + 1);
            fetchSessions();
        }, 30000);
        return () => clearInterval(id);
    }, [fetchSessions]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this session?")) {
            const { error } = await supabase.from('sessions').delete().eq('id', id);
            if (error) {
                console.error("Error deleting session:", error);
                alert(`Error deleting session: ${error.message}`);
            } else {
                fetchSessions();
            }
        }
    };

    const handleStartExam = async (session) => {
        if (!isInstructor) return;
        setSessionActionBusy(session.fullId);
        const result = await startExamSession(session.fullId);
        setSessionActionBusy(null);
        if (!result.ok) {
            alert(result.error);
            return;
        }
        fetchSessions();
    };

    const handleJoin = async (session) => {
        if (!isInstructor) return;
        const row = { session_type: session.sessionType, status: session.status };
        if (!isExamSession(row)) return;
        if (!canJoinExamSession(row)) {
            alert('JOIN is only available when the exam is In Progress. Use Start first if it is still Scheduled.');
            return;
        }
        setSessionActionBusy(session.fullId);
        const result = await joinSession(session.fullId);
        setSessionActionBusy(null);
        if (!result.ok) {
            alert(result.error);
            return;
        }
        setExamLaunch(sessionToPracticeLaunch(result.session, session.caseTitle, {
            studentName: session.student,
        }));
    };

    const handleStartSession = () => {
        if (isInstructor) {
            setIsCreating(true);
        } else {
            setShowPractice(true);
        }
    };

    const handleTypeSelect = (mode) => {
        setSelectedMode(mode);
        setShowTypeSelect(false);
        if (mode === 'training') {
            // TODO: Later replace with real session creation via CreateSessionForm
            // For now, directly start a local training session
            setActiveSession({
                id: 'local-training-1',
                type: 'training',
                caseName: 'Training Case (placeholder)',
                stationName: 'Training Station (placeholder)'
            });
        }
    };

    const handleExitSession = () => {
        setActiveSession(null);
    };

    const filteredSessions = sessions.filter(session => {
        const matchesSearch = session.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (session.roomName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || session.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    if (activeSession) {
        return (
            <SessionWorkspace
                session={activeSession}
                onExit={handleExitSession}
            />
        );
    }

    if (examLaunch) {
        return (
            <StudentPracticeFlow
                assignedSession={examLaunch}
                onExit={() => {
                    setExamLaunch(null);
                    fetchSessions();
                }}
            />
        );
    }

    if (showPractice) {
        return (
            <StudentPracticeFlow
                onExit={() => setShowPractice(false)}
            />
        );
    }

    return (
        <div className="space-y-6 relative">
            {reviewSession && (
                <HistoryEvalReview
                    sessionId={reviewSession.fullId}
                    studentName={reviewSession.student}
                    caseTitle={reviewSession.caseTitle}
                    evaluationType={reviewSession.evaluationType || HISTORY_EVAL_TYPE}
                    onClose={() => setReviewSession(null)}
                    onUpdated={fetchSessions}
                />
            )}
            {showTypeSelect && (
                <SessionTypeSelect
                    onClose={() => setShowTypeSelect(false)}
                    onSelect={handleTypeSelect}
                />
            )}

            {isCreating && (
                <CreateSessionForm
                    onClose={() => setIsCreating(false)}
                    onCreated={() => { fetchSessions(); fetchMyAdvisees(); }}
                    advisedStudentIds={isInstructorOnly ? advisedStudentIds : null}
                    sessionMode={selectedMode}
                />
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">OSCE Sessions</h1>
                    <p className="text-muted-foreground mt-1">Monitor live exams and review historical performance data.</p>
                </div>
                {!isInstructor && (
                    <button
                        onClick={handleStartSession}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <Play size={18} />
                        Practice
                    </button>
                )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-card border border-white/5 rounded-xl p-4 flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bg, stat.color)}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                            <p className="text-xl font-bold text-foreground">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Search by student, case, room or ID..."
                        className="w-full bg-card border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['All', 'In Progress', 'Completed', 'Scheduled'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                statusFilter === status
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "bg-card border border-white/5 text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sessions Table/List */}
            <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-muted/30 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session & Student</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Case Scenerio</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Performace</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredSessions.map((session) => {
                                const examRow = {
                                    session_type: session.sessionType,
                                    status: session.status,
                                    start_time: session.startTime,
                                    end_time: session.endTime,
                                };
                                const canStart = isInstructor
                                    && session.sessionType === 'exam'
                                    && session.status === 'Scheduled'
                                    && canInstructorStartExam(examRow);
                                void clockTick;

                                return (
                                <tr key={session.id} className="group hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                {session.student.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{session.student}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono">{session.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-foreground">{session.caseTitle}</div>
                                        {session.sessionType === 'exam' && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">Exam</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-foreground">
                                            {session.roomName || (session.sessionType === 'exam' ? '—' : session.station)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                            session.status === 'In Progress' ? "bg-blue-500/10 text-blue-500 animate-pulse" :
                                                session.status === 'Completed' ? "bg-emerald-500/10 text-emerald-500" :
                                                    "bg-amber-500/10 text-amber-500"
                                        )}>
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                session.status === 'In Progress' ? "bg-blue-500" :
                                                    session.status === 'Completed' ? "bg-emerald-500" :
                                                        "bg-amber-500"
                                            )} />
                                            {session.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-foreground">{session.date}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Clock size={12} /> Duration: {session.duration}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {session.sessionType === 'exam' && (session.historyEval || session.physicalEval) ? (
                                            <div className="inline-flex flex-col items-end gap-1">
                                                {session.historyEval && (
                                                    <div className="inline-flex flex-col items-end gap-0.5">
                                                        <span className={cn(
                                                            "text-sm font-bold",
                                                            session.historyEval.released_to_student
                                                                ? (session.historyEval.final_percent >= 70 ? "text-emerald-500" :
                                                                    session.historyEval.final_percent >= 50 ? "text-amber-500" : "text-destructive")
                                                                : "text-muted-foreground"
                                                        )}>
                                                            H {session.historyEval.released_to_student
                                                                ? `${session.historyEval.final_percent}%`
                                                                : `${session.historyEval.final_percent}% (draft)`}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {historyEvalStatusLabel(session.historyEval)}
                                                        </span>
                                                    </div>
                                                )}
                                                {session.physicalEval && (
                                                    <div className="inline-flex flex-col items-end gap-0.5">
                                                        <span className={cn(
                                                            "text-sm font-bold",
                                                            session.physicalEval.released_to_student
                                                                ? (session.physicalEval.final_percent >= 70 ? "text-emerald-500" :
                                                                    session.physicalEval.final_percent >= 50 ? "text-amber-500" : "text-destructive")
                                                                : "text-muted-foreground"
                                                        )}>
                                                            P {session.physicalEval.released_to_student
                                                                ? `${session.physicalEval.final_percent}%`
                                                                : `${session.physicalEval.final_percent}% (draft)`}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {physicalEvalStatusLabel(session.physicalEval)}
                                                        </span>
                                                    </div>
                                                )}
                                                {session.score != null && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Combined {session.score}%
                                                    </span>
                                                )}
                                            </div>
                                        ) : session.score ? (
                                            <div className="inline-flex flex-col items-end">
                                                <div className={cn(
                                                    "text-sm font-bold",
                                                    session.score >= 80 ? "text-emerald-500" :
                                                        session.score >= 50 ? "text-amber-500" : "text-destructive"
                                                )}>
                                                    {session.score <= 10 ? `${session.score}/10` : `${session.score}%`}
                                                </div>
                                                <div className="w-16 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full",
                                                            session.score >= 80 ? "bg-emerald-500" :
                                                                session.score >= 50 ? "bg-amber-500" : "bg-destructive"
                                                        )}
                                                        style={{ width: `${session.score <= 10 ? session.score * 10 : session.score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : session.historyEval ? (
                                            <span className="text-sm font-semibold text-foreground">
                                                {session.historyEval.final_percent}%
                                            </span>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {canStart && (
                                                <button
                                                    type="button"
                                                    disabled={sessionActionBusy === session.fullId}
                                                    onClick={() => handleStartExam(session)}
                                                    className="text-amber-400 hover:text-amber-300 text-xs font-bold px-3 py-1 border border-amber-500/30 rounded hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                                                >
                                                    {sessionActionBusy === session.fullId ? '…' : 'START'}
                                                </button>
                                            )}
                                            {isInstructor && session.sessionType === 'exam' && session.status === 'In Progress' && (
                                                <button
                                                    type="button"
                                                    disabled={sessionActionBusy === session.fullId}
                                                    onClick={() => handleJoin(session)}
                                                    className="text-primary hover:text-primary/80 text-xs font-bold px-3 py-1 border border-primary/20 rounded hover:bg-primary/10 transition-colors disabled:opacity-50"
                                                >
                                                    {sessionActionBusy === session.fullId ? '…' : 'JOIN'}
                                                </button>
                                            )}
                                            {isInstructor && session.sessionType === 'exam' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReviewSession({ ...session, evaluationType: HISTORY_EVAL_TYPE })}
                                                        className={cn(
                                                            "text-xs font-bold px-2 py-1 border rounded transition-colors",
                                                            session.historyEval
                                                                ? "text-emerald-400 hover:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                                                                : "text-muted-foreground border-white/10 hover:bg-muted/30"
                                                        )}
                                                        title={session.historyEval ? 'Review history score' : 'No history score saved yet'}
                                                    >
                                                        H
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReviewSession({ ...session, evaluationType: PHYSICAL_EVAL_TYPE })}
                                                        className={cn(
                                                            "text-xs font-bold px-2 py-1 border rounded transition-colors",
                                                            session.physicalEval
                                                                ? "text-sky-400 hover:text-sky-300 border-sky-500/30 hover:bg-sky-500/10"
                                                                : "text-muted-foreground border-white/10 hover:bg-muted/30"
                                                        )}
                                                        title={session.physicalEval ? 'Review physical score' : 'No physical score saved yet'}
                                                    >
                                                        P
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDelete(session.fullId)}
                                                className="p-2 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive transition-colors"
                                                title="Delete Session"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export { Sessions };
export default Sessions;
