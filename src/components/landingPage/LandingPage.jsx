import React, { useEffect, useState, useRef, useCallback } from 'react';
import student1 from '../../assets/Student_1.jpg';
import student2 from '../../assets/Student_2.jpg';
import student3 from '../../assets/Student_3.jpg';
import student4 from '../../assets/Student_4.jpg';
import dashboardImg from '../../assets/Dashboard.png';
import DisplayCards from '../ui/DisplayCards';
import { Footer } from '../ui/FooterSection';
import { ContactFormSection } from '../ui/ContactFormSection';
import { BentoGridBlock } from '../ui/BentoGridBlock';
import { InteractiveGlobe } from '../ui/InteractiveGlobe';
import aquLogo from '../../assets/AQU-WHITE.png';
import oxfordLogo from '../../assets/Oxford-Black.png';
import cambridgeLogo from '../../assets/Cambridge.png';
import uclLogo from '../../assets/UCL-White.png';
import hopkinsLogo from '../../assets/Johns-Hopkins.png';
import aaupLogo from '../../assets/AAUP-Normal.png';
import {
  Brain, Stethoscope, ClipboardList, ShieldCheck, ArrowRight, ArrowUpRight,
  Zap, Target, Award, ChevronDown, MessageSquare, Send, LogIn,
  CheckCircle2, Activity, User, Sparkles, Star
} from 'lucide-react';

/* ─────────────────────────────────────────
   useInView – trigger once on scroll
───────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function FadeIn({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      filter: inView ? 'blur(0)' : 'blur(4px)',
      transform: inView ? 'translateY(0)' : 'translateY(10px)',
      transition: `opacity 0.6s ease-out ${delay}s, filter 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
    }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   Animated score counter
───────────────────────────────────────── */
function CountUp({ to, duration = 1400 }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          setVal(Math.round(p * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val}</span>;
}

/* ─────────────────────────────────────────
   Apple-style background — single halo
───────────────────────────────────────── */
function AppleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* primary halo — top-right biased (towards card side) */}
      <div style={{
        position: 'absolute',
        top: '-15%', left: '60%',
        transform: 'translateX(-50%)',
        width: '110%', height: '85%',
        background: 'radial-gradient(ellipse 55% 55% at 50% 10%, rgba(30,100,240,0.32) 0%, rgba(15,60,180,0.12) 50%, transparent 74%)',
        filter: 'blur(10px)',
      }} />
      {/* secondary depth glow — lower centre */}
      <div style={{
        position: 'absolute',
        bottom: '-10%', left: '50%',
        transform: 'translateX(-50%)',
        width: '90%', height: '60%',
        background: 'radial-gradient(ellipse 55% 60% at 50% 90%, rgba(100,50,220,0.14) 0%, transparent 70%)',
        filter: 'blur(8px)',
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   SVG score ring
───────────────────────────────────────── */
function ScoreRing({ score, active }) {
  const R   = 36;
  const circ = 2 * Math.PI * R;
  const offset = active ? circ * (1 - score / 100) : circ;
  return (
    <svg width={88} height={88} className="-rotate-90">
      <circle cx={44} cy={44} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle
        cx={44} cy={44} r={R} fill="none"
        stroke="url(#scoreGrad)" strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1) 0.2s' }}
      />
      <defs>
        <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─────────────────────────────────────────
   Mock feedback card – floats in hero
───────────────────────────────────────── */
function FeedbackCard() {
  const [stage, setStage] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 700);
    const t2 = setTimeout(() => {
      setStage(2);
      let s = 0;
      const iv = setInterval(() => { s += 2; setScore(s); if (s >= 87) clearInterval(iv); }, 18);
    }, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const domains = [
    { label: 'History Taking',    pct: 92, color: '#60a5fa', delay: '0.3s' },
    { label: 'Communication',     pct: 84, color: '#a78bfa', delay: '0.5s' },
    { label: 'Clinical Reasoning',pct: 78, color: '#34d399', delay: '0.7s' },
    { label: 'Examination',       pct: 88, color: '#f472b6', delay: '0.9s' },
    { label: 'Management Plan',   pct: 71, color: '#fb923c', delay: '1.1s' },
  ];

  const feedback = [
    'Good systematic approach to history. Consider asking about radiation of pain earlier.',
    'Communication was clear — remember to summarise findings back to the patient.',
  ];

  return (
    <div className="w-[340px] rounded-2xl bg-[#080808] border border-white/10 overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)]">

      {/* header bar */}
      <div className="px-5 py-3.5 border-b border-white/7 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
          <span className="text-xs text-white/55 font-medium tracking-tight">AI Feedback Report</span>
        </div>
        <span className="text-[10px] text-white/20 tabular-nums">
          {stage === 0 ? '––:––' : stage === 1 ? 'Processing…' : 'Just now'}
        </span>
      </div>

      {/* station info */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] text-white/28 uppercase tracking-widest mb-1">Station</div>
          <div className="text-sm font-semibold text-white leading-tight">Chest Pain — Cardiology</div>
          <div className="text-xs text-white/35 mt-1">62M · Presenting: central chest pain</div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400">Intermediate</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/35">Timed</span>
        </div>
      </div>

      {/* score row */}
      <div className="px-5 py-3 flex items-center gap-5 border-t border-b border-white/6">
        <div className="relative flex-shrink-0">
          <ScoreRing score={score} active={stage === 2} />
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'rotate(0deg)' }}>
            {stage < 2 ? (
              <span className="text-[10px] text-white/20 animate-pulse">…</span>
            ) : (
              <>
                <span className="text-xl font-bold leading-none">{score}</span>
                <span className="text-[10px] text-white/30 mt-0.5">/100</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-white/28 uppercase tracking-widest mb-2">OSCE Domains</div>
          <div className="space-y-1.5">
            {domains.map(({ label, pct, color, delay }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-white/6 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: stage === 2 ? `${pct}%` : '0%',
                      background: color,
                      transition: `width 0.9s cubic-bezier(0.34,1.56,0.64,1) ${delay}`,
                    }}
                  />
                </div>
                <span className="text-[9px] tabular-nums" style={{ color: stage === 2 ? color : 'rgba(255,255,255,0.2)', minWidth: 24 }}>
                  {stage === 2 ? `${pct}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI feedback notes */}
      <div className="px-5 py-4">
        <div className="text-[10px] text-white/28 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Brain size={10} className="text-purple-400" />
          Key Feedback
        </div>
        <div className="space-y-2">
          {feedback.map((note, i) => (
            <div
              key={i}
              className="text-[11px] text-white/45 leading-relaxed pl-3 border-l border-white/10"
              style={{
                opacity: stage === 2 ? 1 : 0,
                transition: `opacity 0.6s ease ${1.4 + i * 0.3}s`,
              }}
            >
              {note}
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <div className="px-5 py-3 border-t border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={11} className={stage === 2 ? 'text-emerald-400' : 'text-white/15'} />
          <span className="text-[10px] text-white/30">{stage === 2 ? 'Evaluation complete' : 'Evaluating…'}</span>
        </div>
        <span className="text-[10px] text-blue-400/60 hover:text-blue-400 cursor-pointer transition-colors">
          View full report →
        </span>
      </div>

    </div>
  );
}

/* ─────────────────────────────────────────
   Main
───────────────────────────────────────── */
const phrases = ['smart automation', 'AI-powered feedback', 'physical manikins', 'the future of medicine'];

export default function LandingPage({ setActiveTab }) {
  const [phraseIdx, setPhraseIdx]     = useState(0);
  const [visible, setVisible]         = useState(true);
  const [scrolled, setScrolled]       = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [mouse, setMouse]             = useState({ x: 0, y: 0 });
  const [aboutWordIdx, setAboutWordIdx] = useState(0);
  const heroRef = useRef(null);

  const aboutRotatingWords = ['Globally', 'Equally', 'Properly'];

  /* phrase rotation */
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 2800);
    const t2 = setTimeout(() => { setPhraseIdx(i => (i + 1) % phrases.length); setVisible(true); }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phraseIdx]);

  /* About section rotating word */
  useEffect(() => {
    const id = setInterval(() => {
      setAboutWordIdx((i) => (i + 1) % aboutRotatingWords.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  /* scroll → nav bg + active section */
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const sections = ['features', 'about', 'contact'];
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) { setActiveSection(id); return; }
      }
      setActiveSection('');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* mouse parallax */
  const handleMouseMove = useCallback((e) => {
    const { left, top, width, height } = heroRef.current?.getBoundingClientRect() ?? {};
    if (!width) return;
    setMouse({
      x: ((e.clientX - left) / width  - 0.5) * 2,
      y: ((e.clientY - top)  / height - 0.5) * 2,
    });
  }, []);

  const navLink = (id, label) => (
    <a
      key={id}
      href={`#${id}`}
      className={`relative text-sm transition-colors ${
        activeSection === id ? 'text-white' : 'text-white/50 hover:text-white/80'
      }`}
    >
      {label}
      {activeSection === id && (
        <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-white/40 rounded-full" />
      )}
    </a>
  );

  return (
    <div className="min-h-screen bg-[#000] text-white overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="relative z-20 w-full" style={{ padding: '10px 16px' }}>
        <div className="flex items-center justify-between">

          {/* ── FAR LEFT: logo ── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgba(100,170,145,0.35), rgba(60,120,100,0.15))',
              boxShadow: '0 0 12px rgba(100,170,145,0.15)',
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 2.5 C5 2.5 2.5 5 2.5 8 C2.5 11 5 13.5 8 13.5 C10.2 13.5 12.1 12.2 13 10.3" stroke="rgba(200,235,220,0.9)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                <path d="M8 5.5 C6.3 5.5 5 6.8 5 8.5 C5 10.1 6.3 11.4 8 11.4 C9.1 11.4 10 10.8 10.5 9.9" stroke="rgba(200,235,220,0.9)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-white/85">MeduPal</span>
          </div>

          {/* ── CENTER: floating nav links ── */}
          <div className="hidden md:flex items-center absolute left-1/2 top-1/2" style={{ transform: 'translate(-50%, -50%)' }}>
            {[
              { id: 'home',     label: 'Home' },
              { id: 'features', label: 'Features' },
              { id: 'cases',    label: 'Cases' },
              { id: 'about',    label: 'About' },
              { id: 'contact',  label: 'Contact' },
            ].map(({ id, label }) => (
              <a
                key={id}
                href={id === 'home' ? '#' : `#${id}`}
                className={`nav-link px-3.5 py-[5px] text-[12.5px] whitespace-nowrap cursor-pointer ${
                  activeSection === id
                    ? 'text-white/90 font-medium'
                    : 'text-white/30 hover:text-white/65'
                }`}
              >
                {label}
              </a>
            ))}
          </div>

          {/* ── FAR RIGHT: auth ── */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setActiveTab('auth')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-[5px] rounded-full cursor-pointer transition-all hover:bg-white/[0.06]"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <User size={13} className="text-white/40" />
              <span className="text-[12px] text-white/40">Sign In</span>
            </button>
            <button
              onClick={() => setActiveTab('auth')}
              className="text-[12px] font-medium px-4 py-[6px] rounded-full transition-all whitespace-nowrap active:scale-[0.97] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, rgba(100,170,145,0.30), rgba(60,130,110,0.15))',
                border: '1px solid rgba(100,170,145,0.22)',
                color: 'rgba(200,235,220,0.85)',
                boxShadow: '0 0 16px rgba(100,170,145,0.08)',
              }}
            >
              Get Started
            </button>
          </div>

        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO CARD — rounded container (hero only)
      ══════════════════════════════════════════ */}
      <div className="mx-3 mt-2" style={{
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.6), 0 50px 100px rgba(0,0,0,0.9)',
        background: '#060909',
      }}>
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative flex flex-col items-center justify-center overflow-x-hidden"
        style={{ minHeight: 'calc(100vh - 3.5rem)' }}
      >
        {/* ── PRIMARY glow — bleeds up through the nav area ── */}
        <div className="absolute pointer-events-none" style={{
          top: '-28%', left: '50%',
          transform: 'translateX(-44%)',
          width: '130%', height: '110%',
          background: 'radial-gradient(ellipse 65% 52% at 56% 15%, rgba(230,245,235,0.95) 0%, rgba(195,225,208,0.60) 18%, rgba(155,200,175,0.28) 40%, rgba(100,165,140,0.08) 62%, transparent 78%)',
          filter: 'blur(14px)',
        }} />
        {/* ── glow soft outer halo — also bleeds into nav ── */}
        <div className="absolute pointer-events-none" style={{
          top: '-20%', left: '50%',
          transform: 'translateX(-44%)',
          width: '130%', height: '95%',
          background: 'radial-gradient(ellipse 72% 60% at 55% 12%, rgba(180,215,195,0.35) 0%, rgba(120,175,150,0.12) 50%, transparent 75%)',
          filter: 'blur(40px)',
        }} />

        {/* ── secondary lower-left dark-green depth glow ── */}
        <div className="absolute pointer-events-none" style={{
          bottom: '0%', left: '-3%',
          width: '48%', height: '60%',
          background: 'radial-gradient(ellipse 80% 85% at 10% 88%, rgba(20,65,42,0.80) 0%, rgba(15,50,32,0.40) 40%, transparent 70%)',
          filter: 'blur(25px)',
        }} />


        {/* ── bottom fade to black ── */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{
          height: '28%',
          background: 'linear-gradient(to top, #000 0%, transparent 100%)',
        }} />

        {/* ── mouse spotlight ── */}
        <div className="absolute pointer-events-none" style={{
          width: 600, height: 600, borderRadius: '50%',
          left: '50%', top: '40%',
          background: 'radial-gradient(circle, rgba(90,130,255,0.07) 0%, transparent 65%)',
          transform: `translate(calc(-50% + ${mouse.x * 70}px), calc(-50% + ${mouse.y * 50}px))`,
          transition: 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
        }} />



        {/* ── main content ── */}
        <div className="relative z-10 text-center mx-auto px-6 flex flex-col items-center" style={{ gap: 16 }}>

          {/* eyebrow pill — blur-in like sign-in */}
          <div
            onClick={() => setActiveTab('auth')}
            className="animate-element animate-delay-100"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.05)',
              fontSize: 12, color: 'rgba(255,255,255,0.60)',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', display: 'inline-block', flexShrink: 0 }} />
            AI-powered OSCE training — now available
            <span style={{ fontSize: 11, opacity: 0.7 }}>→</span>
          </div>

          {/* headline — gradient text with shimmer */}
          <h1 className="hero-title animate-element animate-delay-200" style={{
            fontSize: 'clamp(40px,5.8vw,68px)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            lineHeight: 1.06,
            margin: 0,
          }}>
            Master every OSCE{' '}
            <span className="hero-title-fade">station.</span>
          </h1>

          {/* sub-copy */}
          <p className="animate-element animate-delay-300" style={{
            fontSize: 14,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.42)',
            lineHeight: 1.65,
            maxWidth: 520,
            margin: 0,
          }}>
            Choose scenarios, pick a mode, and receive AI-powered feedback to sharpen clinical reasoning
          </p>

          {/* CTAs */}
          <div className="animate-element animate-delay-400" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <button
              onClick={() => setActiveTab('cases')}
              style={{
                height: 40, padding: '0 22px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.72)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                backdropFilter: 'blur(6px)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            >
              Open Cases
              <ArrowRight size={11} style={{ opacity: 0.6 }} />
            </button>
            <button
              onClick={() => setActiveTab('auth')}
              style={{
                height: 40, padding: '0 24px', borderRadius: 999,
                border: 'none',
                background: 'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.40) 50%, rgba(50,110,90,0.50) 100%)',
                color: '#ffffff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 0 20px rgba(100,170,145,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(130,195,175,0.65) 0%, rgba(90,155,135,0.50) 50%, rgba(60,125,105,0.60) 100%)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(100,170,145,0.28), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.40) 50%, rgba(50,110,90,0.50) 100%)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(100,170,145,0.18), inset 0 1px 0 rgba(255,255,255,0.12)'; }}
            >
              Discover More
            </button>
          </div>
        </div>



        {/* ── scroll indicator bottom-left ── */}
        <div
          className="animate-element animate-delay-500 absolute bottom-8 left-8 flex items-center gap-2.5 z-10"
        >
          <div className="w-7 h-7 rounded-full border border-white/14 flex items-center justify-center">
            <ChevronDown size={12} className="text-white/30 animate-bounce" />
          </div>
          <span className="text-[10px] tracking-[0.22em] uppercase text-white/22">01 · Scroll down</span>
        </div>
      </section>
      </div>{/* end hero card */}

      {/* ══════════════════════════════════════════
          TRUSTED BY — university logo strip
      ══════════════════════════════════════════ */}
      <div className="relative py-6 px-6 overflow-hidden">
        {/* edge fades */}
        <div className="absolute inset-y-0 left-0 w-24 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to right, #000, transparent)' }} />
        <div className="absolute inset-y-0 right-0 w-24 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to left, #000, transparent)' }} />

        <FadeIn>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-8 md:gap-0">
          {/* "Used at" label */}
          <p className="text-[10px] tracking-[0.22em] uppercase text-white/18 whitespace-nowrap flex-shrink-0">Used at</p>

          {/* university logo placeholders */}
          {[
            { src: oxfordLogo, alt: 'Oxford', filter: 'invert(1) brightness(1.5)' },
            { src: cambridgeLogo, alt: 'Cambridge', filter: 'brightness(3)' },
            { src: uclLogo, alt: 'UCL', filter: 'brightness(3)' },
            { src: hopkinsLogo, alt: 'Johns Hopkins', filter: 'brightness(3)' },
            { src: aaupLogo, alt: 'AAUP', filter: 'none' },
            { src: aquLogo, alt: 'AQU', filter: 'brightness(3)' },
          ].map(({ src, alt, filter }) => (
            <div key={alt} className="flex items-center cursor-default group flex-shrink-0">
              <img src={src} alt={alt} className="uni-logo" style={{
                height: 38,
                width: 'auto',
                filter,
                opacity: 0.35,
              }} />
            </div>
          ))}
        </div>
        </FadeIn>
      </div>

      {/* ══════════════════════════════════════════
          MACBOOK SHOWCASE
      ══════════════════════════════════════════ */}
      <section className="relative" style={{ padding: '100px 48px 20px', zIndex: 10 }}>
        <FadeIn>
          <div style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 56,
          }}>

            {/* ── LEFT: TEXT ── */}
            <div style={{ flex: '0 0 340px', minWidth: 0 }}>
              <h2 style={{
                fontSize: 'clamp(28px, 3.2vw, 44px)',
                color: 'rgba(255,255,255,0.88)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                fontWeight: 500,
                margin: '0 0 28px',
              }}>
                Your OSCE prep,{' '}
                <span style={{ color: 'rgba(255,255,255,0.28)' }}>one dashboard away.</span>
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <div style={{ display: 'flex' }}>
                  {[student1, student2, student3, student4].map((src, i) => (
                    <img key={i} src={src} alt="" style={{
                      width: 30, height: 30, borderRadius: '50%',
                      border: '2px solid #000',
                      marginLeft: i === 0 ? 0 : -9,
                      objectFit: 'cover',
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>
                  Join <span style={{ color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>500+</span> students
                </span>
              </div>

              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                height: 38, padding: '0 20px',
                background: 'linear-gradient(135deg, rgba(120,180,160,0.45), rgba(80,140,130,0.25))',
                border: '1px solid rgba(120,180,160,0.25)',
                borderRadius: 999,
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}>
                Start training
                <ArrowRight size={13} style={{ opacity: 0.6 }} />
              </button>
            </div>

            {/* ── RIGHT: SCREEN ── */}
            <div className="relative" style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                borderRadius: '16px 16px 0 0',
                border: '1.5px solid rgba(255,255,255,0.10)',
                borderBottom: 'none',
                background: '#0a0a0a',
                padding: '10px 10px 0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
                </div>
                <div style={{
                  borderRadius: '8px 8px 0 0',
                  overflow: 'hidden',
                  aspectRatio: '16/9',
                  position: 'relative',
                }}>
                  <img src={dashboardImg} alt="MeduPal Dashboard" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(165deg, rgba(255,255,255,0.025) 0%, transparent 35%)' }} />
                </div>
              </div>

              {/* fade-out */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: '45%',
                background: 'linear-gradient(to top, #000000 0%, rgba(0,0,0,0.92) 30%, rgba(0,0,0,0.5) 60%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 2,
              }} />

              {/* display cards — bottom right */}
              <div style={{
                position: 'absolute',
                bottom: 30,
                right: -40,
                zIndex: 30,
                transform: 'scale(0.72)',
                transformOrigin: 'bottom right',
              }}>
                <DisplayCards cards={[
                  {
                    icon: <Brain className="size-4 text-emerald-300" />,
                    title: 'AI Feedback',
                    description: 'Real-time clinical reasoning analysis',
                    date: 'Instant results',
                    iconClassName: 'text-emerald-500',
                    titleClassName: 'text-emerald-400',
                    className:
                      "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                  },
                  {
                    icon: <Stethoscope className="size-4 text-blue-300" />,
                    title: 'OSCE Cases',
                    description: '200+ practice stations available',
                    date: 'Updated weekly',
                    iconClassName: 'text-blue-500',
                    titleClassName: 'text-blue-400',
                    className:
                      "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                  },
                  {
                    icon: <Target className="size-4 text-purple-300" />,
                    title: 'Progress',
                    description: 'Track every domain score',
                    date: 'Always improving',
                    iconClassName: 'text-purple-500',
                    titleClassName: 'text-purple-400',
                    className:
                      '[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10',
                  },
                ]} />
              </div>
            </div>

          </div>
        </FadeIn>
      </section>

      {/* ══════════════════════════════════════════
          BENTO GRID (Core features → About)
      ══════════════════════════════════════════ */}
      <FadeIn>
        <BentoGridBlock />
      </FadeIn>

      {/* ══════════════════════════════════════════
          ABOUT — CTA + globe
      ══════════════════════════════════════════ */}
      <section id="about" className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100%,800px)] h-[480px] rounded-full bg-[rgba(100,170,145,0.06)] blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-16 lg:gap-20 items-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-8 text-white">
              Leveling the playing field for medical students.{' '}
              <span key={aboutWordIdx} className="animate-element inline-block text-[rgba(100,170,145,0.95)]">
                {aboutRotatingWords[aboutWordIdx]}
              </span>
            </h2>
            <p className="text-white/50 leading-relaxed mb-8 max-w-lg">
              Where you study shouldn&apos;t limit how well you prepare. MeduPal gives every student access to the same high-quality OSCE practice and AI feedback.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('auth')}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.4) 50%, rgba(50,110,90,0.5) 100%)',
                border: '1px solid rgba(100,170,145,0.25)',
                boxShadow: '0 0 24px rgba(100,170,145,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(130,195,175,0.65) 0%, rgba(90,155,135,0.5) 50%, rgba(60,125,105,0.6) 100%)';
                e.currentTarget.style.boxShadow = '0 0 32px rgba(100,170,145,0.28), inset 0 1px 0 rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.4) 50%, rgba(50,110,90,0.5) 100%)';
                e.currentTarget.style.boxShadow = '0 0 24px rgba(100,170,145,0.2), inset 0 1px 0 rgba(255,255,255,0.12)';
              }}
            >
              Start your journey
              <ArrowUpRight size={18} strokeWidth={2.2} className="opacity-90" />
            </button>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="flex items-center justify-center min-h-[320px] md:min-h-[400px] w-full aspect-square max-w-[480px] mx-auto">
              <InteractiveGlobe
                size={420}
                dotColor="rgba(100, 170, 145, ALPHA)"
                arcColor="rgba(100, 170, 145, 0.45)"
                markerColor="rgba(120, 200, 175, 1)"
                glowColor="rgba(80, 140, 120, 0.08)"
                strokeColor="rgba(100, 170, 145, 0.15)"
                autoRotateSpeed={0.0018}
                className="max-w-full max-h-full"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CONTACT
      ══════════════════════════════════════════ */}
      <FadeIn>
        <ContactFormSection />
      </FadeIn>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <FadeIn>
        <Footer />
      </FadeIn>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* headline gradient — picks up the green glow from the hero bg */
        .hero-title {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.95) 0%,
            rgba(200,235,215,1) 25%,
            rgba(255,255,255,1) 50%,
            rgba(180,220,200,0.95) 75%,
            rgba(255,255,255,0.95) 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          opacity: 0;
          filter: blur(4px);
          transform: translateY(10px);
          animation: fadeSlideIn 0.6s ease-out 0.2s forwards, heroShimmer 6s ease-in-out infinite 1.5s;
        }
        .hero-title-fade {
          -webkit-text-fill-color: rgba(255,255,255,0.26);
        }
        @keyframes heroShimmer {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        /* card float — inner so parallax and float don't conflict */
        @keyframes cardFloatInner {
          0%,100% { transform: translateY(0px) rotate(1deg); }
          50%     { transform: translateY(-11px) rotate(1deg); }
        }
        .card-float-inner { animation: cardFloatInner 5s ease-in-out infinite; }
        /* badge bobs — staggered */
        @keyframes badgeBobA {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-8px); }
        }
        @keyframes badgeBobB {
          0%,100% { transform: translateY(-5px); }
          50%     { transform: translateY(5px); }
        }
        @keyframes badgeBobC {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-6px); }
        }
        .badge-bob-a { animation: badgeBobA 4.2s ease-in-out infinite; }
        .badge-bob-b { animation: badgeBobB 5.5s ease-in-out infinite; }
        .badge-bob-c { animation: badgeBobC 3.8s ease-in-out infinite 0.8s; }

        /* uni logo hover */
        .uni-logo {
          transition: opacity 0.3s ease, filter 0.3s ease;
        }
        .group:hover .uni-logo {
          opacity: 0.65 !important;
        }

        /* nav link hover glow */
        .nav-link {
          position: relative;
          transition: color 0.25s ease, transform 0.2s ease;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          width: 0;
          height: 1px;
          background: rgba(255,255,255,0.5);
          box-shadow: 0 0 8px rgba(180,220,200,0.5), 0 0 16px rgba(180,220,200,0.2);
          border-radius: 2px;
          transform: translateX(-50%);
          transition: width 0.3s ease;
        }
        .nav-link:hover::after {
          width: 60%;
        }
        .nav-link:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
