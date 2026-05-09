import { useCallback, useEffect, useState, useRef } from 'react';
import { StatCards } from './StatCards';
import { ActiveStations } from './ActiveStations';
import { SystemHealth } from './SystemHealth';
import { LearningPerformance } from './LearningPerformance';
import { AlertsFeed } from './AlertsFeed';
import { QuickActions } from './QuickActions';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import {
  Sparkles,
  FileCheck,
  UserCog,
  Users,
  MoreHorizontal,
  FileText,
} from 'lucide-react';

/** Same tokens as InstructorDashboard `P` */
const P = {
  page: 'hsl(var(--background))',
  card: 'hsl(var(--card))',
  border: 'rgba(255,255,255,0.07)',
  shadow: '0 1px 3px rgba(0,0,0,0.35)',
  text: '#f4f4f5',
  muted: '#71717a',
  tag: 'rgba(255,255,255,0.06)',
  tagText: '#a1a1aa',
  accent: '#6ee7b7',
  accentBg: 'rgba(110,231,183,0.12)',
};

const ADMIN_PLAN_TIPS = [
  'Review instructor accounts and pending invites before peak exam weeks.',
  'Skim live alerts and hardware health at least once per shift.',
  'Keep case library publication status aligned with curriculum milestones.',
  'Confirm backup stations are marked online before high-stakes exams.',
  'Audit session volume vs. capacity when adding new cohorts.',
];

function AdminTodaysPlanCard({ dateLine, firstName, summaryLine, focusTip, onAssignExam, onInstructors }) {
  return (
    <div
      className="rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3"
      style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.accent }}>
            {dateLine}
          </p>
          <p className="text-sm font-semibold leading-tight" style={{ color: P.text }}>
            Operations overview{' '}
            <span className="font-normal" style={{ color: P.muted }}>
              · {firstName}
            </span>
          </p>
          <p className="text-xs leading-snug line-clamp-2" style={{ color: P.muted }}>
            {summaryLine}
          </p>
          <p className="text-[11px] leading-snug flex items-start gap-1.5 pt-1 mt-0.5 border-t" style={{ borderColor: P.border, color: P.tagText }}>
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-80" style={{ color: P.accent }} />
            <span>{focusTip}</span>
          </p>
        </div>
        <div className="flex flex-wrap shrink-0 gap-2 self-start">
          <button
            type="button"
            onClick={onInstructors}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 border"
            style={{ borderColor: P.border, color: P.text, background: 'rgba(255,255,255,0.04)' }}
          >
            <UserCog size={13} strokeWidth={2.5} />
            Instructors
          </button>
          <button
            type="button"
            onClick={onAssignExam}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: P.accent, color: '#0a0a0a' }}
          >
            <FileCheck size={13} strokeWidth={2.5} />
            Assign exam
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminProfileCard({ displayName, counts, loading, onGoToProfile }) {
  const initials = (displayName || '?').slice(0, 2).toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [menuOpen]);

  return (
    <div className="rounded-2xl p-5" style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: P.shadow }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold" style={{ color: P.text }}>Profile</span>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ border: `1px solid ${P.border}` }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={16} style={{ color: P.muted }} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-40 rounded-xl overflow-hidden z-20"
              style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: P.shadow }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onGoToProfile?.();
                }}
                className="w-full text-left px-3 py-2 text-sm hover:opacity-90"
                style={{ color: P.text, background: 'transparent' }}
              >
                Go to profile
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => onGoToProfile?.()}
          className="relative w-24 h-24 mb-3 rounded-full"
          style={{ outline: 'none' }}
          aria-label="Go to profile"
        >
          <div
            className="absolute inset-[8px] rounded-full flex items-center justify-center text-xl font-bold"
            style={{ background: P.accentBg, color: P.accent }}
          >
            {initials}
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: P.accent }}>
            <span style={{ color: '#0a0a0a', fontSize: 11, fontWeight: 700 }}>★</span>
          </div>
        </button>

        <p className="font-bold text-base leading-tight text-center" style={{ color: P.text }}>{displayName}</p>
        <p className="text-xs mt-0.5" style={{ color: P.muted }}>Administrator</p>
      </div>

      <div className="mt-5 flex items-center justify-around pt-4" style={{ borderTop: `1px solid ${P.border}` }}>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <UserCog size={13} style={{ color: '#4f8ef7' }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : counts.instructors ?? 0}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: P.muted }}>
            Instructors
          </span>
        </div>
        <div className="w-px h-8" style={{ background: P.border }} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <Users size={13} style={{ color: P.accent }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : counts.students ?? 0}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: P.muted }}>
            Students
          </span>
        </div>
        <div className="w-px h-8" style={{ background: P.border }} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <FileText size={13} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-bold" style={{ color: P.text }}>
              {loading ? '—' : counts.cases ?? 0}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: P.muted }}>
            Cases
          </span>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({ setActiveTab }) {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
  const [counts, setCounts] = useState({ instructors: 0, students: 0, cases: 0 });
  const [countsLoading, setCountsLoading] = useState(true);
  const [adminRailTab, setAdminRailTab] = useState('actions');

  const navigateAdminTab = useCallback(
    (tabId) => {
      const pathByTab = {
        dashboard: '/dashboard',
        'assign-exam': '/assign-exam',
        students: '/students',
        cases: '/cases',
        sessions: '/sessions',
        hardware: '/hardware',
        settings: '/settings',
        profile: '/profile',
        instructors: '/instructors',
      };
      setActiveTab(tabId);
      const path = pathByTab[tabId];
      if (path && typeof window !== 'undefined') {
        window.history.pushState(null, '', path);
      }
    },
    [setActiveTab]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCountsLoading(true);
      try {
        const [ins, stu, cas] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'instructor'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('cases').select('*', { count: 'exact', head: true }),
        ]);
        if (!cancelled) {
          setCounts({
            instructors: ins.count ?? 0,
            students: stu.count ?? 0,
            cases: cas.count ?? 0,
          });
        }
      } catch {
        if (!cancelled) setCounts({ instructors: 0, students: 0, cases: 0 });
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = (displayName || 'Admin').trim().split(/\s+/)[0];
  const summaryLine = [
    `${counts.instructors} instructors · ${counts.students} students · ${counts.cases} cases`,
    'Platform health, sessions, and alerts below.',
  ].join(' ');
  const focusTip = ADMIN_PLAN_TIPS[new Date().getDay() % ADMIN_PLAN_TIPS.length];

  return (
    <div className="w-full max-w-[min(100%,1800px)] mx-auto min-h-0 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_min(380px,36vw)] gap-6 lg:gap-8 lg:items-start min-h-0">
        <div className="space-y-6 min-h-0 min-w-0 max-lg:order-2">
          <AdminTodaysPlanCard
            dateLine={dateLine}
            firstName={firstName}
            summaryLine={summaryLine}
            focusTip={focusTip}
            onAssignExam={() => navigateAdminTab('assign-exam')}
            onInstructors={() => navigateAdminTab('instructors')}
          />

          <StatCards variant="panel" />

          <ActiveStations onViewAll={() => navigateAdminTab('stations')} variant="panel" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:min-h-[420px]">
            <div className="lg:col-span-1 min-h-[280px] flex flex-col">
              <SystemHealth variant="panel" />
            </div>
            <div className="lg:col-span-1 min-h-[280px] flex flex-col">
              <LearningPerformance variant="panel" />
            </div>
            <div className="lg:col-span-1 flex flex-col gap-6 min-h-0">
              <div className="flex-1 min-h-0 min-h-[200px]">
                <AlertsFeed variant="panel" />
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6 max-lg:order-1 lg:sticky lg:top-4 lg:self-start z-[1]">
          <AdminProfileCard
            displayName={displayName}
            counts={counts}
            loading={countsLoading}
            onGoToProfile={() => navigateAdminTab('profile')}
          />

          <div className="rounded-2xl border overflow-hidden" style={{ background: P.card, borderColor: P.border, boxShadow: P.shadow }}>
            <div className="flex p-1 gap-0.5" style={{ borderBottom: `1px solid ${P.border}` }}>
              <button
                type="button"
                onClick={() => setAdminRailTab('actions')}
                className={cn(
                  'flex-1 rounded-lg py-2 px-2 text-xs font-semibold transition-colors',
                  adminRailTab === 'actions' ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                )}
                style={{ color: adminRailTab === 'actions' ? P.text : P.muted }}
              >
                Quick actions
              </button>
              <button
                type="button"
                onClick={() => setAdminRailTab('directory')}
                className={cn(
                  'flex-1 rounded-lg py-2 px-2 text-xs font-semibold transition-colors',
                  adminRailTab === 'directory' ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                )}
                style={{ color: adminRailTab === 'directory' ? P.text : P.muted }}
              >
                Directory
              </button>
            </div>
            <div className="p-4">
              {adminRailTab === 'actions' ? (
                <QuickActions
                  onAssignExam={() => navigateAdminTab('assign-exam')}
                  onManageStudents={() => navigateAdminTab('students')}
                  onViewAnalytics={() => navigateAdminTab('cases')}
                  onRunDiagnostics={() => navigateAdminTab('hardware')}
                  onOpenSettings={() => navigateAdminTab('settings')}
                  onOpenProfile={() => navigateAdminTab('profile')}
                  variant="panel"
                  layout="grid"
                  embedded
                  gridSubtitle="Jump to common admin tasks"
                />
              ) : (
                <div className="space-y-3 pt-0.5">
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: P.muted }}>
                    Headcount
                  </p>
                  {[
                    { label: 'Instructors', value: countsLoading ? '—' : counts.instructors, color: '#60a5fa', icon: UserCog },
                    { label: 'Students', value: countsLoading ? '—' : counts.students, color: P.accent, icon: Users },
                    { label: 'Cases in library', value: countsLoading ? '—' : counts.cases, color: '#f59e0b', icon: FileText },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-2">
                      <span className="text-xs flex items-center gap-2" style={{ color: P.muted }}>
                        <item.icon size={14} style={{ color: item.color }} />
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => navigateAdminTab('instructors')}
                    className="mt-3 w-full text-left text-xs font-semibold py-2 px-2 rounded-lg transition-colors hover:bg-white/[0.06]"
                    style={{ color: P.accent }}
                  >
                    Open instructor admin →
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
