import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Lock,
  ShieldCheck,
  Mail,
  User,
  Settings,
  Cpu,
  ClipboardCheck,
  Bell,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

const PP = {
  card: 'hsl(var(--card))',
  border: 'rgba(255,255,255,0.07)',
  shadow: '0 1px 3px rgba(0,0,0,0.35)',
  text: '#f4f4f5',
  muted: '#71717a',
  accent: '#6ee7b7',
  accentBg: 'rgba(110,231,183,0.12)',
};

const roleLabelMap = {
  admin: 'Admin',
  instructor: 'Instructor',
  technician: 'Technician',
  student: 'Student',
};

const roleAccent = {
  admin: '#f59e0b',
  instructor: '#60a5fa',
  technician: '#94a3b8',
  student: PP.accent,
};

function cardStyle() {
  return { background: PP.card, borderColor: PP.border, boxShadow: PP.shadow };
}

function PermissionRow({ icon: Icon, label, description, enabled, accent = PP.accent }) {
  return (
    <div
      className="flex items-start gap-4 rounded-xl border px-4 py-3.5"
      style={{ borderColor: PP.border, background: 'rgba(255,255,255,0.02)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}18`, color: accent }}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: PP.text }}>
          {label}
        </p>
        <p className="text-xs mt-0.5 leading-snug" style={{ color: PP.muted }}>
          {description}
        </p>
      </div>
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0',
          enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.06] text-zinc-500'
        )}
      >
        {enabled ? 'Enabled' : 'Off'}
      </span>
    </div>
  );
}

function StudentAccessPanel({
  can_exam,
  has_hardware,
  enableExamLoading,
  onOpenExamConfirm,
  onSetHardware,
}) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-5 md:p-6 space-y-5"
        style={{
          ...cardStyle(),
          background: 'linear-gradient(180deg, rgba(12,18,16,0.95) 0%, rgba(6,9,9,0.98) 100%)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: PP.accent }}>
              Student access
            </p>
            <h2 className="text-lg font-bold mt-1" style={{ color: PP.text }}>
              Exam & practice permissions
            </h2>
            <p className="text-xs mt-1" style={{ color: PP.muted }}>
              Control what modes you can use on Medupal.
            </p>
          </div>
          <div
            className="rounded-xl border px-4 py-3 min-w-[220px]"
            style={{ borderColor: 'rgba(110,231,183,0.25)', background: PP.accentBg }}
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: PP.accent }}>
              Current mode
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: PP.text }}>
              {can_exam ? 'Practice + Exam' : 'Practice only'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: 'Practice mode',
              active: !can_exam,
              items: ['Unlimited practice', 'Instant feedback', 'Safe learning environment'],
            },
            {
              title: 'Practice + Exam',
              active: can_exam,
              items: ['All practice benefits', 'Assigned OSCE exams', 'Official results'],
            },
          ].map((mode) => (
            <div
              key={mode.title}
              className={cn(
                'rounded-xl border p-4 space-y-3 transition-colors',
                mode.active ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/[0.08] bg-white/[0.02]'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold" style={{ color: PP.text }}>
                  {mode.title}
                </p>
                {mode.active && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                    Active
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {mode.items.map((item) => (
                  <li key={item} className="text-xs flex items-center gap-2" style={{ color: PP.muted }}>
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4"
          style={{ borderColor: PP.border }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: PP.text }}>
              Enable exam access
            </p>
            <p className="text-xs mt-1" style={{ color: PP.muted }}>
              One-way upgrade — instructors can then assign you to exams.
            </p>
          </div>
          {can_exam ? (
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              Exam access enabled
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenExamConfirm}
              disabled={enableExamLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: PP.accent, color: '#0a0a0a' }}
            >
              <Lock size={12} />
              {enableExamLoading ? 'Enabling…' : 'Enable exam access'}
            </button>
          )}
        </div>

        {!has_hardware && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="text-amber-300 mt-0.5 shrink-0" size={14} />
            <p className="text-xs text-amber-200">Confirm manikin access below to use practice mode.</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-5 space-y-4" style={cardStyle()}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: PP.text }}>
            Practice hardware
          </h3>
          <p className="text-xs mt-1" style={{ color: PP.muted }}>
            Confirm you have a manikin to unlock practice sessions.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs" style={{ color: PP.muted }}>
            Status:{' '}
            <span className={has_hardware ? 'text-emerald-400 font-semibold' : 'font-medium'}>
              {has_hardware ? 'Practice enabled' : 'Not enabled'}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSetHardware(true)}
              disabled={has_hardware}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
                has_hardware
                  ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
                  : 'hover:opacity-90'
              )}
              style={has_hardware ? undefined : { background: PP.accent, color: '#0a0a0a' }}
            >
              I have a manikin
            </button>
            {has_hardware && (
              <button
                type="button"
                onClick={() => onSetHardware(false)}
                className="px-3 py-2 rounded-lg text-xs font-medium border hover:bg-white/[0.04]"
                style={{ borderColor: PP.border, color: PP.muted }}
              >
                Disable
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileSettings({ setActiveTab, backTab, backLabel }) {
  const { user, profile, role, has_hardware, can_exam, refreshProfile } = useAuth();
  const isStudent = role === 'student';
  const isFaculty = role === 'instructor' || role === 'admin' || role === 'technician';
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email ?? '—';
  const roleLabel = roleLabelMap[profile?.role] || profile?.role || 'User';
  const accent = roleAccent[profile?.role] || PP.accent;
  const initials = displayName.slice(0, 2).toUpperCase();

  const [enableExamLoading, setEnableExamLoading] = useState(false);
  const [examConfirmOpen, setExamConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [hardwareLoading, setHardwareLoading] = useState(false);

  const defaultBackTab = isStudent ? 'student-dashboard' : 'dashboard';
  const resolvedBackTab = backTab || defaultBackTab;

  useEffect(() => {
    if (!feedback.message) return undefined;
    const timeout = window.setTimeout(() => setFeedback({ type: '', message: '' }), 2800);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const handleSetHardware = async (value) => {
    if (!user?.id || hardwareLoading) return;
    setHardwareLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ has_hardware: value }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile?.();
      setFeedback({
        type: 'success',
        message: value ? 'Practice hardware access enabled' : 'Practice hardware access disabled',
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Could not update hardware access.' });
    } finally {
      setHardwareLoading(false);
    }
  };

  const handleEnableExamAccess = async () => {
    if (!user?.id || can_exam || enableExamLoading) return;
    setEnableExamLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const { error } = await supabase.from('profiles').update({ can_exam: true }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile?.();
      setFeedback({ type: 'success', message: 'Exam access enabled' });
      setExamConfirmOpen(false);
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to enable exam access.' });
    } finally {
      setEnableExamLoading(false);
    }
  };

  const quickLinks = isStudent
    ? [{ label: 'Home', tab: 'student-dashboard', icon: Sparkles }]
    : [
        { label: 'Dashboard', tab: 'dashboard', icon: Sparkles },
        { label: 'Full settings', tab: 'settings', icon: Settings },
        ...(role === 'instructor'
          ? [
              { label: 'Students', tab: 'students', icon: User },
              { label: 'Sessions', tab: 'sessions', icon: ClipboardCheck },
            ]
          : []),
      ];

  return (
    <div
      className="w-full space-y-6"
      style={{ color: PP.text }}
    >
      {feedback.message && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-xl border px-4 py-2.5 text-sm',
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              : 'border-red-500/40 bg-red-500/15 text-red-300'
          )}
        >
          {feedback.message}
        </motion.div>
      )}

      {/* Hero */}
      <div className="rounded-2xl border overflow-hidden" style={cardStyle()}>
        <div
          className="absolute inset-0 pointer-events-none opacity-0"
          aria-hidden
        />
        <div
          className="relative px-5 py-6 sm:px-8 sm:py-8"
          style={{
            background:
              'radial-gradient(ellipse 70% 100% at 0% 0%, rgba(110,231,183,0.14) 0%, transparent 55%), linear-gradient(180deg, #0c1210 0%, #060909 100%)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab(resolvedBackTab)}
            className="inline-flex items-center gap-2 text-xs font-semibold mb-6 rounded-lg px-3 py-1.5 hover:bg-white/[0.06] transition-colors"
            style={{ color: PP.muted }}
          >
            <ArrowLeft size={16} />
            {backLabel || (isStudent ? 'Back to home' : 'Back to dashboard')}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-8">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 border"
              style={{ background: `${accent}22`, color: accent, borderColor: `${accent}44` }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: PP.accent }}>
                Profile settings
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{displayName}</h1>
              <p className="text-sm mt-1 truncate" style={{ color: PP.muted }}>
                {email}
              </p>
              <span
                className="inline-block mt-3 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: `${accent}22`, color: accent }}
              >
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <button
            key={link.tab}
            type="button"
            onClick={() => {
              setActiveTab(link.tab);
              if (typeof window !== 'undefined') {
                const paths = {
                  dashboard: '/dashboard',
                  settings: '/settings',
                  students: '/students',
                  sessions: '/sessions',
                  'student-dashboard': '/student-dashboard',
                };
                const path = paths[link.tab];
                if (path) window.history.pushState(null, '', path);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-white/[0.05] transition-colors"
            style={{ borderColor: PP.border, color: PP.muted }}
          >
            <link.icon size={14} style={{ color: PP.accent }} />
            {link.label}
            <ChevronRight size={12} className="opacity-50" />
          </button>
        ))}
      </div>

      <div className={cn('grid gap-6', isStudent ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[280px_1fr]')}>
        {/* Account sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border p-5" style={cardStyle()}>
            <h2 className="text-sm font-semibold mb-4">Account</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User size={16} className="shrink-0 mt-0.5" style={{ color: PP.muted }} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: PP.muted }}>
                    Display name
                  </p>
                  <p className="text-sm font-medium truncate">{displayName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={16} className="shrink-0 mt-0.5" style={{ color: PP.muted }} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: PP.muted }}>
                    Email
                  </p>
                  <p className="text-sm font-medium truncate">{email}</p>
                </div>
              </div>
            </div>
          </div>

          {isFaculty && !isStudent && (
            <div className="rounded-2xl border p-5 space-y-3" style={cardStyle()}>
              <h2 className="text-sm font-semibold">Your permissions</h2>
              <PermissionRow
                icon={ClipboardCheck}
                label="Run exams"
                description="Create and conduct OSCE exam sessions."
                enabled={!!can_exam}
                accent="#f59e0b"
              />
              <PermissionRow
                icon={Cpu}
                label="Hardware controls"
                description="Access diagnostics and station hardware."
                enabled={!!has_hardware}
                accent="#60a5fa"
              />
            </div>
          )}

          <div
            className="rounded-2xl border p-4 flex gap-3"
            style={{ ...cardStyle(), borderColor: 'rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.08)' }}
          >
            <Info size={16} className="text-blue-300 shrink-0 mt-0.5" />
            <p className="text-xs leading-snug text-blue-200/90">
              Password and security options live under{' '}
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="font-semibold underline hover:no-underline"
              >
                Full settings
              </button>
              .
            </p>
          </div>
        </aside>

        {/* Main */}
        <div className="space-y-4">
          {isStudent ? (
            <StudentAccessPanel
              can_exam={can_exam}
              has_hardware={has_hardware}
              enableExamLoading={enableExamLoading}
              onOpenExamConfirm={() => setExamConfirmOpen(true)}
              onSetHardware={handleSetHardware}
            />
          ) : (
            <>
              <div className="rounded-2xl border p-5 md:p-6" style={cardStyle()}>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck size={18} style={{ color: PP.accent }} />
                  <h2 className="text-lg font-bold">Faculty profile</h2>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: PP.muted }}>
                  Your Medupal account is set up for {roleLabel.toLowerCase()} workflows — assign exams, review
                  advisee scores, and manage sessions from the dashboard. Contact an admin if you need additional
                  permissions.
                </p>
              </div>

              {role === 'instructor' && (
                <div className="rounded-2xl border p-5 space-y-3" style={cardStyle()}>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Bell size={16} style={{ color: PP.muted }} />
                    Teaching preferences
                  </h3>
                  <p className="text-xs" style={{ color: PP.muted }}>
                    Notification and grading defaults will appear here in a future update.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {['Email digests', 'Session reminders'].map((label) => (
                      <div
                        key={label}
                        className="rounded-xl border px-3 py-2.5 text-xs"
                        style={{ borderColor: PP.border, color: PP.muted }}
                      >
                        {label} — coming soon
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isStudent && examConfirmOpen && !can_exam && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => !enableExamLoading && setExamConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border p-6" style={cardStyle()}>
            <div
              className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <ShieldCheck size={20} className="text-amber-300" />
            </div>
            <h3 className="text-xl font-bold text-center">Enable exam access?</h3>
            <p className="text-sm text-center mt-2" style={{ color: PP.muted }}>
              Instructors can assign you to real OSCE exams. You can still use practice mode anytime.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExamConfirmOpen(false)}
                disabled={enableExamLoading}
                className="px-4 py-2 rounded-lg text-sm border hover:bg-white/[0.04] disabled:opacity-60"
                style={{ borderColor: PP.border, color: PP.muted }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnableExamAccess}
                disabled={enableExamLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                style={{ background: PP.accent, color: '#0a0a0a' }}
              >
                {enableExamLoading ? 'Enabling…' : 'Yes, enable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
