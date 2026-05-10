import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles, Mic, MessageSquare, Brain, Activity, ClipboardList, CheckCircle2, Heart, User, Zap } from "lucide-react";

const keyMetrics = [
  { label: "OSCE pass rate", value: "94%", caption: "↑ vs. previous cohort" },
  { label: "Sessions run", value: "12k+", caption: "This academic term" },
  { label: "Satisfaction", value: "4.8★", caption: "Post-exam survey" },
];

const skillProgress = [
  { label: "History Taking", progress: 88 },
  { label: "Physical Examination", progress: 74 },
  { label: "Clinical Communication", progress: 91 },
  { label: "Diagnostic Reasoning", progress: 65 },
];

const chatMessages = [
  { role: "student", text: "Where exactly does the pain radiate to?" },
  { role: "patient", text: "Down my left arm — and I feel short of breath when it comes on." },
  { role: "student", text: "How long has this been happening?" },
  { role: "patient", text: "About three days now. It's getting worse each time." },
];

const feedbackScores = [
  { label: "History completeness", score: 9, max: 10 },
  { label: "Communication style", score: 8, max: 10 },
  { label: "Empathy & rapport", score: 7, max: 10 },
];

const specialties = [
  { label: "Cardiology", icon: Heart },
  { label: "Neurology", icon: Brain },
  { label: "Respiratory", icon: Activity },
  { label: "Gastroenterology", icon: ClipboardList },
  { label: "Psychiatry", icon: MessageSquare },
  { label: "Paediatrics", icon: User },
  { label: "Musculoskeletal", icon: Zap },
  { label: "8 specialties →", icon: ArrowUpRight },
];

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function BentoGridBlock({ onCTA }) {
  return (
    <section id="features" className="relative w-full overflow-hidden" style={{ background: '#050505' }}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[rgba(100,170,145,0.06)] blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[rgba(100,170,145,0.05)] blur-[120px]" />
        <div className="absolute left-1/4 top-1/2 h-[400px] w-[400px] rounded-full bg-white/[0.02] blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
            <span className="font-normal">You focus on the exam.</span> We&apos;ll handle the rest.
          </h2>
          <p className="text-[#C8C8C8] text-base md:text-lg max-w-2xl mx-auto leading-loose">
            Practice with AI patients, get structured feedback, and track your progress — all in one place, built for OSCE preparation.
          </p>
        </motion.header>

        <motion.div
          className="mt-12 grid auto-rows-[minmax(200px,auto)] gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: { opacity: 0, y: 24 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.08, delayChildren: 0.12 },
            },
          }}
        >
          {/* Card 1 — AI Patient Chat (2 cols × 2 rows) */}
          <motion.article
            variants={cardVariants}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group relative col-span-1 flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/7 bg-white/[0.025] p-6 transition-all hover:bg-white/[0.05] sm:col-span-2 lg:row-span-2"
            role="article"
            aria-label="AI patient chat"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="space-y-4">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-[rgba(100,170,145,0.9)] animate-pulse" />
                  AI Patient Interaction
                </span>
                <h3 className="text-2xl font-semibold leading-snug text-white md:text-3xl">
                  Speak with AI patients that respond like real people.
                </h3>
              </div>

              <div className="mt-6 space-y-3">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: msg.role === 'student' ? -8 : 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.12, duration: 0.35 }}
                    className={`flex ${msg.role === 'student' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className="max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-snug"
                      style={msg.role === 'student'
                        ? { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }
                        : { background: 'rgba(100,170,145,0.16)', color: 'rgba(200,235,220,0.9)', border: '1px solid rgba(100,170,145,0.15)' }
                      }
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Mic className="h-3.5 w-3.5" />
                  Voice + text — your choice
                </div>
                <button
                  type="button"
                  className="group/cta inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors"
                  onClick={onCTA}
                >
                  Try a session
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" />
                </button>
              </div>
            </div>
          </motion.article>

          {/* Card 2 — Key Metrics (2 cols × 1 row) */}
          <motion.article
            variants={cardVariants}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group col-span-1 flex h-full flex-col rounded-3xl border border-white/7 bg-white/[0.025] p-6 transition-all hover:bg-white/[0.05] sm:col-span-2"
            role="article"
            aria-label="Platform outcomes"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[rgba(100,170,145,0.9)]">
                Outcomes
              </span>
              <motion.div
                animate={{ rotate: [0, -6, 0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
              >
                <Sparkles className="h-5 w-5 text-[rgba(100,170,145,0.9)]" aria-hidden="true" />
              </motion.div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {keyMetrics.map((metric) => (
                <div key={metric.label}>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">{metric.value}</p>
                  <p className="mt-1 text-xs text-[rgba(100,170,145,0.9)]">{metric.caption}</p>
                </div>
              ))}
            </div>
          </motion.article>

          {/* Card 3 — Case Library (2 cols × 3 rows) */}
          <motion.article
            variants={cardVariants}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group relative col-span-1 overflow-hidden rounded-3xl border border-white/7 bg-white/[0.025] transition-all hover:bg-white/[0.05] sm:col-span-2 lg:row-span-3"
            role="article"
            aria-label="OSCE case library"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[320px] w-[320px] rounded-full bg-[rgba(100,170,145,0.07)] blur-[100px]" />
            </div>
            <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
              <div className="space-y-4">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/50">
                  Case Library
                </span>
                <div>
                  <p className="text-[68px] font-bold tracking-tight leading-none text-white">50+</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl">
                    OSCE stations.<br />All exam-standard.
                  </h3>
                </div>
                <p className="text-sm text-white/40 md:text-base leading-loose">
                  Every case ships with full mark sheets, learning objectives, and structured debrief notes — built to your curriculum.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-2">
                {specialties.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-xs text-white/50 transition-colors group-hover:border-white/12 group-hover:text-white/65"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[rgba(100,170,145,0.7)]" />
                    {label}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mt-6 inline-flex w-fit items-center gap-2 text-sm text-[rgba(100,170,145,0.9)] hover:text-[rgba(120,185,160,1)] transition-colors"
                onClick={onCTA}
              >
                Browse stations
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </motion.article>

          {/* Card 4 — Skill Progress (2 cols × 2 rows) */}
          <motion.article
            variants={cardVariants}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group col-span-1 flex h-full flex-col rounded-3xl border border-white/7 bg-white/[0.025] p-6 transition-all hover:bg-white/[0.05] sm:col-span-2 lg:row-span-2"
            role="article"
            aria-label="Skill progress tracker"
          >
            <div className="space-y-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[rgba(100,170,145,0.9)]">
                Skill Tracking
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
                See exactly where you need to improve
              </h3>
              <p className="text-sm text-white/40 leading-loose">
                After each session, Xpatient maps your performance to OSCE competency domains so you always know what to work on next.
              </p>
            </div>
            <div className="mt-6 space-y-4">
              {skillProgress.map((skill, index) => (
                <div key={skill.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/50">
                    <span>{skill.label}</span>
                    <span>{skill.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${skill.progress}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                      className="h-full rounded-full bg-[rgba(100,170,145,0.8)]"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-8 inline-flex w-fit items-center gap-2 text-sm text-[rgba(100,170,145,0.9)] hover:text-[rgba(120,185,160,1)] transition-colors"
              onClick={onCTA}
            >
              <CheckCircle2 className="h-4 w-4" />
              View full progress report
            </button>
          </motion.article>

          {/* Card 5 — AI Feedback (2 cols × 1 row) */}
          <motion.article
            variants={cardVariants}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group col-span-1 flex h-full flex-col overflow-hidden rounded-3xl border border-white/7 bg-white/[0.025] p-6 transition-all hover:bg-white/[0.05] sm:col-span-2"
            role="article"
            aria-label="AI feedback scores"
          >
            <div className="space-y-2 mb-5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/50">
                AI Feedback
              </span>
              <h3 className="text-lg font-semibold tracking-tight text-white md:text-xl">
                Structured debrief after every station
              </h3>
            </div>
            <div className="space-y-3">
              {feedbackScores.map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <span className="w-40 shrink-0 text-xs text-white/45">{item.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(item.score / item.max) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className="h-full rounded-full bg-[rgba(100,170,145,0.8)]"
                    />
                  </div>
                  <span className="text-xs font-semibold text-white/70 tabular-nums w-8 text-right">{item.score}/{item.max}</span>
                </div>
              ))}
            </div>
          </motion.article>

          {/* Card 6 — Voice Practice (2 cols × 1 row) */}
          <motion.article
            variants={cardVariants}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group col-span-1 flex h-full flex-col rounded-3xl border border-white/7 bg-white/[0.025] p-6 transition-all hover:bg-white/[0.05] sm:col-span-2"
            role="article"
            aria-label="Voice practice mode"
          >
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/50">
                Voice + Text
              </span>
              <h3 className="text-lg font-semibold tracking-tight text-white md:text-xl">
                Practice how you think — speak or type
              </h3>
              <p className="text-sm text-white/40 leading-loose">
                Real-time speech recognition transcribes your questions as you speak. The AI patient replies naturally, in context, every time.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Real-time STT", "Natural TTS replies", "No scripted responses", "Exam simulation mode"].map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/50">
                  {tag}
                </span>
              ))}
            </div>
          </motion.article>
        </motion.div>
      </div>
    </section>
  );
}
