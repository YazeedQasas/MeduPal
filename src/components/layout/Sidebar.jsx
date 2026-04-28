import { useState } from 'react';
import { LayoutDashboard, FileText, HardDrive, Settings, Activity, LogOut, GraduationCap, UserCog, Home, Play, TrendingUp, History, Cpu, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  Sidebar as SidebarUI,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from '../ui/sidebar';
import { cn } from '../../lib/utils';

const ADMIN_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', roles: ['admin', 'instructor'] },
  { icon: FileText, label: 'Cases', id: 'cases', roles: ['admin', 'instructor'] },
  { icon: Activity, label: 'Sessions', id: 'sessions', roles: ['admin', 'instructor'] },
  { icon: GraduationCap, label: 'Students', id: 'students', roles: ['admin', 'instructor'] },
  { icon: FileCheck, label: 'Assign Exam', id: 'assign-exam', roles: ['admin', 'instructor'] },
  { icon: HardDrive, label: 'Hardware & Sensors', id: 'hardware', roles: ['admin'] },
  { icon: Settings, label: 'Settings', id: 'settings', roles: ['admin'] },
  { icon: UserCog, label: 'Users', id: 'users', roles: ['admin'] },
];

function buildStudentNavItems(has_hardware, can_exam) {
  const items = [{ icon: Home, label: 'Home', id: 'student-dashboard' }];
  if (has_hardware) {
    items.push({ icon: Play, label: 'Practice', id: 'student-practice' });
  }
  if (can_exam) {
    items.push({ icon: FileCheck, label: 'Exam', id: 'student-exam' });
  }
  items.push({ icon: TrendingUp, label: 'Progress', id: 'student-progress' });
  items.push({ icon: History, label: 'History', id: 'student-history' });
  if (has_hardware) {
    items.push({ icon: Cpu, label: 'Hardware', id: 'student-hardware' });
  }
  items.push({ icon: Settings, label: 'Settings', id: 'student-settings' });
  return items;
}

function SidebarLogo() {
  const { open, animate } = useSidebar();
  const TRANSITION = { duration: 0.3, ease: 'easeInOut' };
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="flex items-center relative z-20 overflow-hidden py-2 gap-2"
    >
      {/* Icon badge — visible when collapsed, fades out when open */}
      <motion.div
        aria-label="XPatient"
        animate={{
          opacity: animate ? (open ? 0 : 1) : 1,
          width: animate ? (open ? 0 : 28) : 28,
        }}
        transition={TRANSITION}
        className="h-7 w-7 rounded-md bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0"
      >
        XP
      </motion.div>
      {/* Text — fades in when open */}
      <motion.span
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
          width: animate ? (open ? 'auto' : 0) : 'auto',
        }}
        transition={TRANSITION}
        style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
        className="text-white font-semibold text-base tracking-tight"
      >
        XPatient
      </motion.span>
    </a>
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
  const { user, profile, role, signOut, has_hardware, can_exam } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    await signOut();
    setActiveTab('landing');
  };

  const filteredNavItems = role === 'student'
    ? buildStudentNavItems(has_hardware ?? false, can_exam ?? false)
    : ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role));

  const roleLabel = role === 'admin' ? 'Admin' : role === 'instructor' ? 'Instructor' : role === 'technician' ? 'Technician' : role === 'student' ? 'Student' : role || 'User';
  const roleBadgeClass = {
    admin: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
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
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'student-practice') {
                    window.history.pushState(null, '', '/practice');
                  } else if (item.id === 'student-dashboard') {
                    window.history.pushState(null, '', '/student-dashboard');
                  } else if (item.id === 'student-exam') {
                    window.history.pushState(null, '', '/exam');
                  } else if (item.id === 'dashboard') {
                    window.history.pushState(null, '', '/dashboard');
                  } else if (item.id === 'assign-exam') {
                    window.history.pushState(null, '', '/assign-exam');
                  } else if (item.id === 'students') {
                    window.history.pushState(null, '', '/students');
                  } else if (item.id === 'sessions') {
                    window.history.pushState(null, '', '/sessions');
                  }
                }}
              />
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 pt-4 mt-auto pb-2">
          <SidebarUserBlock displayName={displayName} roleLabel={roleLabel} roleBadgeClass={roleBadgeClass} onClick={() => setActiveTab(role === 'student' ? 'student-settings' : 'profile')} />
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
