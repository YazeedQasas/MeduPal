/* Student-aligned glass theme tokens */

export function DashboardShell({ children, className = '' }) {
  return (
    <div className={`relative min-h-[100vh] w-full ${className}`}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

const ACCENT = '#6ee7b7';
const ACCENT_RGB = '110, 231, 183';

/** Default glass panel — subtle border/shadow so cards read clearly without competing glow */
export const glassCardStyle = {
  /* Same ~12% lift as before; `srgb` keeps mixing valid where `oklab` was flaky */
  background: 'color-mix(in srgb, hsl(var(--card)) 88%, rgb(255,255,255) 12%)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.04) inset',
  backdropFilter: 'blur(10px)',
};

export const glassCardGlowStyle = {
  ...glassCardStyle,
  border: `1px solid rgba(${ACCENT_RGB},0.18)`,
  boxShadow: `0 2px 8px rgba(0,0,0,0.35), 0 0 24px rgba(${ACCENT_RGB},0.05)`,
};

/** Solid card surface — matches InstructorDashboard `P.card` / `P.border` / `P.shadow` */
export const instructorPanelCardStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
};

export const DASHBOARD_THEME = {
  page: 'hsl(var(--background))',
  text: '#f4f4f5',
  muted: '#a1a1aa',
  accent: ACCENT,
  accentRgb: ACCENT_RGB,
  accentSage: 'rgba(110,231,183,0.9)',
  accentGlow: `rgba(${ACCENT_RGB},0.2)`,
  accentBg: `rgba(${ACCENT_RGB},0.12)`,
  gradientBtn: 'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.40) 50%, rgba(50,110,90,0.50) 100%)',
};
