import { LayoutDashboard, FileText, Users as UsersIcon, HardDrive, Settings, Activity, LogOut, GraduationCap, UserCog } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', adminOnly: true },
    { icon: FileText, label: 'Cases', id: 'cases' },
    { icon: Activity, label: 'Sessions', id: 'sessions' },
    { icon: GraduationCap, label: 'Students', id: 'students' },
    { icon: HardDrive, label: 'Hardware & Sensors', id: 'hardware' },
    { icon: Settings, label: 'Settings', id: 'settings', adminOnly: true },
    { icon: UserCog, label: 'Users', id: 'users', adminOnly: true },
];

export function Sidebar({ activeTab, setActiveTab }) {
    const { user, profile, role, signOut } = useAuth();
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
    const displayEmail = user?.email || profile?.email || '';

    const handleSignOut = async () => {
        await signOut();
        setActiveTab('landing');
    };

    return (
        <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
            <div className="p-6 flex items-center gap-3 border-b border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    <Activity size={20} />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">MeduPal</span>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navItems
                    .filter((item) => !item.adminOnly || role === 'admin')
                    .map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                            activeTab === item.id
                                ? "bg-primary/10 text-primary shadow-sm"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                    >
                        <item.icon size={18} />
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-border/50 space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition"
                >
                    <LogOut size={16} />
                    Log out
                </button>
            </div>
        </aside>
    );
}
