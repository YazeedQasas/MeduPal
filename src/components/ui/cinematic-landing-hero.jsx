// src/components/ui/cinematic-landing-hero.jsx
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "../../lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const INJECTED_STYLES = `
  .gsap-reveal { visibility: hidden; }

  .film-grain-xp {
    position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 50; opacity: 0.05; mix-blend-mode: overlay;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }

  .bg-grid-xp {
    background-size: 60px 60px;
    background-image:
      linear-gradient(to right, color-mix(in srgb, var(--color-foreground) 5%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in srgb, var(--color-foreground) 5%, transparent) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  .text-3d-matte-xp {
    color: #FFFFFF;
    text-shadow:
      0 10px 30px rgba(255,255,255,0.18),
      0 2px 4px rgba(255,255,255,0.08);
  }

  .text-silver-matte-xp {
    background: linear-gradient(180deg, #FFFFFF 0%, #9CA3AF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    transform: translateZ(0);
    padding-bottom: 0.2em;
    filter:
      drop-shadow(0px 10px 20px rgba(255,255,255,0.12))
      drop-shadow(0px 2px 4px rgba(255,255,255,0.06));
  }

  .text-card-silver-matte-xp {
    background: linear-gradient(180deg, #FFFFFF 0%, #A1A1AA 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    transform: translateZ(0);
    filter:
      drop-shadow(0px 12px 24px rgba(0,0,0,0.8))
      drop-shadow(0px 4px 8px rgba(0,0,0,0.6));
  }

  .premium-depth-card-xp {
    background: linear-gradient(145deg, #0d2a20 0%, #050f09 100%);
    box-shadow:
      0 40px 100px -20px rgba(0, 0, 0, 0.9),
      0 20px 40px -20px rgba(0, 0, 0, 0.8),
      inset 0 1px 2px rgba(100, 170, 145, 0.15),
      inset 0 -2px 4px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(100, 170, 145, 0.08);
    position: relative;
  }

  .card-sheen-xp {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
    background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(100,170,145,0.07) 0%, transparent 40%);
    mix-blend-mode: screen; transition: opacity 0.3s ease;
  }

  .iphone-bezel-xp {
    background-color: #111;
    box-shadow:
      inset 0 0 0 2px #52525B,
      inset 0 0 0 7px #000,
      0 40px 80px -15px rgba(0,0,0,0.9),
      0 15px 25px -5px rgba(0,0,0,0.7);
    transform-style: preserve-3d;
  }

  .hardware-btn-xp {
    background: linear-gradient(90deg, #404040 0%, #171717 100%);
    box-shadow:
      -2px 0 5px rgba(0,0,0,0.8),
      inset -1px 0 1px rgba(255,255,255,0.15),
      inset 1px 0 2px rgba(0,0,0,0.8);
    border-left: 1px solid rgba(255,255,255,0.05);
  }

  .screen-glare-xp {
    background: linear-gradient(110deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 45%);
  }

  .widget-depth-xp {
    background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
    box-shadow:
      0 10px 20px rgba(0,0,0,0.3),
      inset 0 1px 1px rgba(255,255,255,0.05),
      inset 0 -1px 1px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.03);
  }

  .floating-ui-badge-xp {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.01) 100%);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow:
      0 0 0 1px rgba(100, 170, 145, 0.15),
      0 25px 50px -12px rgba(0, 0, 0, 0.8),
      inset 0 1px 1px rgba(255,255,255,0.2),
      inset 0 -1px 1px rgba(0,0,0,0.5);
  }

  .btn-xp-light, .btn-xp-dark {
    transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .btn-xp-light {
    background: linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%);
    color: #0F172A;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1), 0 12px 24px -4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,1), inset 0 -3px 6px rgba(0,0,0,0.06);
  }
  .btn-xp-light:hover {
    transform: translateY(-3px);
    box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 6px 12px -2px rgba(0,0,0,0.15), 0 20px 32px -6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,1), inset 0 -3px 6px rgba(0,0,0,0.06);
  }
  .btn-xp-light:active {
    transform: translateY(1px);
    background: linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%);
    box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1), inset 0 3px 6px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.02);
  }
  .btn-xp-dark {
    background: linear-gradient(180deg, #0d2a20 0%, #071510 100%);
    color: #FFFFFF;
    box-shadow: 0 0 0 1px rgba(100,170,145,0.2), 0 2px 4px rgba(0,0,0,0.6), 0 12px 24px -4px rgba(0,0,0,0.9), inset 0 1px 1px rgba(100,170,145,0.2), inset 0 -3px 6px rgba(0,0,0,0.8);
  }
  .btn-xp-dark:hover {
    transform: translateY(-3px);
    background: linear-gradient(180deg, #173d2e 0%, #0d2a20 100%);
    box-shadow: 0 0 0 1px rgba(100,170,145,0.3), 0 6px 12px -2px rgba(0,0,0,0.7), 0 20px 32px -6px rgba(0,0,0,1), inset 0 1px 1px rgba(100,170,145,0.25), inset 0 -3px 6px rgba(0,0,0,0.8);
  }
  .btn-xp-dark:active {
    transform: translateY(1px);
    background: #071510;
    box-shadow: 0 0 0 1px rgba(100,170,145,0.1), inset 0 3px 8px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(0,0,0,0.5);
  }

  .progress-ring-xp {
    transform: rotate(-90deg);
    transform-origin: center;
    stroke-dasharray: 402;
    stroke-dashoffset: 402;
    stroke-linecap: round;
  }
`;

export function CinematicHero({ setActiveTab, className }) {
  const containerRef = useRef(null);
  const mainCardRef = useRef(null);
  const mockupRef = useRef(null);
  const requestRef = useRef(0);

  const metricValue = 87;

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (window.scrollY > window.innerHeight * 2) return;
      cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => {
        if (mainCardRef.current && mockupRef.current) {
          const rect = mainCardRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          mainCardRef.current.style.setProperty("--mouse-x", `${mouseX}px`);
          mainCardRef.current.style.setProperty("--mouse-y", `${mouseY}px`);
          const xVal = (e.clientX / window.innerWidth - 0.5) * 2;
          const yVal = (e.clientY / window.innerHeight - 0.5) * 2;
          gsap.to(mockupRef.current, {
            rotationY: xVal * 12,
            rotationX: -yVal * 12,
            ease: "power3.out",
            duration: 1.2,
          });
        }
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const ctx = gsap.context(() => {
      gsap.set(".text-track-xp", { autoAlpha: 0, y: 60, scale: 0.85, filter: "blur(20px)", rotationX: -20 });
      gsap.set(".text-days-xp", { autoAlpha: 1, clipPath: "inset(0 100% 0 0)" });
      gsap.set(".main-card-xp", { y: window.innerHeight + 200, autoAlpha: 1 });
      gsap.set([".card-left-text-xp", ".card-right-text-xp", ".mockup-scroll-wrapper-xp", ".floating-badge-xp", ".phone-widget-xp"], { autoAlpha: 0 });
      gsap.set(".cta-wrapper-xp", { autoAlpha: 0, scale: 0.8, filter: "blur(30px)" });

      const introTl = gsap.timeline({ delay: 0.3 });
      introTl
        .to(".text-track-xp", { duration: 1.8, autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", rotationX: 0, ease: "expo.out" })
        .to(".text-days-xp", { duration: 1.4, clipPath: "inset(0 0% 0 0)", ease: "power4.inOut" }, "-=1.0");

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=7000",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      scrollTl
        .to([".hero-text-wrapper-xp", ".bg-grid-xp"], { scale: 1.15, filter: "blur(20px)", opacity: 0.2, ease: "power2.inOut", duration: 2 }, 0)
        .to(".main-card-xp", { y: 0, ease: "power3.inOut", duration: 2 }, 0)
        .to(".main-card-xp", { width: "100%", height: "100%", borderRadius: "0px", ease: "power3.inOut", duration: 1.5 })
        .fromTo(".mockup-scroll-wrapper-xp",
          { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
          { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 2.5 }, "-=0.8"
        )
        .fromTo(".phone-widget-xp", { y: 40, autoAlpha: 0, scale: 0.95 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.15, ease: "back.out(1.2)", duration: 1.5 }, "-=1.5")
        .to(".progress-ring-xp", { strokeDashoffset: 52, duration: 2, ease: "power3.inOut" }, "-=1.2")
        .to(".counter-val-xp", { innerHTML: metricValue, snap: { innerHTML: 1 }, duration: 2, ease: "expo.out" }, "-=2.0")
        .fromTo(".floating-badge-xp", { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -10 }, { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: "back.out(1.5)", duration: 1.5, stagger: 0.2 }, "-=2.0")
        .fromTo(".card-left-text-xp", { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: "power4.out", duration: 1.5 }, "-=1.5")
        .fromTo(".card-right-text-xp", { x: 50, autoAlpha: 0, scale: 0.8 }, { x: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 1.5 }, "<")
        .to({}, { duration: 2.5 })
        .set(".hero-text-wrapper-xp", { autoAlpha: 0 })
        .set(".cta-wrapper-xp", { autoAlpha: 1 })
        .to({}, { duration: 1.5 })
        .to([".mockup-scroll-wrapper-xp", ".floating-badge-xp", ".card-left-text-xp", ".card-right-text-xp"], {
          scale: 0.9, y: -40, z: -200, autoAlpha: 0, ease: "power3.in", duration: 1.2, stagger: 0.05,
        })
        .to(".main-card-xp", {
          width: isMobile ? "92vw" : "85vw",
          height: isMobile ? "92vh" : "85vh",
          borderRadius: isMobile ? "32px" : "40px",
          ease: "expo.inOut",
          duration: 1.8,
        }, "pullback")
        .to(".cta-wrapper-xp", { scale: 1, filter: "blur(0px)", ease: "expo.inOut", duration: 1.8 }, "pullback")
        .to(".main-card-xp", { y: -window.innerHeight - 300, ease: "power3.in", duration: 1.5 });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const domains = [
    { label: 'History', pct: 92, color: '#64aa91' },
    { label: 'Comms', pct: 84, color: '#60a5fa' },
    { label: 'Exam', pct: 78, color: '#a78bfa' },
    { label: 'Reasoning', pct: 88, color: '#34d399' },
  ];

  return (
    <div
      ref={containerRef}
      className={cn("relative w-screen h-screen overflow-hidden flex items-center justify-center text-foreground font-sans antialiased", className)}
      style={{ perspective: "1500px", background: "#050505" }}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain-xp" aria-hidden="true" />
      <div className="bg-grid-xp absolute inset-0 z-0 pointer-events-none opacity-50" aria-hidden="true" />

      {/* Background hero text */}
      <div className="hero-text-wrapper-xp absolute z-10 flex flex-col items-center justify-center text-center w-screen px-4 will-change-transform">
        <h2 className="text-track-xp gsap-reveal text-3d-matte-xp text-5xl md:text-7xl lg:text-[6rem] font-bold tracking-tight mb-2">
          Train every OSCE
        </h2>
        <h2 className="text-days-xp gsap-reveal text-silver-matte-xp text-5xl md:text-7xl lg:text-[6rem] font-extrabold tracking-tighter">
          station. Perfectly.
        </h2>
      </div>

      {/* Background CTA */}
      <div className="cta-wrapper-xp absolute z-10 flex flex-col items-center justify-center text-center w-screen px-4 gsap-reveal pointer-events-auto will-change-transform">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-silver-matte-xp">
          Start training today.
        </h2>
        <p className="text-muted-foreground text-lg md:text-xl mb-12 max-w-xl mx-auto font-light leading-relaxed">
          Join hundreds of medical students mastering OSCE with AI-powered feedback and physical manikin simulations.
        </p>
        <div className="flex flex-col sm:flex-row gap-6">
          <button
            onClick={() => setActiveTab?.('auth-signup')}
            className="btn-xp-light flex items-center justify-center gap-3 px-8 py-4 rounded-[1.25rem] group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="text-left">
              <div className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase mb-[-2px]">New here?</div>
              <div className="text-xl font-bold leading-none tracking-tight">Get Started</div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab?.('auth')}
            className="btn-xp-dark flex items-center justify-center gap-3 px-8 py-4 rounded-[1.25rem] group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background"
          >
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <div className="text-left">
              <div className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase mb-[-2px]">Have an account?</div>
              <div className="text-xl font-bold leading-none tracking-tight">Sign In</div>
            </div>
          </button>
        </div>
      </div>

      {/* Foreground: deep green card */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none" style={{ perspective: "1500px" }}>
        <div
          ref={mainCardRef}
          className="main-card-xp premium-depth-card-xp relative overflow-hidden gsap-reveal flex items-center justify-center pointer-events-auto w-[92vw] md:w-[85vw] h-[92vh] md:h-[85vh] rounded-[32px] md:rounded-[40px]"
        >
          <div className="card-sheen-xp" aria-hidden="true" />

          <div className="relative w-full h-full max-w-7xl mx-auto px-4 lg:px-12 flex flex-col justify-evenly lg:grid lg:grid-cols-3 items-center lg:gap-8 z-10 py-6 lg:py-0">

            {/* Top (mobile) / Right (desktop): Brand name */}
            <div className="card-right-text-xp gsap-reveal order-1 lg:order-3 flex justify-center lg:justify-end z-20 w-full">
              <h2 className="text-6xl md:text-[6rem] lg:text-[8rem] font-black uppercase tracking-tighter text-card-silver-matte-xp lg:mt-0">
                XPatient
              </h2>
            </div>

            {/* Middle (mobile) / Center (desktop): iPhone mockup */}
            <div className="mockup-scroll-wrapper-xp order-2 lg:order-2 relative w-full h-[380px] lg:h-[600px] flex items-center justify-center z-10" style={{ perspective: "1000px" }}>
              <div className="relative w-full h-full flex items-center justify-center transform scale-[0.65] md:scale-85 lg:scale-100">
                <div
                  ref={mockupRef}
                  className="relative w-[280px] h-[580px] rounded-[3rem] iphone-bezel-xp flex flex-col will-change-transform"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Hardware buttons */}
                  <div className="absolute top-[120px] -left-[3px] w-[3px] h-[25px] hardware-btn-xp rounded-l-md z-0" aria-hidden="true" />
                  <div className="absolute top-[160px] -left-[3px] w-[3px] h-[45px] hardware-btn-xp rounded-l-md z-0" aria-hidden="true" />
                  <div className="absolute top-[220px] -left-[3px] w-[3px] h-[45px] hardware-btn-xp rounded-l-md z-0" aria-hidden="true" />
                  <div className="absolute top-[170px] -right-[3px] w-[3px] h-[70px] hardware-btn-xp rounded-r-md z-0 scale-x-[-1]" aria-hidden="true" />

                  {/* Screen */}
                  <div className="absolute inset-[7px] bg-[#050f09] rounded-[2.5rem] overflow-hidden text-white z-10" style={{ boxShadow: "inset 0 0 15px rgba(0,0,0,1)" }}>
                    <div className="absolute inset-0 screen-glare-xp z-40 pointer-events-none" aria-hidden="true" />

                    {/* Dynamic island */}
                    <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-50 flex items-center justify-end px-3" style={{ boxShadow: "inset 0 -1px 2px rgba(255,255,255,0.1)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ boxShadow: "0 0 8px rgba(52,211,153,0.8)" }} />
                    </div>

                    {/* App interface */}
                    <div className="relative w-full h-full pt-12 px-5 pb-8 flex flex-col">
                      <div className="phone-widget-xp flex justify-between items-center mb-8">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: 'rgba(100,170,145,0.6)' }}>OSCE Session</span>
                          <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">Cardiology</span>
                        </div>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border" style={{ background: 'rgba(100,170,145,0.1)', color: 'rgba(100,170,145,0.9)', borderColor: 'rgba(100,170,145,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>JD</div>
                      </div>

                      {/* Score ring */}
                      <div className="phone-widget-xp relative w-44 h-44 mx-auto flex items-center justify-center mb-6" style={{ filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.8))" }}>
                        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
                          <circle cx="88" cy="88" r="64" fill="none" stroke="rgba(100,170,145,0.08)" strokeWidth="12" />
                          <circle className="progress-ring-xp" cx="88" cy="88" r="64" fill="none" stroke="url(#xpScoreGrad)" strokeWidth="12" />
                          <defs>
                            <linearGradient id="xpScoreGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#64aa91" />
                              <stop offset="100%" stopColor="#34d399" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="text-center z-10 flex flex-col items-center">
                          <span className="counter-val-xp text-4xl font-extrabold tracking-tighter text-white">0</span>
                          <span className="text-[8px] uppercase tracking-[0.1em] font-bold mt-0.5" style={{ color: 'rgba(100,170,145,0.5)' }}>OSCE Score</span>
                        </div>
                      </div>

                      {/* Domain bars */}
                      <div className="phone-widget-xp widget-depth-xp rounded-2xl p-3 mb-2">
                        <div className="text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: 'rgba(100,170,145,0.5)' }}>Domains</div>
                        <div className="space-y-2">
                          {domains.map(({ label, pct, color }) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="text-[9px] w-14 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                              </div>
                              <span className="text-[9px] tabular-nums w-6 text-right" style={{ color }}>{pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-[4px] rounded-full" style={{ background: 'rgba(255,255,255,0.2)', boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />
                    </div>
                  </div>
                </div>

                {/* Floating badge: top left */}
                <div className="floating-badge-xp absolute flex top-6 lg:top-12 left-[-15px] lg:left-[-80px] floating-ui-badge-xp rounded-xl lg:rounded-2xl p-3 lg:p-4 items-center gap-3 lg:gap-4 z-30">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center border" style={{ background: 'rgba(100,170,145,0.1)', borderColor: 'rgba(100,170,145,0.25)' }}>
                    <span className="text-base lg:text-xl drop-shadow-lg" aria-hidden="true">🏅</span>
                  </div>
                  <div>
                    <p className="text-white text-xs lg:text-sm font-bold tracking-tight">Top 10%</p>
                    <p className="text-[10px] lg:text-xs font-medium" style={{ color: 'rgba(100,170,145,0.5)' }}>Station completed</p>
                  </div>
                </div>

                {/* Floating badge: bottom right */}
                <div className="floating-badge-xp absolute flex bottom-12 lg:bottom-20 right-[-15px] lg:right-[-80px] floating-ui-badge-xp rounded-xl lg:rounded-2xl p-3 lg:p-4 items-center gap-3 lg:gap-4 z-30">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center border" style={{ background: 'rgba(100,170,145,0.1)', borderColor: 'rgba(100,170,145,0.25)' }}>
                    <span className="text-base lg:text-lg drop-shadow-lg" aria-hidden="true">🤖</span>
                  </div>
                  <div>
                    <p className="text-white text-xs lg:text-sm font-bold tracking-tight">AI Feedback</p>
                    <p className="text-[10px] lg:text-xs font-medium" style={{ color: 'rgba(100,170,145,0.5)' }}>3 insights found</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom (mobile) / Left (desktop): Description text */}
            <div className="card-left-text-xp gsap-reveal order-3 lg:order-1 flex flex-col justify-center text-center lg:text-left z-20 w-full lg:max-w-none px-4 lg:px-0">
              <h3 className="text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-0 lg:mb-5 tracking-tight">
                Clinical simulation, reinvented.
              </h3>
              <p className="hidden md:block text-sm md:text-base lg:text-lg font-normal leading-relaxed mx-auto lg:mx-0 max-w-sm lg:max-w-none" style={{ color: 'rgba(100,170,145,0.6)' }}>
                <span className="text-white font-semibold">XPatient</span> pairs AI-driven patient actors, physical manikins, and instant domain-level OSCE feedback — so every student trains at the same high standard.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
