import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Plus,
    User,
    Cpu,
    GraduationCap,
    Mail,
    MoreVertical,
    ArrowUpRight,
    Briefcase,
    UserPlus,
    UserMinus,
    Calendar,
    Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CreateStudentForm } from './CreateStudentForm';
import { CreateSessionForm } from './CreateSessionForm';
import { StudentProfile } from './StudentProfile';

export function Students() {
    const { user, profile, role } = useAuth();
    const isInstructor = role === 'faculty' || role === 'instructor' || role === 'admin';

    const [searchTerm, setSearchTerm] = useState('');
    const [manikins, setManikins] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [students, setStudents] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [advisorNames, setAdvisorNames] = useState({});

    const [isCreating, setIsCreating] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [sessionPreSelectStudentId, setSessionPreSelectStudentId] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [showOnlyMyAdvisees, setShowOnlyMyAdvisees] = useState(false);

    const fetchAssignments = useCallback(async () => {
        const { data } = await supabase
            .from('advisor_assignments')
            .select('id, instructor_id, student_id');
        if (data) setAssignments(data);

        if (data?.length) {
            const instructorIds = [...new Set(data.map((a) => a.instructor_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', instructorIds);
            const names = {};
            (profiles || []).forEach((p) => { names[p.id] = p.full_name || 'Instructor'; });
            setAdvisorNames(names);
        } else {
            setAdvisorNames({});
        }
    }, []);

    const fetchStudentsData = useCallback(async () => {
        const { data: studentsData } = await supabase
            .from('profiles')
            .select('id, full_name, email, created_at')
            .eq('role', 'student')
            .order('created_at', { ascending: false });

        const { data: profsData } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'faculty');

        const { data: manikinsData } = await supabase.from('manikins').select('*');

        if (studentsData) {
            const formatted = studentsData.map((p) => ({
                id: p.id,
                name: p.full_name || 'Unnamed',
                full_name: p.full_name || 'Unnamed',
                email: p.email || '',
                assignedProfessor: '—',
                avgScore: 0,
                totalSessions: 0,
                status: 'Offline',
                lastActivity: p.created_at ? new Date(p.created_at).toLocaleDateString() : '—',
                created_at: p.created_at,
            }));
            setStudents(formatted);
        }
        if (profsData) setProfessors(profsData);
        if (manikinsData) setManikins(manikinsData);
    }, []);

    useEffect(() => {
        fetchStudentsData();
        fetchAssignments();
    }, [fetchStudentsData, fetchAssignments]);

    const assignmentByStudent = {};
    assignments.forEach((a) => {
        assignmentByStudent[a.student_id] = {
            id: a.id,
            instructor_id: a.instructor_id,
            advisorName: advisorNames[a.instructor_id] || '—',
        };
    });

    const myAdviseeIds = user?.id
        ? assignments.filter((a) => a.instructor_id === user.id).map((a) => a.student_id)
        : [];

    const studentsWithAdvisor = students.map((s) => {
        const a = assignmentByStudent[s.id];
        const isAdvisedByMe = a && a.instructor_id === user?.id;
        return {
            ...s,
            advisorId: a?.instructor_id ?? null,
            advisorName: a?.advisorName ?? null,
            assignmentId: a?.id ?? null,
            isAdvisedByMe: !!isAdvisedByMe,
        };
    });

    const handleAdvise = async (studentId) => {
        if (!user?.id) return;
        setActionLoading(studentId);
        const { error } = await supabase.from('advisor_assignments').insert([
            { instructor_id: user.id, student_id: studentId },
        ]);
        if (error) {
            if (error.code === '23505') alert('This student is already advised by another instructor.');
            else alert(error.message);
        } else {
            await fetchAssignments();
        }
        setActionLoading(null);
    };

    const handleUnadvise = async (studentId) => {
        if (!user?.id) return;
        setActionLoading(studentId);
        const assignment = assignments.find((a) => a.student_id === studentId && a.instructor_id === user.id);
        if (assignment) {
            await supabase.from('advisor_assignments').delete().eq('id', assignment.id);
            await fetchAssignments();
        }
        setActionLoading(null);
    };

    const openAssignSession = (studentId) => {
        setSessionPreSelectStudentId(studentId || null);
        setIsCreatingSession(true);
    };

    const filteredStudents = studentsWithAdvisor.filter((student) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
            student.name.toLowerCase().includes(term) ||
            (student.email && student.email.toLowerCase().includes(term)) ||
            (student.id && student.id.toLowerCase().includes(term))
        );
        const matchesAdviseeFilter = !isInstructor || !showOnlyMyAdvisees || myAdviseeIds.includes(student.id);
        return matchesSearch && matchesAdviseeFilter;
    });

    if (selectedStudent) {
        return (
            <StudentProfile
                student={selectedStudent}
                onBack={() => setSelectedStudent(null)}
            />
        );
    }

    return (
        <div className="space-y-6 relative">
            {isCreating && (
                <CreateStudentForm
                    onClose={() => setIsCreating(false)}
                    onCreated={fetchStudentsData}
                />
            )}
            {isCreatingSession && (
                <CreateSessionForm
                    onClose={() => { setIsCreatingSession(false); setSessionPreSelectStudentId(null); }}
                    onCreated={() => { setIsCreatingSession(false); setSessionPreSelectStudentId(null); }}
                    advisedStudentIds={isInstructor ? myAdviseeIds : null}
                    defaultStudentId={sessionPreSelectStudentId}
                />
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Students</h1>
                    <p className="text-muted-foreground mt-1">
                        {isInstructor
                            ? 'Recent sign-ins. Advise students to assign sessions to them; only you can unadvise or assign sessions to your advisees.'
                            : 'Manage student assignments and track academic progress.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} />
                        About students
                    </button>
                </div>
            </div>

            {isInstructor && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                        {myAdviseeIds.length > 0
                            ? <>You advise <strong>{myAdviseeIds.length}</strong> student{myAdviseeIds.length !== 1 ? 's' : ''}. You can assign sessions only to your advisees.</>
                            : 'View all students or filter to your advisees.'}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground mr-1">View:</span>
                        <button
                            type="button"
                            onClick={() => setShowOnlyMyAdvisees(false)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                !showOnlyMyAdvisees ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            All students
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowOnlyMyAdvisees(true)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                showOnlyMyAdvisees ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            My advisees ({myAdviseeIds.length})
                        </button>
                        {myAdviseeIds.length > 0 && (
                            <button
                                type="button"
                                onClick={() => openAssignSession()}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                            >
                                <Calendar size={16} />
                                New session
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-white/5 rounded-xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Cpu size={64} className="text-blue-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Cpu size={20} />
                        </div>
                        <h3 className="font-semibold text-foreground">Active Manikin</h3>
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg font-bold text-foreground">{manikins[0]?.name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">ID: {manikins[0]?.id || 'N/A'} • Status: <span className="text-emerald-500 font-medium">Online</span></p>
                    </div>
                </div>

                <div className="bg-card border border-white/5 rounded-xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Briefcase size={64} className="text-purple-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <Briefcase size={20} />
                        </div>
                        <h3 className="font-semibold text-foreground">Faculty Staff</h3>
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg font-bold text-foreground">{professors.length} Professors</p>
                        <p className="text-xs text-muted-foreground">Assigned to {manikins[0]?.id || 'Manikin'}</p>
                    </div>
                </div>

                <div className="bg-card border border-white/5 rounded-xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <GraduationCap size={64} className="text-emerald-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <GraduationCap size={20} />
                        </div>
                        <h3 className="font-semibold text-foreground">Enrolled Students</h3>
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg font-bold text-foreground">{students.length} Students</p>
                        <p className="text-xs text-muted-foreground">
                            {isInstructor && myAdviseeIds.length > 0 ? `${myAdviseeIds.length} your advisees` : 'Tracking faculty groups'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                    type="text"
                    placeholder="Search students by name or email..."
                    className="w-full bg-card border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredStudents.map((student) => {
                    const loading = actionLoading === student.id;
                    return (
                        <div key={student.id} className="bg-card border border-white/5 rounded-xl p-5 hover:border-primary/40 hover:shadow-lg transition-all duration-200">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground border-2 border-border">
                                            {student.name.split(' ').map((n) => n[0]).join('')}
                                        </div>
                                        <div
                                            className={cn(
                                                'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card',
                                                student.status === 'Online' ? 'bg-emerald-500' :
                                                student.status === 'In Session' ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground'
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground flex items-center gap-2">
                                            {student.name}
                                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]" title={student.id}>
                                                {student.email || student.id?.slice(0, 8)}
                                            </span>
                                        </h3>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Mail size={12} /> {student.email}
                                        </p>
                                    </div>
                                </div>
                                <button className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground" aria-label="More options">
                                    <MoreVertical size={18} />
                                </button>
                            </div>

                            {isInstructor && (
                                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Advisor</p>
                                    <p className="text-xs font-semibold text-foreground">
                                        {student.isAdvisedByMe
                                            ? 'Advised by you'
                                            : student.advisorName
                                                ? `Advised by ${student.advisorName}`
                                                : 'Not advised'}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="p-3 bg-muted/30 rounded-lg">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Role</p>
                                    <p className="text-xs font-semibold text-foreground">Student</p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Sessions</p>
                                    <p className="text-xs font-bold text-foreground">{student.totalSessions}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/5">
                                {isInstructor && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {!student.advisorId && (
                                            <button
                                                type="button"
                                                disabled={loading}
                                                onClick={() => handleAdvise(student.id)}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"
                                            >
                                                {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                                                Advise
                                            </button>
                                        )}
                                        {student.isAdvisedByMe && (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => handleUnadvise(student.id)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground"
                                                >
                                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                                                    Unadvise
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openAssignSession(student.id)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                                                >
                                                    <Calendar size={14} />
                                                    Assign session
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                                <button
                                    onClick={() => setSelectedStudent(student)}
                                    className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-all ml-auto"
                                >
                                    View Profile
                                    <ArrowUpRight size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
