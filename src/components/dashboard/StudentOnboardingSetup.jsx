import React, { useState } from 'react';
import { Stethoscope, FileCheck, Layers, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const WIZARD_OPTIONS = [
  {
    id: 'practice',
    title: 'Practice with Manikin',
    description: 'Use MeduPal hardware and sensors to practice clinical skills.',
    icon: Stethoscope,
    has_hardware: true,
    can_exam: false,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    iconGlow: 'shadow-[0_0_20px_rgba(52,211,153,0.25)]',
    cardHoverGlow: 'hover:shadow-[0_0_28px_rgba(52,211,153,0.15)]',
  },
  {
    id: 'exam',
    title: 'OSCE Exam Only',
    description: 'Join OSCE exams assigned by your instructor.',
    icon: FileCheck,
    has_hardware: false,
    can_exam: true,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
    iconGlow: 'shadow-[0_0_20px_rgba(251,191,36,0.25)]',
    cardHoverGlow: 'hover:shadow-[0_0_28px_rgba(251,191,36,0.15)]',
  },
  {
    id: 'both',
    title: 'Both Practice and Exam',
    description: 'Use the MeduPal manikin and participate in OSCE exams.',
    icon: Layers,
    has_hardware: true,
    can_exam: true,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/15',
    iconGlow: 'shadow-[0_0_20px_rgba(96,165,250,0.25)]',
    cardHoverGlow: 'hover:shadow-[0_0_28px_rgba(96,165,250,0.15)]',
  },
];

export function StudentOnboardingSetup({ setActiveTab }) {
  const { user, refreshProfile } = useAuth();
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleContinue = async () => {
    if (!selected || !user?.id) return;
    setSubmitting(true);
    setError(null);

    const option = WIZARD_OPTIONS.find((o) => o.id === selected);
    if (!option) {
      setSubmitting(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          has_hardware: option.has_hardware,
          can_exam: option.can_exam,
          onboarding_done: true,
        })
        .eq('id', user.id);

      if (updateError) {
        setError(updateError.message || 'Failed to save your preferences.');
        setSubmitting(false);
        return;
      }

      await refreshProfile?.();
      setActiveTab?.('student-hub');
      window.history.replaceState(null, '', '/student-hub');
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#000] text-white relative overflow-x-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute top-[-15%] left-[30%] w-[120%] h-[90%] blur-[40px] opacity-60"
          style={{
            background: 'radial-gradient(ellipse 55% 55% at 50% 20%, rgba(155,200,175,0.22) 0%, rgba(100,165,140,0.08) 45%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[70%] blur-[30px] opacity-50"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 80% 80%, rgba(20,65,42,0.5) 0%, transparent 60%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold text-white/95 tracking-tight">
            Setup Your MeduPal Profile
          </h1>
          <p className="mt-3 text-white/50 text-base">
            How will you use MeduPal?
          </p>
        </div>

        {/* Selectable cards */}
        <div className="w-full space-y-3 mb-8">
          {WIZARD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              disabled={submitting}
              className={cn(
                'w-full flex items-center gap-4 p-5 rounded-2xl text-left border transition-all duration-200',
                selected === opt.id
                  ? 'border-[rgba(100,170,145,0.6)] bg-[rgba(100,170,145,0.1)]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
              )}
            >
              <div
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                  selected === opt.id ? 'bg-[rgba(100,170,145,0.2)]' : 'bg-white/5'
                )}
              >
                <opt.icon size={22} className={selected === opt.id ? 'text-[rgba(180,220,200,0.9)]' : 'text-white/50'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white/90">{opt.title}</p>
                <p className="text-sm text-white/45 mt-0.5">{opt.description}</p>
              </div>
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                  selected === opt.id ? 'border-[rgba(100,170,145,0.8)]' : 'border-white/20'
                )}
              >
                {selected === opt.id && (
                  <span className="w-2 h-2 rounded-full bg-[rgba(180,220,200,0.9)]" />
                )}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-400">{error}</p>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || submitting}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white transition-all',
            selected && !submitting
              ? 'bg-[linear-gradient(135deg,rgba(120,180,160,0.55)_0%,rgba(80,140,120,0.40)_50%,rgba(50,110,90,0.50)_100%)] shadow-[0_0_20px_rgba(100,170,145,0.18)]'
              : 'bg-white/[0.06] text-white/40 cursor-not-allowed'
          )}
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              Continue
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
