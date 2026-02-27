import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const roleLabelMap = {
  admin: 'Admin',
  faculty: 'Instructor',
  instructor: 'Instructor',
  technician: 'Technician',
  student: 'Student',
};

const roleBadgeClass = {
  admin: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  faculty: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  instructor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  technician: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  student: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
};

export function ProfileSettings({ setActiveTab }) {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email ?? '—';
  const roleLabel = roleLabelMap[profile?.role] || profile?.role || 'User';
  const badgeClass = roleBadgeClass[profile?.role] || 'bg-muted text-muted-foreground border-border';

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <button
        type="button"
        onClick={() => setActiveTab('dashboard')}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={18} />
        Back to dashboard
      </button>

      <div className="bg-card rounded-2xl border border-border shadow-[0_0_0_1px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Profile settings</h1>
          <p className="text-muted-foreground text-sm">
            Your account information and role. To change name or security settings, use the main Settings page.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold border border-border">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display name</p>
                <p className="text-lg font-semibold text-foreground mt-0.5">{displayName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                <p className="text-foreground mt-0.5">{email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</p>
                <span
                  className={cn(
                    'inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider mt-1',
                    badgeClass
                  )}
                >
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="text-sm text-primary hover:underline font-medium"
            >
              Open full Settings →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
