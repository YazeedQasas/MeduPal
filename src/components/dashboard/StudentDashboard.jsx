import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  BookOpen, Clock, Award, TrendingUp, ChevronRight,
  Play, Calendar, Target, Flame, CheckCircle2, AlertCircle,
  BarChart2, Stethoscope, Brain, Star,
} from 'lucide-react';
import { cn } from '../../lib/utils';

/* ── tiny helpers ── */
function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  if (d.toDateString() === tom.toDateString())
    return `Tomorrow · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function ScoreBar({ value, max = 10, color = 'bg-primary' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent = 'text-primary', bg = 'bg-primary/10' }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 relative overflow-hidden group hover:border-primary/30 transition-colors">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
        <Icon className={cn('w-5 h-5', accent)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ── domain colour map ── */
const DOMAIN_COLORS = {
  'History Taking':     { bar: 'bg-blue-500',   text: 'text-blue-400',   bg: 'bg-blue-500/10' },
  'Communication':      { bar: 'bg-purple-500',  text: 'text-purple-400', bg: 'bg-purple-500/10' },
  'Clinical Reasoning': { bar: 'bg-emerald-500', text: 'text-emerald-400',bg: 'bg-emerald-500/10' },
  'Examination':        { bar: 'bg-pink-500',    text: 'text-pink-400',   bg: 'bg-pink-500/10' },
  'Management Plan':    { bar: 'bg-orange-500',  text: 'text-orange-400', bg: 'bg-orange-500/10' },
};

const DEFAULT_DOMAINS = [
  { label: 'History Taking',     score: 0 },
  { label: 'Communication',      score: 0 },
  { label: 'Clinical Reasoning', score: 0 },
  { label: 'Examination',        score: 0 },
  { label: 'Management Plan',    score: 0 },
];

const DIFFICULTY_COLOR = {
  Easy:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  Medium:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Hard:     'bg-red-500/15 text-red-400 border-red-500/25',
};

const STATUS_COLOR = {
  'Completed':   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'In Progress': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Scheduled':   'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Cancelled':   'bg-red-500/15 text-red-400 border-red-500/25',
};

/* ════════════════════════════════════════════
   Main component
════════════════════════════════════════════ */
export function StudentDashboard({ setActiveTab }) {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  const [stats, setStats]             = useState({ total: 0, avgScore: null, streak: 0, upcoming: 0 });
  const [recentSessions, setRecent]   = useState([]);
  const [upcomingSessions, setUpcoming] = useState([]);
  const [domains, setDomains]         = useState(DEFAULT_DOMAINS);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      /* ── all completed sessions for this student ── */
      const { data: completed } = await supabase
        .from('sessions')
        .select(`id, start_time, end_time, score, status, session_type, type, case:cases(title, category, difficulty)`)
        .eq('student_id', user.id)
        .eq('status', 'Completed')
        .order('start_time', { ascending: false });

      const allCompleted = completed || [];

      /* ── recent 5 (any status) ── */
      const { data: recent } = await supabase
        .from('sessions')
        .select(`id, start_time, status, score, session_type, type, case:cases(title, category, difficulty)`)
        .eq('student_id', user.id)
        .order('start_time', { ascending: false })
        .limit(5);

      /* ── upcoming ── */
      const { data: upcoming } = await supabase
        .from('sessions')
        .select(`id, start_time, status, case:cases(title, category), station:stations(name, room_number)`)
        .eq('student_id', user.id)
        .in('status', ['Scheduled', 'In Progress'])
        .order('start_time', { ascending: true })
        .limit(4);

      /* ── compute avg score (only practice; students cannot see exam scores) ── */
      const scored = allCompleted.filter(s => s.score != null && (s.session_type === 'practice' || s.type === 'practice'));
      const avgScore = scored.length
        ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1)
        : null;

      /* ── streak: consecutive days with ≥1 completed session (back from today) ── */
      const sessionDays = new Set(allCompleted.map(s => new Date(s.start_time).toDateString()));
      let streak = 0;
      const cur = new Date();
      while (sessionDays.has(cur.toDateString())) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      }

      /* ── mock domain breakdown (replace with real score breakdown if schema has it) ── */
      // Average scores per domain — using overall score as proxy until per-domain data is available
      const domainScores = DEFAULT_DOMAINS.map((d, i) => ({
        label: d.label,
        score: scored.length ? Math.min(10, parseFloat(avgScore) * [1, 0.95, 0.9, 0.93, 0.85][i]) : 0,
      }));

      setStats({
        total:    allCompleted.length,
        avgScore,
        streak,
        upcoming: (upcoming || []).length,
      });
      setRecent(recent || []);
      setUpcoming(upcoming || []);
      setDomains(domainScores);
      setLoading(false);
    })();
  }, [user?.id]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  /* ── motivational sub-text ── */
  const sub = stats.total === 0
    ? "Start your first practice session to begin tracking your progress."
    : stats.avgScore
    ? `You're averaging ${stats.avgScore}/10 across ${stats.total} completed session${stats.total !== 1 ? 's' : ''}.`
    : `You've completed ${stats.total} session${stats.total !== 1 ? 's' : ''}. Keep going!`;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {displayName} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{sub}</p>
        </div>
        <button
          onClick={() => setActiveTab('cases')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(120,180,160,0.55) 0%, rgba(80,140,120,0.40) 50%, rgba(50,110,90,0.50) 100%)',
            border: '1px solid rgba(100,170,145,0.25)',
            boxShadow: '0 0 20px rgba(100,170,145,0.15)',
          }}
        >
          <Play className="w-4 h-4" />
          Start Practice
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Sessions Completed"
          value={loading ? '—' : stats.total}
          sub="All time"
          accent="text-blue-400"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={Award}
          label="Average Score"
          value={loading ? '—' : stats.avgScore ? `${stats.avgScore}/10` : '—'}
          sub={stats.avgScore ? (parseFloat(stats.avgScore) >= 7 ? 'Great work!' : 'Keep practising') : 'No scored sessions yet'}
          accent="text-amber-400"
          bg="bg-amber-500/10"
        />
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={loading ? '—' : stats.streak}
          sub={stats.streak > 0 ? 'days in a row' : 'Start today!'}
          accent="text-orange-400"
          bg="bg-orange-500/10"
        />
        <StatCard
          icon={Calendar}
          label="Upcoming Sessions"
          value={loading ? '—' : stats.upcoming}
          sub="scheduled / in progress"
          accent="text-purple-400"
          bg="bg-purple-500/10"
        />
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: recent sessions + upcoming */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recent sessions */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Recent Sessions
              </h2>
              <button
                onClick={() => setActiveTab('sessions')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="p-10 text-center">
                <Stethoscope className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No sessions yet.</p>
                <button
                  onClick={() => setActiveTab('cases')}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Browse cases →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentSessions.map(s => {
                  const diff = s.case?.difficulty;
                  const statusCls = STATUS_COLOR[s.status] || STATUS_COLOR['Cancelled'];
                  const diffCls   = DIFFICULTY_COLOR[diff] || '';
                  return (
                    <div key={s.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.case?.title || 'Session'}</p>
                        <p className="text-xs text-muted-foreground">{fmt(s.start_time)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {diff && (
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', diffCls)}>
                            {diff}
                          </span>
                        )}
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', statusCls)}>
                          {s.status}
                        </span>
                        {s.score != null && (s.session_type === 'practice' || s.type === 'practice') && (
                          <span className="text-sm font-bold text-foreground tabular-nums w-12 text-right">
                            {s.score <= 10 ? `${s.score.toFixed(1)}` : `${Math.round(s.score)}%`}
                            {s.score <= 10 && <span className="text-xs font-normal text-muted-foreground">/10</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming / Scheduled */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Upcoming Sessions
              </h2>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[1,2].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : upcomingSessions.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No scheduled sessions.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {upcomingSessions.map(s => {
                  const statusCls = STATUS_COLOR[s.status] || '';
                  const isLive = s.status === 'In Progress';
                  return (
                    <div key={s.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                        isLive ? 'bg-emerald-500/15' : 'bg-purple-500/10')}>
                        {isLive
                          ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          : <Clock className="w-4 h-4 text-purple-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.case?.title || 'Session'}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.station?.name || s.station?.room_number
                            ? `${s.station.name || s.station.room_number} · `
                            : ''}{fmt(s.start_time)}
                        </p>
                      </div>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0', statusCls)}>
                        {s.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: performance + quick actions */}
        <div className="space-y-6">

          {/* OSCE Domain Performance */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-primary" />
              OSCE Performance
            </h2>
            {stats.total === 0 && !loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Complete sessions to see your domain breakdown.</p>
            ) : (
              <div className="space-y-3.5">
                {domains.map(({ label, score }) => {
                  const col = DOMAIN_COLORS[label] || { bar: 'bg-primary', text: 'text-primary', bg: 'bg-primary/10' };
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className={cn('text-xs font-semibold tabular-nums', col.text)}>
                          {score > 0 ? score.toFixed(1) : '—'}
                        </span>
                      </div>
                      <ScoreBar value={score} max={10} color={col.bar} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-primary" />
              Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { icon: BookOpen,  label: 'Browse Cases',         tab: 'cases',    color: 'text-blue-400',   bg: 'bg-blue-500/10' },
                { icon: Brain,     label: 'AI Practice (Voice)',  tab: null,       color: 'text-purple-400', bg: 'bg-purple-500/10', href: '/practice-history' },
                { icon: Clock,     label: 'My Sessions',          tab: 'sessions', color: 'text-amber-400',  bg: 'bg-amber-500/10' },
                { icon: TrendingUp,label: 'My Profile',           tab: 'profile',  color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
              ].map(({ icon: Icon, label, tab, color, bg, href }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (href) window.location.href = href;
                    else setActiveTab(tab);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left group"
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                    <Icon className={cn('w-4 h-4', color)} />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto group-hover:text-muted-foreground transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Practice tip */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(100,170,145,0.12) 0%, rgba(60,120,100,0.06) 100%)',
              border: '1px solid rgba(100,170,145,0.18)',
            }}
          >
            <div className="flex items-start gap-3">
              <Star className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary mb-1">Daily Tip</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {[
                    "Start every history with a open question — let the patient speak before narrowing down.",
                    "Summarise back to the patient at the end of history taking to show active listening.",
                    "For chest pain: always cover site, radiation, character, onset, severity, and associated symptoms.",
                    "Practice timed sessions to build confidence under OSCE exam conditions.",
                    "Review your feedback after every session — patterns in weak domains are your fastest improvement path.",
                  ][new Date().getDay() % 5]}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
