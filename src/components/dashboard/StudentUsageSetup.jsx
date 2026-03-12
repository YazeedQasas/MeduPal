import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, FileCheck, Layers, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

function FloatingPaths({ position }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position
      } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position
      } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position
      } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full text-white" viewBox="0 0 696 316" fill="none" aria-hidden>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 20 + Math.random() * 10, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </svg>
    </div>
  );
}

const USAGE_OPTIONS = [
  {
    id: 'practice',
    title: 'Practice with Manikin',
    description: 'Use MeduPal hardware and sensors to practice clinical skills',
    icon: Stethoscope,
    has_hardware: true,
    can_exam: false,
    iconColor: 'text-emerald-400',
    iconColorSelected: 'text-emerald-300',
    iconBg: 'bg-emerald-500/15',
    iconBgSelected: 'bg-emerald-500/25',
  },
  {
    id: 'exam',
    title: 'OSCE Exam Only',
    description: 'Participate in exams assigned by instructors',
    icon: FileCheck,
    has_hardware: false,
    can_exam: true,
    iconColor: 'text-amber-400',
    iconColorSelected: 'text-amber-300',
    iconBg: 'bg-amber-500/15',
    iconBgSelected: 'bg-amber-500/25',
  },
  {
    id: 'both',
    title: 'Both Practice and Exam',
    description: 'Practice using the manikin and also participate in OSCE exams',
    icon: Layers,
    has_hardware: true,
    can_exam: true,
    iconColor: 'text-blue-400',
    iconColorSelected: 'text-blue-300',
    iconBg: 'bg-blue-500/15',
    iconBgSelected: 'bg-blue-500/25',
  },
];

export function StudentUsageSetup({ setActiveTab }) {
  const { user, refreshProfile } = useAuth();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleContinue = async () => {
    if (!selected || !user?.id || saving) return;

    const option = USAGE_OPTIONS.find((o) => o.id === selected);
    if (!option) return;

    setSaving(true);
    setError(null);

    const payload = { has_hardware: option.has_hardware, can_exam: option.can_exam };
    console.log('[Onboarding] Saving usage preferences:', { ...payload, userId: user.id });

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id);

      if (updateError) {
        console.error('[Onboarding] Failed to save preferences:', updateError);
        setError(updateError.message || 'Failed to save your preferences.');
        setSaving(false);
        return;
      }

      console.log('[Onboarding] Usage preferences saved successfully:', payload);
      await refreshProfile?.();
      if (typeof window !== 'undefined') window.localStorage.removeItem('medupal_onboarding_pending');
      setActiveTab?.('student-dashboard');
      if (typeof window !== 'undefined') window.history.replaceState(null, '', '/student-dashboard');
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full min-w-0 overflow-x-hidden bg-[#000] text-white relative">
      {/* Same ambient glows as RoleSelectPage */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute top-[-15%] left-[30%] w-[120%] h-[90%] blur-[40px] opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 55% 55% at 50% 20%, rgba(155,200,175,0.22) 0%, rgba(100,165,140,0.08) 45%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[70%] blur-[30px] opacity-50"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 80% 80%, rgba(20,65,42,0.5) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Two-column layout — mirrors RoleSelectPage */}
      <div className="relative z-10 h-[100dvh] w-full min-w-0 flex flex-col md:flex-row font-geist overflow-x-hidden">
        {/* Left column: the form */}
        <section className="flex-1 min-w-0 flex items-center justify-center p-8">
          <div className="w-full max-w-md min-w-0">
            <div className="flex flex-col gap-6 min-w-0">
              <button
                type="button"
                onClick={() => setActiveTab('onboarding')}
                className="mb-2 flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back to role selection
              </button>

              <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight text-white/95">
                How will you use<br />MeduPal?
              </h1>
              <p className="animate-element animate-delay-200 text-white/45">
                Choose the option that best fits your goals.
              </p>

              <div className="animate-element animate-delay-300 flex flex-col gap-3">
                {USAGE_OPTIONS.map((opt) => {
                  const isSelected = selected === opt.id;
                  const Icon = opt.icon;
                  const { iconColor, iconColorSelected, iconBg, iconBgSelected } = opt;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelected(opt.id)}
                      disabled={saving}
                      className={[
                        'group w-full flex items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-200',
                        isSelected
                          ? 'border-[rgba(100,170,145,0.6)] bg-[rgba(100,170,145,0.1)]'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]',
                      ].join(' ')}
                    >
                      <div
                        className={[
                          'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-200',
                          isSelected ? iconBgSelected : iconBg,
                          !isSelected && 'group-hover:opacity-80',
                        ].join(' ')}
                      >
                        <Icon
                          className={[
                            'w-5 h-5 transition-colors duration-200',
                            isSelected ? iconColorSelected : iconColor,
                            !isSelected && 'group-hover:opacity-90',
                          ].join(' ')}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={['font-semibold transition-colors duration-200', isSelected ? 'text-white' : 'text-white/70'].join(' ')}>
                          {opt.title}
                        </p>
                        <p className="text-sm text-white/40 mt-0.5">{opt.description}</p>
                      </div>
                      <div
                        className={[
                          'flex-shrink-0 w-4 h-4 rounded-full border-2 transition-all duration-200 flex items-center justify-center',
                          isSelected ? 'border-[rgba(100,170,145,0.8)]' : 'border-white/20',
                        ].join(' ')}
                      >
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              key="dot"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="w-2 h-2 rounded-full bg-[rgba(180,220,200,0.9)]"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </button>
                  );
                })}
              </div>

              {error && <p className="text-sm text-red-400 animate-element animate-delay-450">{error}</p>}

              <button
                type="button"
                disabled={!selected || saving}
                onClick={handleContinue}
                className="animate-element animate-delay-500 w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{
                  background: selected
                    ? 'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.40) 50%, rgba(50,110,90,0.50) 100%)'
                    : 'rgba(255,255,255,0.06)',
                  boxShadow: selected
                    ? '0 0 20px rgba(100,170,145,0.18), inset 0 1px 0 rgba(255,255,255,0.12)'
                    : 'none',
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Get started
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right column: FloatingPaths panel — mirrors RoleSelectPage */}
        <section className="hidden md:flex flex-1 min-w-0 relative p-4 overflow-hidden flex-col items-center justify-center">
          <div className="absolute inset-4 rounded-3xl overflow-hidden flex flex-col bg-[#0a0f0d] border border-white/10">
            <div className="relative flex-1 min-h-0">
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0a0f0d] to-transparent" />
              <FloatingPaths position={1} />
              <FloatingPaths position={-1} />
            </div>
            <div className="relative z-10 shrink-0 py-8 px-8 text-center">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-3">Your journey starts here</p>
              <p className="text-white/50 text-sm max-w-xs mx-auto leading-relaxed">
                MeduPal adapts to how you learn — practice with hardware, take exams, or both.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
