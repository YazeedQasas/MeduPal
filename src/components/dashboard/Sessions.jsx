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
import { useAuth } from '../../context/AuthContext';
import { CreateSessionForm } from './CreateSessionForm';

function Sessions() {
    const { user, role } = useAuth();
    const isInstructor = role === 'faculty' || role === 'instructor' || role === 'admin';
    const [advisedStudentIds, setAdvisedStudentIds] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sessions, setSessions] = useState([]);
    const [isCreating, setIsCreating] = useState(false);

    const fetchMyAdvisees = useCallback(async () => {
        if (!isInstructor || !user?.id) return;
        const { data } = await supabase
            .from('advisor_assignments')
            .select('student_id')
            .eq('instructor_id', user.id);
        setAdvisedStudentIds((data || []).map((r) => r.student_id));
    }, [isInstructor, user?.id]);

    useEffect(() => {
        fetchMyAdvisees();
    }, [fetchMyAdvisees]);

    const [stats, setStats] = useState([
        { label: 'Active Sessions', value: '0', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Completed Today', value: '0', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Upcoming', value: '0', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Avg. Score', value: '0%', icon: Play, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ]);

    const fetchSessions = async () => {
        const { data, error } = await supabase
            .from('sessions')
            .select(`
                *,
                student:profiles!student_id(full_name),
                case:cases(title),
                station:stations(name),
                examiner:profiles!examiner_id(full_name)
            `)
            .order('created_at', { ascending: false });

        if (data) {
            // Transform data to match component state structure
            const formatted = data.map(s => ({
                id: s.id.split('-')[0], // reliable-ish short ID
                fullId: s.id,
                caseTitle: s.case?.title || 'Unknown Case',
                student: s.student?.full_name || 'Unknown',
                examiner: s.examiner?.full_name || 'Unknown',
                date: new Date(s.start_time).toLocaleString(),
                duration: s.end_time ? 'Completed' : '—',
                status: s.status,
                score: s.score,
                station: s.station?.name || 'Unknown'
            }));
            setSessions(formatted);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

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

    const handleJoin = (session) => {
        alert(`Joining session: ${session.caseTitle} with ${session.student}`);
        // TODO: Navigate to session runner
    };

    const filteredSessions = sessions.filter(session => {
        const matchesSearch = session.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || session.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 relative">
            {isCreating && (
                <CreateSessionForm
                    onClose={() => setIsCreating(false)}
                    onCreated={() => { fetchSessions(); fetchMyAdvisees(); }}
                    advisedStudentIds={isInstructor ? advisedStudentIds : null}
                />
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">OSCE Sessions</h1>
                    <p className="text-muted-foreground mt-1">Monitor live exams and review historical performance data.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus size={18} />
                    Start New Session
                </button>
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
                        placeholder="Search by student, case or ID..."
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
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Performace</th>
                                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredSessions.map((session) => (
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
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Calendar size={12} /> {session.station}
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
                                        {session.score ? (
                                            <div className="inline-flex flex-col items-end">
                                                <div className={cn(
                                                    "text-sm font-bold",
                                                    session.score >= 80 ? "text-emerald-500" :
                                                        session.score >= 50 ? "text-amber-500" : "text-destructive"
                                                )}>
                                                    {session.score}%
                                                </div>
                                                <div className="w-16 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full",
                                                            session.score >= 80 ? "bg-emerald-500" :
                                                                session.score >= 50 ? "bg-amber-500" : "bg-destructive"
                                                        )}
                                                        style={{ width: `${session.score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleJoin(session)}
                                                className="text-primary hover:text-primary/80 text-xs font-bold px-3 py-1 border border-primary/20 rounded hover:bg-primary/10 transition-colors"
                                            >
                                                JOIN
                                            </button>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export { Sessions };
export default Sessions;
