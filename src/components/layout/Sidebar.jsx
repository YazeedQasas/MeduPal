import { useState } from 'react';
import { LayoutDashboard, FileText, HardDrive, Settings, Activity, LogOut, GraduationCap, UserCog } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  Sidebar as SidebarUI,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from '../ui/sidebar';
import { cn } from '../../lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', adminOnly: true },
  { icon: FileText, label: 'Cases', id: 'cases' },
  { icon: Activity, label: 'Sessions', id: 'sessions' },
  { icon: GraduationCap, label: 'Students', id: 'students' },
  { icon: HardDrive, label: 'Hardware & Sensors', id: 'hardware' },
  { icon: Settings, label: 'Settings', id: 'settings', adminOnly: true },
  { icon: UserCog, label: 'Users', id: 'users', adminOnly: true },
];

function Logo() {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="font-normal flex space-x-2 items-center text-sm text-foreground py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0 flex items-center justify-center">
        <Activity className="h-3 w-3 text-primary-foreground" />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-foreground whitespace-pre"
      >
        MeduPal
      </motion.span>
    </a>
  );
}

function LogoIcon() {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="font-normal flex space-x-2 items-center text-sm text-foreground py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0 flex items-center justify-center">
        <Activity className="h-3 w-3 text-primary-foreground" />
      </div>
    </a>
  );
}

function SidebarLogo() {
  const { open } = useSidebar();
  // Logo icon is w-6 (24px). Inner collapsed width = 36px.
  // To center: (36 - 24) / 2 = 6px extra paddingLeft.
  // When open: 0px (logo has its own flex layout).
  return (
    <motion.div
      animate={{ paddingLeft: open ? 0 : 6 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {open ? <Logo /> : <LogoIcon />}
    </motion.div>
  );
}

// Match sidebar.jsx: same transition and same pattern as SidebarLink (paddingLeft + display/opacity only).
const SIDEBAR_TRANSITION = { duration: 0.3, ease: 'easeInOut' };

function SidebarUserBlock({ displayName, roleLabel, roleBadgeClass, onClick }) {
  const { open, animate } = useSidebar();
  // Collapsed width 60px, px-3 → inner 36px. Avatar w-8 = 32px → center padding 0. Open: 12px like nav items.
  const pl = animate ? (open ? 12 : 0) : 12;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={{ paddingLeft: pl }}
      transition={SIDEBAR_TRANSITION}
      className="flex items-center gap-1.5 py-2 rounded-md w-full text-left text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer"
    >
      <span className="flex-shrink-0 flex items-center justify-center w-8 h-8">
        <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
      </span>
      <motion.div
        animate={{
          display: animate ? (open ? 'flex' : 'none') : 'flex',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={SIDEBAR_TRANSITION}
        className="flex flex-col gap-0.5 min-w-0 overflow-hidden"
      >
        <span className="text-xs font-medium text-foreground truncate">{displayName}</span>
        <span
          className={cn(
            'inline-flex w-fit items-center rounded border px-1 py-px text-[8px] font-semibold uppercase tracking-wider',
            roleBadgeClass
          )}
        >
          {roleLabel}
        </span>
      </motion.div>
    </motion.button>
  );
}

export function Sidebar({ activeTab, setActiveTab }) {
  const [open, setOpen] = useState(false);
  const { user, profile, role, signOut } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    await signOut();
    setActiveTab('landing');
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.id === 'dashboard') return role === 'admin' || role === 'faculty' || role === 'instructor';
    return !item.adminOnly || role === 'admin';
  });

  const roleLabel = role === 'admin' ? 'Admin' : role === 'faculty' ? 'Instructor' : role === 'technician' ? 'Technician' : role === 'student' ? 'Student' : role || 'User';
  const roleBadgeClass = {
    admin: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    faculty: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    instructor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    technician: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    student: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  }[role] || 'bg-muted text-muted-foreground border-border';

  return (
    <SidebarUI open={open} setOpen={setOpen}>
      <SidebarBody className="gap-8">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarLogo />
          <nav className="mt-8 flex flex-col gap-2">
            {filteredNavItems.map((item) => (
              <SidebarLink
                key={item.id}
                link={{
                  label: item.label,
                  icon: (
                    <item.icon className="text-current h-5 w-5 flex-shrink-0" />
                  ),
                }}
                isActive={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 pt-4 mt-auto pb-2">
          <SidebarUserBlock displayName={displayName} roleLabel={roleLabel} roleBadgeClass={roleBadgeClass} onClick={() => setActiveTab('profile')} />
          <SidebarLink
            link={{
              label: 'Log out',
              icon: (
                <LogOut className="text-current h-5 w-5 flex-shrink-0" />
              ),
            }}
            onClick={handleSignOut}
          />
        </div>
      </SidebarBody>
    </SidebarUI>
  );
}
