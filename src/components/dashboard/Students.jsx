import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Plus,
    User,
    UserCheck,
    Cpu,
    GraduationCap,
    Mail,
    MoreVertical,
    ArrowUpRight,
    SearchCheck,
    Briefcase
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { CreateStudentForm } from './CreateStudentForm';
import { StudentProfile } from './StudentProfile';

export function Students() {
    const [searchTerm, setSearchTerm] = useState('');
    const [profFilter, setProfFilter] = useState('All Professors');
    const [manikins, setManikins] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [students, setStudents] = useState([]);

    // UI State
    const [isCreating, setIsCreating] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const fetchStudentsData = async () => {
        // Fetch students with their assigned professor
        const { data: studentsData } = await supabase
            .from('students')
            .select(`
                *,
                assigned_professor:profiles(full_name)
            `);

        // Fetch potential professors (for filter dropdown)
        const { data: profsData } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'faculty');

        const { data: manikinsData } = await supabase.from('manikins').select('*');

        if (studentsData) {
            const formatted = studentsData.map(s => ({
                id: s.student_identifier,
                name: s.full_name,
                full_name: s.full_name, // keep original keys for profile
                student_identifier: s.student_identifier, // keep original keys for profile
                email: s.email,
                graduation_year: s.graduation_year,
                year: s.year_level || 'Active', // Fallback
                assignedProfessor: s.assigned_professor?.full_name || 'Unassigned',
                avgScore: s.avg_score || 0,
                totalSessions: s.total_sessions || 0,
                status: s.status || 'Offline',
                lastActivity: s.last_activity ? new Date(s.last_activity).toLocaleDateString() : 'Never'
            }));
            setStudents(formatted);
        }
        if (profsData) setProfessors(profsData);
        if (manikinsData) setManikins(manikinsData);
    };

    useEffect(() => {
        fetchStudentsData();
    }, []);

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesProf = profFilter === 'All Professors' || student.assignedProfessor === profFilter;
        return matchesSearch && matchesProf;
    });

    // If a student is selected, show their profile view instead of the list
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

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Student Directory</h1>
                    <p className="text-muted-foreground mt-1">Manage student assignments and track academic progress.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg font-medium transition-colors border border-border">
                        <GraduationCap size={18} />
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} />
                        Add Student
                    </button>
                </div>
            </div>

            {/* Hierarchy Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-xl p-5 relative overflow-hidden group">
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

                <div className="bg-card border border-border rounded-xl p-5 relative overflow-hidden group">
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

                <div className="bg-card border border-border rounded-xl p-5 relative overflow-hidden group">
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
                        <p className="text-xs text-muted-foreground">Tracking {professors.length} faculty groups</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Search students by name or student ID..."
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <select
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
                        value={profFilter}
                        onChange={(e) => setProfFilter(e.target.value)}
                    >
                        <option>All Professors</option>
                        {professors.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                </div>
                <div className="relative">
                    <SearchCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <select className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer">
                        <option>Any Status</option>
                        <option>Online</option>
                        <option>In Session</option>
                        <option>Offline</option>
                    </select>
                </div>
            </div>

            {/* Students List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredStudents.map((student) => (
                    <div key={student.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground border-2 border-border">
                                        {student.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className={cn(
                                        "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card",
                                        student.status === 'Online' ? "bg-emerald-500" :
                                            student.status === 'In Session' ? "bg-blue-500 animate-pulse" :
                                                "bg-muted-foreground"
                                    )} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground flex items-center gap-2">
                                        {student.name}
                                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{student.id}</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Mail size={12} /> {student.email}
                                    </p>
                                </div>
                            </div>
                            <button className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground">
                                <MoreVertical size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Assigned Professor</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                        <User size={12} />
                                    </div>
                                    <p className="text-xs font-semibold text-foreground">{student.assignedProfessor}</p>
                                </div>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Learning Stats</p>
                                <div className="flex items-center gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-foreground">{student.avgScore}%</p>
                                        <p className="text-[10px] text-muted-foreground">Avg. Score</p>
                                    </div>
                                    <div className="w-px h-6 bg-border" />
                                    <div>
                                        <p className="text-xs font-bold text-foreground">{student.totalSessions}</p>
                                        <p className="text-[10px] text-muted-foreground">Sessions</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {student.year} Student
                            </div>
                            <button
                                onClick={() => setSelectedStudent(student)}
                                className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-all"
                            >
                                View Profile
                                <ArrowUpRight size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
