import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

const roleLabelMap = {
  admin: 'Admin',
  instructor: 'Instructor',
  technician: 'Technician',
  student: 'Student',
};

const roleBadgeClass = {
  admin: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  instructor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  technician: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  student: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
};

export function ProfileSettings({ setActiveTab, backTab, backLabel }) {
  const { user, profile, role, has_hardware, can_exam, refreshProfile } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email ?? '—';
  const roleLabel = roleLabelMap[profile?.role] || profile?.role || 'User';
  const badgeClass = roleBadgeClass[profile?.role] || 'bg-muted text-muted-foreground border-border';
  const [enableExamLoading, setEnableExamLoading] = useState(false);
  const [examConfirmOpen, setExamConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (!feedback.message) return undefined;
    const timeout = window.setTimeout(() => setFeedback({ type: '', message: '' }), 2500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const handleSetHardware = async (value) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_hardware: value })
        .eq('id', user.id);
      if (error) {
        console.error('Error updating hardware flag', error);
        return;
      }
      await refreshProfile?.();
    } catch (err) {
      console.error('Unexpected error updating hardware flag', err);
    }
  };

  const handleEnableExamAccess = async () => {
    if (!user?.id || can_exam || enableExamLoading) return;
    setEnableExamLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ can_exam: true })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile?.();
      setFeedback({ type: 'success', message: 'Exam access enabled' });
      setExamConfirmOpen(false);
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to enable exam access. Please try again.' });
    } finally {
      setEnableExamLoading(false);
    }
  };

  return (
    <div className={cn('mx-auto space-y-6', role === 'student' ? 'max-w-[1100px]' : 'max-w-[800px]')}>
      {feedback.message && (
        <div
          className={cn(
            'rounded-xl border px-4 py-2 text-sm',
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              : 'border-red-500/40 bg-red-500/15 text-red-300'
          )}
        >
          {feedback.message}
        </div>
      )}
      <button
        type="button"
        onClick={() => setActiveTab(backTab || (role === 'student' ? 'student-dashboard' : 'dashboard'))}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={18} />
        {backLabel || (role === 'student' ? 'Back to Home' : 'Back to dashboard')}
      </button>

      {role === 'student' ? (
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary/80">Settings</p>
            <h1 className="text-3xl font-bold text-foreground mt-1">Access & Permissions</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Manage your exam access settings and permissions. Upgrade anytime when you are ready.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 items-start rounded-2xl border border-border/70 bg-card/40 p-5">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-xl font-bold border border-border">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display name</p>
                <p className="text-base font-semibold text-foreground mt-0.5 truncate">{displayName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                <p className="text-foreground mt-0.5 truncate">{email}</p>
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

          <div className="space-y-4">
              <div
                className="rounded-2xl border p-5 md:p-6 space-y-5"
                style={{
                  background: 'linear-gradient(180deg, rgba(8,16,24,0.9), rgba(7,12,20,0.92))',
                  borderColor: 'rgba(96,165,250,0.16)',
                }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary" />
                      <h2 className="text-sm font-semibold text-foreground">Access / Permissions</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Manage your exam access settings and permissions.
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 min-w-[240px]">
                    <p className="text-[11px] text-emerald-300/80 uppercase tracking-wider font-semibold">Your Account Status</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {can_exam ? 'Practice + Exam Mode' : 'Practice Mode Only'}
                    </p>
                    {!can_exam && (
                      <p className="text-xs text-muted-foreground mt-1">You can upgrade to take real exams</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/30 p-4 md:p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Exam Access</h3>
                  <p className="text-xs text-muted-foreground -mt-2">Choose what type of exams you want to access</p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className={cn(
                      'rounded-xl border p-4 space-y-3',
                      !can_exam ? 'border-emerald-500/45 bg-emerald-500/10' : 'border-border bg-card/30'
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">Practice Mode Only</p>
                        {!can_exam && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                            Current
                          </span>
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        {[
                          'Unlimited practice exams',
                          'No time restrictions',
                          'Instant feedback',
                          'Safe learning environment',
                        ].map((item) => (
                          <li key={item} className="text-xs text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className={cn(
                      'rounded-xl border p-4 space-y-3',
                      can_exam ? 'border-emerald-500/45 bg-emerald-500/10' : 'border-border bg-card/30'
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">Practice + Exam Mode</p>
                        {can_exam && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                            Enabled
                          </span>
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        {[
                          'All practice mode benefits',
                          'Access real OSCE exams',
                          'Official exam results',
                          'Certificate eligibility',
                        ].map((item) => (
                          <li key={item} className="text-xs text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-blue-400 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Enable exam access</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This will allow the student to be assigned and access exams
                      </p>
                    </div>
                    {can_exam ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Exam Access Enabled
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setExamConfirmOpen(true)}
                        disabled={enableExamLoading || can_exam}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors border bg-primary text-primary-foreground border-primary/60 hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Lock size={12} />
                        {enableExamLoading ? 'Enabling...' : 'Enable Exam Access'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                  <p className="text-xs text-blue-200 flex items-start gap-2">
                    <Info size={13} className="mt-0.5 flex-shrink-0" />
                    <span>
                      Important: Enabling exam access is a one-way upgrade in this flow. You can still keep using practice mode normally.
                    </span>
                  </p>
                </div>

                {!has_hardware && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <AlertTriangle className="text-amber-300 mt-0.5" size={14} />
                    <p className="text-xs text-amber-200">
                      Student may not be fully ready for exam (no hardware assigned)
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">Practice Access (Demo)</h2>
                  <p className="text-xs text-muted-foreground">
                    Enable practice features by confirming you have a manikin.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    <p>
                      Status:{' '}
                      <span className={cn(
                        'font-medium',
                        has_hardware ? 'text-emerald-400' : 'text-muted-foreground'
                      )}>
                        {has_hardware ? 'Practice enabled' : 'Practice disabled'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetHardware(true)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                        has_hardware
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 cursor-default'
                          : 'bg-primary text-primary-foreground border-primary/60 hover:bg-primary/90'
                      )}
                      disabled={has_hardware === true}
                    >
                      I have a Manikin (Enable Practice)
                    </button>
                    {has_hardware && (
                      <button
                        type="button"
                        onClick={() => handleSetHardware(false)}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium text-muted-foreground border border-border hover:bg-muted/40 transition-colors"
                      >
                        Disable
                      </button>
                    )}
                  </div>
                </div>
              </div>
          </div>
        </div>
      ) : (
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
      )}

      {role === 'student' && examConfirmOpen && !can_exam && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close confirmation"
            onClick={() => !enableExamLoading && setExamConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <ShieldCheck size={20} className="text-amber-300" />
            </div>
            <h3 className="text-xl font-bold text-center text-foreground">Enable Exam Access?</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              This will allow you to be assigned to real OSCE exams. You can continue using practice mode anytime.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExamConfirmOpen(false)}
                disabled={enableExamLoading}
                className="px-4 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnableExamAccess}
                disabled={enableExamLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {enableExamLoading ? 'Enabling...' : 'Yes, Enable Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
