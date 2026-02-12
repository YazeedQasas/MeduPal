import { Brain, Stethoscope, ClipboardList, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LandingPage({ setActiveTab }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-12">

       {/* Top */}
<div className="flex items-center justify-between">

  {/* Logo + Trust */}
  <div className="flex items-center gap-4">
    <div className="text-sm font-semibold tracking-wide text-muted-foreground">
      MeduPal
    </div>

    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs text-muted-foreground">
      <ShieldCheck size={14} />
      Clinical Education Platform

    </div>
  </div>

  <button
    onClick={() => setActiveTab('dashboard')}
    className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition inline-flex items-center gap-2"
  >
    Start Your Journey
    <ArrowRight size={18} />
  </button>

</div>


        {/* Main Grid */}
        <div className="grid md:grid-cols-2 gap-20 mt-14 items-start">

          {/* Left */}
          <div className="space-y-8">

            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Master OSCE stations
              <span className="block text-muted-foreground">
                with smart simulation.
              </span>
            </h1>

            <p className="text-muted-foreground text-lg max-w-xl">
              Choose scenarios, pick a mode, and receive structured AI feedback
              to improve clinical reasoning and communication.
            </p>

            <button
              onClick={() => setActiveTab('cases')}
              className="px-6 py-3 rounded-xl bg-card border border-border hover:opacity-90 transition font-medium"
            >
              Explore Cases
            </button>

          </div>

          {/* Right – Premium Features Layout */}
          <div className="grid gap-6">

            <div className="bg-card rounded-3xl p-7 border border-border shadow-sm hover:shadow-md transition">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-background/60 border border-border flex items-center justify-center">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Scenario-based practice
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    OSCE stations categorized by specialty, difficulty,
                    and learning objectives.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-3xl p-7 border border-border shadow-sm hover:shadow-md transition">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-background/60 border border-border flex items-center justify-center">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Flexible training modes
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Practice mode, timed exam simulations,
                    or guided structured learning.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-3xl p-7 border border-border shadow-sm hover:shadow-md transition">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-background/60 border border-border flex items-center justify-center">
                  <Brain size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    AI-powered feedback
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Instant scoring, structured evaluation,
                    and personalized improvement insights.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="mt-24 border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            © 2026 MeduPal. All rights reserved.
          </div>

          <div>
            Version 1.0 • Built with React & Tailwind
          </div>
        </div>

      </div>
    </div>
  );
}
