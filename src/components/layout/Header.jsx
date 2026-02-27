import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Header() {
    const { user, profile } = useAuth();
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

    return (
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-foreground">Welcome back, {displayName}</h2>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    System Operational
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                        type="text"
                        placeholder="Search stations, students..."
                        className="h-9 pl-9 pr-4 rounded-md bg-muted/50 border border-transparent focus:border-ring focus:bg-background text-sm outline-none w-64 transition-all"
                    />
                </div>

                <button className="relative p-2 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-card" />
                </button>
            </div>
        </header>
    );
}
