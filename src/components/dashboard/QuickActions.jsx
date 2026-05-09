import { BarChart2, Activity, Settings2, Users, FileCheck, UserCircle2, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { glassCardGlowStyle, DASHBOARD_THEME, instructorPanelCardStyle } from './DashboardShell';

const ACCENT_RGB = DASHBOARD_THEME.accentRgb || '6, 95, 70';

function ActionCard({ icon: Icon, label, sub, onClick, disabled, highlight, isGlass }) {
  const baseStyle = {
    background: isGlass ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
    border: highlight ? `1px solid rgba(${ACCENT_RGB},0.4)` : '1px solid rgba(255,255,255,0.08)',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100'
      )}
      style={{
        ...baseStyle,
        boxShadow: highlight ? `0 0 20px rgba(${ACCENT_RGB},0.1)` : 'none',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
        style={{ background: DASHBOARD_THEME.accentBg, color: DASHBOARD_THEME.accent }}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: DASHBOARD_THEME.text }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: DASHBOARD_THEME.muted }}>{sub}</p>}
      </div>
      <ChevronRight size={16} style={{ color: DASHBOARD_THEME.muted }} />
    </button>
  );
}

/** Compact tile for dashboard grid — not a full-width app strip */
function GridActionTile({ icon: Icon, label, onClick, disabled, highlight }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex flex-col items-center justify-center gap-2 rounded-xl p-3 text-center transition-all duration-200',
        'border bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-45 disabled:pointer-events-none',
        highlight
          ? 'border-emerald-500/35 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
          : 'border-white/10 hover:border-white/14'
      )}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
        style={{ background: DASHBOARD_THEME.accentBg, color: DASHBOARD_THEME.accent }}
      >
        <Icon size={20} strokeWidth={2} />
      </div>
      <span className="text-[11px] sm:text-xs font-medium leading-snug line-clamp-2" style={{ color: DASHBOARD_THEME.text }}>
        {label}
      </span>
    </button>
  );
}

function IconActionCard({ icon: Icon, label, onClick, disabled, highlight, chromeless, inlineLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'group relative w-full h-12 rounded-xl flex items-center justify-center transition-all',
        inlineLabel && 'justify-start gap-2 px-3',
        'hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100'
      )}
      style={{
        background: chromeless ? 'transparent' : 'rgba(255,255,255,0.04)',
        border: chromeless ? '1px solid transparent' : (highlight ? `1px solid rgba(${ACCENT_RGB},0.45)` : '1px solid rgba(255,255,255,0.1)'),
        boxShadow: chromeless ? 'none' : (highlight ? `0 0 16px rgba(${ACCENT_RGB},0.15)` : 'none'),
      }}
    >
      <Icon size={18} style={{ color: DASHBOARD_THEME.accent }} />
      {inlineLabel && (
        <span className="text-xs font-medium truncate" style={{ color: DASHBOARD_THEME.text }}>
          {label}
        </span>
      )}
      <span
        className={cn(
          'absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[10px] font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap',
          inlineLabel && 'hidden'
        )}
        style={{ background: 'rgba(15,23,42,0.96)', border: '1px solid rgba(255,255,255,0.12)', color: '#e5e7eb' }}
      >
        {label}
      </span>
    </button>
  );
}

export function QuickActions({
  onAssignExam,
  onViewAnalytics,
  onRunDiagnostics,
  onManageStudents,
  onOpenSettings,
  onOpenProfile,
  variant,
  highlightAssign,
  iconOnly,
  oneRow,
  /** Use a contained card grid instead of a list or horizontal icon strip */
  layout,
  /** Strip outer card chrome (e.g. inside a parent tab panel on the instructor rail) */
  embedded,
  /** Subtitle under "Quick actions" when using `layout="grid"` */
  gridSubtitle,
} = {}) {
  const isGlass = variant === 'glass';
  const isPanel = variant === 'panel';
  const isThemed = isGlass || isPanel;

  const containerStyle = isGlass
    ? { ...glassCardGlowStyle }
    : isPanel
      ? { ...instructorPanelCardStyle }
      : {
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))',
        };

  const containerClass = isGlass
    ? 'rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-xl'
    : isPanel
      ? 'rounded-2xl p-4 flex flex-col gap-3'
      : 'bg-card rounded-2xl border border-border p-4 flex flex-col gap-3';

  const isTopStrip = !!(iconOnly && oneRow);
  const effectiveContainerStyle = isTopStrip
    ? { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }
    : containerStyle;
  const effectiveContainerClass = isTopStrip
    ? 'flex flex-col gap-2'
    : containerClass;

  if (layout === 'grid') {
    const gridWrap = (
      <>
        {!embedded && (
          <div>
            <h3 className="text-sm font-semibold tracking-tight" style={{ color: DASHBOARD_THEME.text }}>
              Quick actions
            </h3>
            <p className="text-xs mt-1" style={{ color: DASHBOARD_THEME.muted }}>
              {gridSubtitle ?? 'Jump to common instructor tasks'}
            </p>
          </div>
        )}
        <div className={cn('grid gap-3', embedded ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}>
          <GridActionTile
            icon={FileCheck}
            label="Assign exam"
            onClick={onAssignExam}
            disabled={!onAssignExam}
            highlight={highlightAssign}
          />
          <GridActionTile icon={Users} label="Students" onClick={onManageStudents} disabled={!onManageStudents} />
          <GridActionTile icon={BarChart2} label="Cases & analytics" onClick={onViewAnalytics} disabled={!onViewAnalytics} />
          <GridActionTile icon={Activity} label="Hardware" onClick={onRunDiagnostics} disabled={!onRunDiagnostics} />
          <GridActionTile icon={Settings2} label="Settings" onClick={onOpenSettings} disabled={!onOpenSettings} />
          <GridActionTile icon={UserCircle2} label="Profile" onClick={onOpenProfile} disabled={!onOpenProfile} />
        </div>
      </>
    );

    if (embedded) {
      return <div className="flex flex-col gap-3">{gridWrap}</div>;
    }

    return (
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={isPanel ? { ...instructorPanelCardStyle } : { ...glassCardGlowStyle }}
      >
        {gridWrap}
      </div>
    );
  }

  return (
    <div className={effectiveContainerClass} style={effectiveContainerStyle}>
      <h3
        className={cn('font-semibold mb-1', isTopStrip && 'hidden')}
        style={isThemed ? { color: DASHBOARD_THEME.accent } : {}}
      >
        Quick Actions
      </h3>

      {iconOnly ? (
        <div className={cn(oneRow ? 'grid grid-cols-3 md:grid-cols-6 gap-2' : 'grid grid-cols-3 gap-2')}>
          <IconActionCard icon={FileCheck} label="Assign exam" onClick={onAssignExam} disabled={!onAssignExam} highlight={highlightAssign} chromeless={isTopStrip} inlineLabel={isTopStrip} />
          <IconActionCard icon={Users} label="Manage students" onClick={onManageStudents} disabled={!onManageStudents} chromeless={isTopStrip} inlineLabel={isTopStrip} />
          <IconActionCard icon={BarChart2} label="Analytics" onClick={onViewAnalytics} disabled={!onViewAnalytics} chromeless={isTopStrip} inlineLabel={isTopStrip} />
          <IconActionCard icon={Activity} label="Diagnostics" onClick={onRunDiagnostics} disabled={!onRunDiagnostics} chromeless={isTopStrip} inlineLabel={isTopStrip} />
          <IconActionCard icon={Settings2} label="Settings" onClick={onOpenSettings} disabled={!onOpenSettings} chromeless={isTopStrip} inlineLabel={isTopStrip} />
          <IconActionCard icon={UserCircle2} label="Profile" onClick={onOpenProfile} disabled={!onOpenProfile} chromeless={isTopStrip} inlineLabel={isTopStrip} />
        </div>
      ) : (
        <div className="space-y-2">
          <ActionCard
            icon={FileCheck}
            label="Assign exam"
            sub="Schedule exams for students"
            onClick={onAssignExam}
            disabled={!onAssignExam}
            highlight={highlightAssign}
            isGlass={isThemed}
          />
          <ActionCard
            icon={Users}
            label="Manage students"
            sub="View & assign advisees"
            onClick={onManageStudents}
            disabled={!onManageStudents}
            isGlass={isThemed}
          />
          <ActionCard
            icon={BarChart2}
            label="Performance & analytics"
            sub="View cases & stats"
            onClick={onViewAnalytics}
            disabled={!onViewAnalytics}
            isGlass={isThemed}
          />
          <ActionCard
            icon={Activity}
            label="Hardware diagnostics"
            sub="Run diagnostics"
            onClick={onRunDiagnostics}
            disabled={!onRunDiagnostics}
            isGlass={isThemed}
          />
          <ActionCard
            icon={Settings2}
            label="Open settings"
            sub="App configuration"
            onClick={onOpenSettings}
            disabled={!onOpenSettings}
            isGlass={isThemed}
          />
        </div>
      )}
    </div>
  );
}
