import React from 'react';
import { Stethoscope, FileCheck, ChevronRight, MessageSquare, FlaskConical, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

const FEATURES = [
  { icon: MessageSquare, label: 'AI Patient Interaction' },
  { icon: FlaskConical, label: 'Clinical Case Simulation' },
  { icon: Activity, label: 'Sensor-based Physical Examination' },
];

export function StudentOnboarding({ setActiveTab }) {
  const handlePractice = () => {
    setActiveTab?.('session-welcome-practice');
  };

  const handleExam = () => {
    setActiveTab?.('session-welcome-exam');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Top section */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          Welcome to MeduPal
        </h1>
        <p className="mt-3 text-muted-foreground text-lg">
          Choose how you want to start your clinical session
        </p>
      </div>

      {/* Center: Two cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {/* Card 1: Practice Training */}
        <button
          type="button"
          onClick={handlePractice}
          className={cn(
            'group relative flex flex-col items-start text-left p-8 rounded-2xl',
            'bg-card border border-white/10',
            'hover:border-primary/40 hover:shadow-[0_0_30px_rgba(100,170,145,0.15)]',
            'transition-all duration-300 ease-out'
          )}
        >
          <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center mb-5 group-hover:bg-primary/25 transition-colors">
            <Stethoscope size={28} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Practice Training</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Practice clinical skills using the MeduPal manikin and sensors.
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            Start Practice
            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </button>

        {/* Card 2: Assigned OSCE Exam */}
        <button
          type="button"
          onClick={handleExam}
          className={cn(
            'group relative flex flex-col items-start text-left p-8 rounded-2xl',
            'bg-card border border-white/10',
            'hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]',
            'transition-all duration-300 ease-out'
          )}
        >
          <div className="w-14 h-14 rounded-xl bg-amber-500/15 flex items-center justify-center mb-5 group-hover:bg-amber-500/25 transition-colors">
            <FileCheck size={28} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Assigned OSCE Exam</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Join an instructor-assigned OSCE station.
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400">
            Start Exam
            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </button>
      </div>

      {/* What you can do section */}
      <div className="rounded-2xl border border-white/10 bg-card/50 p-8">
        <h3 className="text-lg font-semibold text-foreground mb-6">
          What you can do with MeduPal
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon size={20} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
