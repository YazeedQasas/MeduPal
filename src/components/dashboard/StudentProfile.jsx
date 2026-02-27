import { ArrowLeft, Mail, Hash, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

export function StudentProfile({ student, onBack }) {
  if (!student) return null;

  const displayName = student.full_name || 'Student';
  const username = student.email?.replace(/@.*$/, '') || 'student';
  const initials = displayName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="space-y-0 animate-in fade-in slide-in-from-right-10 duration-300">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {/* Cover — static grey */}
      <div
        className="relative h-48 md:h-64 w-full overflow-hidden rounded-b-2xl bg-muted"
        role="img"
        aria-label="Profile cover background"
      />

      <div className="container max-w-4xl mx-auto px-4 sm:px-6 pb-6">
        {/* Profile header */}
        <div className="relative -mt-8 sm:-mt-8 mb-6 sm:mb-8">
          <div className="flex items-end gap-4 sm:gap-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div
                className="h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-full border-4 bg-card shadow-xl"
                style={{ borderColor: 'hsl(var(--background))' }}
              >
                <div className="h-full w-full flex items-center justify-center text-2xl sm:text-4xl font-bold text-primary bg-primary/20">
                  {initials}
                </div>
              </div>
              <div
                className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 h-4 w-4 sm:h-5 sm:w-5 rounded-2xl border-4 bg-emerald-500"
                style={{ borderColor: 'hsl(var(--background))' }}
                aria-label="Active"
                role="status"
              />
            </motion.div>

            <div className="mb-1 sm:mb-2 space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {displayName}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                @{username}
              </p>
              <span className="inline-block mt-1 px-3 py-1 bg-primary/15 text-primary text-xs font-bold rounded-full uppercase tracking-wider border border-primary/30">
                Active Student
              </span>
            </div>
          </div>
        </div>

        {/* Details + Activity */}
        <section aria-label="Student details and activity" className="grid gap-8 md:grid-cols-[1fr,1.5fr]">
          {/* Left: User ID, Email, Role */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Hash className="text-muted-foreground shrink-0" size={16} />
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">User ID</p>
                <p className="font-medium text-foreground font-mono text-xs truncate" title={student.id}>
                  #{student.id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="text-muted-foreground shrink-0" size={16} />
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Email Address</p>
                <p className="font-medium text-foreground truncate">{student.email || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <GraduationCap className="text-muted-foreground shrink-0" size={16} />
              <div>
                <p className="text-muted-foreground text-xs">Role</p>
                <p className="font-medium text-foreground">Student</p>
              </div>
            </div>
          </div>

          {/* Right: Recent Activity + Stats */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Recent Activity</h3>
              <div className="text-center py-12 text-muted-foreground">
                <p>No recent simulation sessions recorded.</p>
                <p className="text-xs mt-2 opacity-70">
                  (This section will populate once the student completes scenarios)
                </p>
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
        </section>
      </div>
    </div>
  );
}
