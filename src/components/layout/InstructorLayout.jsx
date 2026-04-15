import { Activity, Search, LogOut, LayoutDashboard, FileCheck, Users, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MedicalCrossIcon } from '../ui/MedicalCrossIcon';
import { cn } from '../../lib/utils';

const INSTRUCTOR_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assign-exam', label: 'Assign Exam', icon: FileCheck },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'sessions', label: 'Sessions', icon: Calendar },
];
// Hidden from nav - used when viewing student profile

const ACCENT = '#6ee7b7';
const ACCENT_RGB = '110, 231, 183';

const GLASS = {
  nav: {
    background: 'hsl(var(--card))',
    borderBottom: `1px solid rgba(${ACCENT_RGB},0.25)`,
    backdropFilter: 'blur(12px)',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid rgba(${ACCENT_RGB},0.25)`,
    boxShadow: `0 0 20px rgba(${ACCENT_RGB},0.06)`,
    backdropFilter: 'blur(10px)',
  },
  accent: ACCENT,
  accentGlow: `rgba(${ACCENT_RGB},0.3)`,
};

export function InstructorLayout({ children, activeTab, setActiveTab }) {
  const { user, profile, signOut } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Instructor';

  const handleTabClick = (id) => {
    setActiveTab(id);
    if (id === 'assign-exam') window.history.replaceState(null, '', '/assign-exam');
    else if (id === 'dashboard') window.history.replaceState(null, '', '/dashboard');
    else if (id === 'students') window.history.replaceState(null, '', '/students');
    else if (id === 'sessions') window.history.replaceState(null, '', '/sessions');
  };

  const handleSignOut = async () => {
    await signOut();
    setActiveTab('landing');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Navigation Bar */}
      <header
        className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 shrink-0"
        style={GLASS.nav}
      >
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); handleTabClick('dashboard'); }}
          className="flex items-center gap-2 text-lg font-semibold transition-all hover:opacity-90"
          style={{ color: '#fff' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center -mr-1" style={{ background: 'rgba(110,231,183,0.12)', border: '1px solid rgba(110,231,183,0.35)' }}>
            <MedicalCrossIcon size={22} color="#6ee7b7" />
          </div>
          <span>patient</span>
        </a>

        {/* Search bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              placeholder="Search students, cases..."
              className="w-full h-10 pl-10 pr-4 rounded-xl text-sm outline-none transition-all placeholder:opacity-60"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
              }}
            />
          </div>
        </div>

        {/* Main tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
          {INSTRUCTOR_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                )}
                style={{
                  background: isActive ? `rgba(${ACCENT_RGB},0.15)` : 'transparent',
                  border: isActive ? `1px solid ${ACCENT}` : '1px solid transparent',
                  color: isActive ? ACCENT : 'rgba(255,255,255,0.7)',
                  boxShadow: isActive ? `0 0 20px ${GLASS.accentGlow}` : 'none',
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="flex items-center gap-3 ml-4">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: `rgba(${ACCENT_RGB},0.2)`, color: ACCENT }}>
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <span className="hidden lg:block text-sm font-medium" style={{ color: '#fff' }}>{displayName}</span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="p-2 rounded-xl transition-colors hover:bg-red-500/10"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {children}
      </main>
    </div>
  );
}
