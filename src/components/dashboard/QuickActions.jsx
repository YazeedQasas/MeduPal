import { PlayCircle, BarChart2, Activity, Settings2, Users } from 'lucide-react';

export function QuickActions({
  onStartSession,
  onViewAnalytics,
  onRunDiagnostics,
  onManageStudents,
  onOpenSettings,
} = {}) {
  return (
    <div
      className="bg-card rounded-2xl border border-border shadow-[0_0_0_1px_rgba(0,0,0,0.4)] p-4 flex flex-col justify-center gap-3"
      style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))' }}
    >
      <h3 className="font-semibold text-primary mb-1">Quick Actions</h3>

      <button
        type="button"
        onClick={onStartSession}
        className="w-full flex items-center gap-2 p-2.5 bg-background/80 rounded-xl border border-border hover:border-primary/30 transition-all text-sm font-medium text-foreground text-left group disabled:opacity-60 disabled:hover:border-border"
        disabled={!onStartSession}
      >
        <div className="p-1.5 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <PlayCircle size={16} />
        </div>
        Start new session
      </button>

      <button
        type="button"
        onClick={onManageStudents}
        className="w-full flex items-center gap-2 p-2.5 bg-background/80 rounded-xl border border-border hover:border-primary/30 transition-all text-sm font-medium text-foreground text-left group disabled:opacity-60 disabled:hover:border-border"
        disabled={!onManageStudents}
      >
        <div className="p-1.5 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Users size={16} />
        </div>
        Manage students & advisees
      </button>

      <button
        type="button"
        onClick={onViewAnalytics}
        className="w-full flex items-center gap-2 p-2.5 bg-background/80 rounded-xl border border-border hover:border-primary/30 transition-all text-sm font-medium text-foreground text-left group disabled:opacity-60 disabled:hover:border-border"
        disabled={!onViewAnalytics}
      >
        <div className="p-1.5 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <BarChart2 size={16} />
        </div>
        Performance & analytics
      </button>

      <button
        type="button"
        onClick={onRunDiagnostics}
        className="w-full flex items-center gap-2 p-2.5 bg-background/80 rounded-xl border border-border hover:border-primary/30 transition-all text-sm font-medium text-foreground text-left group disabled:opacity-60 disabled:hover:border-border"
        disabled={!onRunDiagnostics}
      >
        <div className="p-1.5 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Activity size={16} />
        </div>
        Run hardware diagnostics
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        className="w-full flex items-center gap-2 p-2.5 bg-background/80 rounded-xl border border-border hover:border-primary/30 transition-all text-sm font-medium text-foreground text-left group disabled:opacity-60 disabled:hover:border-border"
        disabled={!onOpenSettings}
      >
        <div className="p-1.5 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Settings2 size={16} />
        </div>
        Open settings
      </button>
    </div>
  );
}

