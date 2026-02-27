import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import oxfordLogo from '../../assets/Oxford-Black.png';
import cambridgeLogo from '../../assets/Cambridge.png';
import uclLogo from '../../assets/UCL-White.png';
import hopkinsLogo from '../../assets/Johns-Hopkins.png';
import aaupLogo from '../../assets/AAUP-Normal.png';
import aquLogo from '../../assets/AQU-WHITE.png';

const UNIVERSITY_LOGOS = [
  { src: oxfordLogo, alt: 'Oxford', filter: 'invert(1) brightness(1.5)' },
  { src: cambridgeLogo, alt: 'Cambridge', filter: 'brightness(3)' },
  { src: uclLogo, alt: 'UCL', filter: 'brightness(3)' },
  { src: hopkinsLogo, alt: 'Johns Hopkins', filter: 'brightness(3)' },
  { src: aaupLogo, alt: 'AAUP', filter: 'none' },
  { src: aquLogo, alt: 'AQU', filter: 'brightness(3)' },
];

function UniversityLogo({ src, alt, filter }) {
  return (
    <div className="flex items-center justify-center h-10 flex-shrink-0" style={{ minWidth: 60 }}>
      <img
        src={src}
        alt={alt}
        className="max-h-full w-auto object-contain opacity-60 hover:opacity-85 transition-opacity"
        style={{ filter, maxWidth: 100 }}
      />
    </div>
  );
}

/** Floating path animation (from auth reference) — theme-matched stroke on dark */
function FloatingPaths({ position }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-white"
        viewBox="0 0 696 316"
        fill="none"
        aria-hidden
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  );
}

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-colors focus-within:border-[rgba(100,170,145,0.5)] focus-within:bg-[rgba(100,170,145,0.08)]">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 p-5 w-64`}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium text-white/90">{testimonial.name}</p>
      <p className="text-white/40">{testimonial.handle}</p>
      <p className="mt-1 text-white/70">{testimonial.text}</p>
    </div>
  </div>
);

// --- SIGN IN PAGE ---

export function SignInPage({
  title = <span className="font-light text-foreground tracking-tighter">Welcome</span>,
  description = 'Access your account and continue your journey with us',
  heroImageSrc,
  testimonials = [],
  showTextLoop = false,
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
  onBack,
  error = null,
  submitting = false,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative z-10 h-[100dvh] w-full min-w-0 flex flex-col md:flex-row font-geist overflow-x-hidden">
      <section className="flex-1 min-w-0 flex items-center justify-center p-8">
        <div className="w-full max-w-md min-w-0">
          {onBack && (
            <button type="button" onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back
            </button>
          )}
          <div className="flex flex-col gap-6 min-w-0">
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight text-white/95">{title}</h1>
            <p className="animate-element animate-delay-200 text-white/45">{description}</p>

            <form className="space-y-5 min-w-0" onSubmit={onSignIn}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-white/50">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="Enter your email address" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-white placeholder:text-white/30" required />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-white/50">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-white placeholder:text-white/30" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-white/40 hover:text-white/70 transition-colors" /> : <Eye className="w-5 h-5 text-white/40 hover:text-white/70 transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {error && <p className="text-sm text-red-400 animate-element animate-delay-450">{error}</p>}

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                  <span className="text-white/80">Keep me signed in</span>
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} className="hover:underline transition-colors" style={{ color: 'rgba(180,220,200,0.9)' }}>Reset password</a>
              </div>

              <button type="submit" disabled={submitting} className="animate-element animate-delay-600 w-full rounded-2xl py-4 font-semibold text-white disabled:opacity-70 disabled:cursor-not-allowed transition-all" style={{ background: 'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.40) 50%, rgba(50,110,90,0.50) 100%)', boxShadow: '0 0 20px rgba(100,170,145,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}>
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center">
              <span className="w-full border-t border-white/10"></span>
              <span className="px-4 text-sm text-white/40 bg-[#000] absolute">Or continue with</span>
            </div>

            <button type="button" onClick={onGoogleSignIn} className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-white/10 rounded-2xl py-4 text-white/80 hover:bg-white/5 transition-colors">
              <GoogleIcon />
              Sign in with Google
            </button>

            <p className="animate-element animate-delay-900 text-center text-sm text-white/45">
              New to our platform? <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="hover:underline transition-colors" style={{ color: 'rgba(180,220,200,0.9)' }}>Create Account</a>
            </p>
          </div>
        </div>
      </section>

      {(showTextLoop || heroImageSrc) && (
        <section className="hidden md:flex flex-1 min-w-0 relative p-4 overflow-hidden flex-col items-center justify-center">
          {showTextLoop ? (
            <div className="absolute inset-4 rounded-3xl overflow-hidden flex flex-col bg-[#0a0f0d] border border-white/10">
              <div className="relative flex-1 min-h-0">
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0a0f0d] to-transparent" />
                <FloatingPaths position={1} />
                <FloatingPaths position={-1} />
              </div>
              <div className="relative z-10 shrink-0 py-6 px-8">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/40 text-center mb-4">Used at</p>
                <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-14">
                  {UNIVERSITY_LOGOS.map(({ src, alt, filter }) => (
                    <UniversityLogo key={alt} src={src} alt={alt} filter={filter} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${heroImageSrc})` }}>
                <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(105deg, transparent 0%, rgba(0,0,0,0.4) 35%, rgba(15,50,32,0.6) 100%)' }} />
              </div>
              {testimonials.length > 0 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full max-w-full justify-center">
                  <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
                  {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
                  {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

// --- SIGN UP PAGE (same design, for Create Account flow) ---

export function SignUpPage({
  title = <span className="font-light text-foreground tracking-tighter">Create account</span>,
  description = 'Join us and start your journey',
  heroImageSrc,
  testimonials = [],
  showTextLoop = false,
  onSignUp,
  onGoogleSignIn,
  onSignIn,
  onBack,
  error = null,
  submitting = false,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative z-10 h-[100dvh] w-full min-w-0 flex flex-col md:flex-row font-geist overflow-x-hidden">
      <section className="flex-1 min-w-0 flex items-center justify-center p-8">
        <div className="w-full max-w-md min-w-0">
          {onBack && (
            <button type="button" onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back
            </button>
          )}
          <div className="flex flex-col gap-6 min-w-0">
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight text-white/95">{title}</h1>
            <p className="animate-element animate-delay-200 text-white/45">{description}</p>

            <form className="space-y-5 min-w-0" onSubmit={onSignUp}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-white/50">Full name</label>
                <GlassInputWrapper>
                  <input name="fullName" type="text" placeholder="Enter your full name" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-white placeholder:text-white/30" required />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-350">
                <label className="text-sm font-medium text-white/50">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="Enter your email address" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-white placeholder:text-white/30" required />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-white/50">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-white placeholder:text-white/30" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-white/40 hover:text-white/70 transition-colors" /> : <Eye className="w-5 h-5 text-white/40 hover:text-white/70 transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {error && <p className="text-sm text-red-400 animate-element animate-delay-450">{error}</p>}

              <button type="submit" disabled={submitting} className="animate-element animate-delay-600 w-full rounded-2xl py-4 font-semibold text-white disabled:opacity-70 disabled:cursor-not-allowed transition-all" style={{ background: 'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.40) 50%, rgba(50,110,90,0.50) 100%)', boxShadow: '0 0 20px rgba(100,170,145,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}>
                {submitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center">
              <span className="w-full border-t border-white/10"></span>
              <span className="px-4 text-sm text-white/40 bg-[#000] absolute">Or continue with</span>
            </div>

            <button type="button" onClick={onGoogleSignIn} className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-white/10 rounded-2xl py-4 text-white/80 hover:bg-white/5 transition-colors">
              <GoogleIcon />
              Sign up with Google
            </button>

            <p className="animate-element animate-delay-900 text-center text-sm text-white/45">
              Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onSignIn?.(); }} className="hover:underline transition-colors" style={{ color: 'rgba(180,220,200,0.9)' }}>Sign in</a>
            </p>
          </div>
        </div>
      </section>

      {(showTextLoop || heroImageSrc) && (
        <section className="hidden md:flex flex-1 min-w-0 relative p-4 overflow-hidden flex-col items-center justify-center">
          {showTextLoop ? (
            <div className="absolute inset-4 rounded-3xl overflow-hidden flex flex-col bg-[#0a0f0d] border border-white/10">
              <div className="relative flex-1 min-h-0">
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0a0f0d] to-transparent" />
                <FloatingPaths position={1} />
                <FloatingPaths position={-1} />
              </div>
              <div className="relative z-10 shrink-0 py-6 px-8">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/40 text-center mb-4">Used at</p>
                <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-14">
                  {UNIVERSITY_LOGOS.map(({ src, alt, filter }) => (
                    <UniversityLogo key={alt} src={src} alt={alt} filter={filter} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${heroImageSrc})` }}>
                <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(105deg, transparent 0%, rgba(0,0,0,0.4) 35%, rgba(15,50,32,0.6) 100%)' }} />
              </div>
              {testimonials.length > 0 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full max-w-full justify-center">
                  <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
                  {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
                  {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
