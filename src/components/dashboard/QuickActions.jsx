import { PlayCircle, BarChart2, Activity, Settings2 } from 'lucide-react';

export function QuickActions() {
    return (
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 shadow-sm p-4 flex flex-col justify-center gap-3">
            <h3 className="font-semibold text-primary mb-1">Quick Actions</h3>
            <button className="w-full flex items-center gap-2 p-2.5 bg-background rounded-lg border border-border/50 hover:border-primary/50 hover:shadow-md transition-all text-sm font-medium text-foreground text-left group">
                <div className="p-1.5 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <PlayCircle size={16} />
                </div>
                Start New Session
            </button>

            <button className="w-full flex items-center gap-2 p-2.5 bg-background rounded-lg border border-border/50 hover:border-primary/50 hover:shadow-md transition-all text-sm font-medium text-foreground text-left group">
                <div className="p-1.5 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <BarChart2 size={16} />
                </div>
                Detailed Analytics
            </button>

            <button className="w-full flex items-center gap-2 p-2.5 bg-background rounded-lg border border-border/50 hover:border-primary/50 hover:shadow-md transition-all text-sm font-medium text-foreground text-left group">
                <div className="p-1.5 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Activity size={16} />
                </div>
                Run Diagnostics
            </button>
        </div>
    )
}
