import { ArrowLeft, User, Mail, Hash, Calendar, GraduationCap } from 'lucide-react';

export function StudentProfile({ student, onBack }) {
    if (!student) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-300">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{student.full_name}</h1>
                    <p className="text-muted-foreground text-sm">Student Profile View</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Profile Card */}
                <div className="md:col-span-1 bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold mb-2">
                            {student.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-foreground">{student.full_name}</h2>
                            <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                                Active Student
                            </span>
                        </div>
                    </div>

                    <div className="mt-8 space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <Hash className="text-muted-foreground shrink-0" size={16} />
                            <div>
                                <p className="text-muted-foreground text-xs">Student ID</p>
                                <p className="font-medium text-foreground">{student.student_identifier}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Mail className="text-muted-foreground shrink-0" size={16} />
                            <div>
                                <p className="text-muted-foreground text-xs">Email Address</p>
                                <p className="font-medium text-foreground">{student.email || 'Not provided'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <GraduationCap className="text-muted-foreground shrink-0" size={16} />
                            <div>
                                <p className="text-muted-foreground text-xs">Class Of</p>
                                <p className="font-medium text-foreground">{student.graduation_year || '2026'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance / Stats Placeholder */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-bold text-foreground mb-4">Recent Activity</h3>
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No recent simulation sessions recorded.</p>
                            <p className="text-xs mt-2 opacity-70">(This section will populate once the student completes scenarios)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Average Score</h3>
                            <p className="text-3xl font-bold text-foreground">--</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Sessions Completed</h3>
                            <p className="text-3xl font-bold text-foreground">0</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
