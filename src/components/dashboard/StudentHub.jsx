import React, { useState, useEffect } from 'react';
import {
  Stethoscope, ChevronRight, FileCheck, Target, History, Activity,
  BookOpen, Clock, Calendar, Flame, Award, BarChart2, Brain, Star, TrendingUp,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AssignedExamStart from './AssignedExamStart';
import { cn } from '../../lib/utils';

/* ── helpers from StudentDashboard ── */
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
    <div className="rounded-xl border border-neutral-800 bg-[#0f1111] p-5 flex items-start gap-4 relative overflow-hidden group hover:border-primary/30 transition-colors">
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

const MOCK_SKILLS = [
  { name: 'History Taking', value: 85 },
  { name: 'Physical Exam', value: 72 },
  { name: 'Communication', value: 90 },
  { name: 'Clinical Reasoning', value: 68 },
];

const MOCK_WEEKLY = {
  sessionsCompleted: 5,
  averageScore: 84,
  trainingTime: '2h 30m',
  bestCase: 'Respiratory Exam',
};

const MOCK_TODAY_GOAL = { completed: 0, target: 1 };

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

const CARD_CLASS = 'rounded-xl border border-neutral-800 bg-[#0f1111] p-6 transition-all duration-200';

export function StudentHub({ setActiveTab }) {
  const { user, profile, role, has_hardware, can_exam, full_name } = useAuth();
  const displayName = full_name || profile?.full_name || user?.email?.split('@')[0] || 'Student';

  const [showExam, setShowExam] = useState(false);
  const [stats, setStats] = useState({ total: 0, avgScore: null, streak: 0, upcoming: 0 });
  const [recentSessions, setRecent] = useState([]);
  const [upcomingSessions, setUpcoming] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [domains, setDomains] = useState(DEFAULT_DOMAINS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: completed } = await supabase
        .from('sessions')
        .select(`id, start_time, end_time, score, status, case:cases(title, category, difficulty)`)
        .eq('student_id', user.id)
        .eq('status', 'Completed')
        .order('start_time', { ascending: false });
      const allCompleted = completed || [];

      const { data: recent } = await supabase
        .from('sessions')
        .select(`id, start_time, status, score, case:cases(title, category, difficulty)`)
        .eq('student_id', user.id)
        .order('start_time', { ascending: false })
        .limit(5);

      const { data: upcoming } = await supabase
        .from('sessions')
        .select(`id, start_time, status, case:cases(title, category), station:stations(name, room_number), examiner:profiles!examiner_id(full_name)`)
        .eq('student_id', user.id)
        .in('status', ['Scheduled', 'In Progress'])
        .order('start_time', { ascending: true })
        .limit(4);

      // Fetch exam sessions (instructor-assigned via Assign Exam page, stored in sessions with type='exam')
      let examsFromSessions = [];
      const { data: examSessions, error: examErr } = await supabase
        .from('sessions')
        .select(`id, start_time, status, session_type, case:cases(title), examiner:profiles!examiner_id(full_name)`)
        .eq('student_id', user.id)
        .eq('session_type', 'exam')
        .eq('status', 'Scheduled')
        .order('start_time', { ascending: true });

      if (!examErr && examSessions?.length) {
        examsFromSessions = examSessions.map((s) => ({
          id: s.id,
          exam_date: s.start_time,
          case_name: s.case?.title || 'Exam',
          status: 'scheduled',
          instructor: s.examiner,
        }));
      }

      // Legacy: also check exams table if used elsewhere
      const { data: examsData } = await supabase
        .from('exams')
        .select(`id, exam_date, case_name, status, station:stations(name, room_number), instructor:profiles!instructor_id(full_name)`)
        .eq('student_id', user.id)
        .eq('status', 'scheduled')
        .order('exam_date', { ascending: true });

      const allExams = [...examsFromSessions, ...(examsData || [])].sort(
        (a, b) => new Date(a.exam_date || 0) - new Date(b.exam_date || 0)
      );

      const scored = allCompleted.filter(s => s.score != null);
      const avgScore = scored.length
        ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1)
        : null;

      const sessionDays = new Set(allCompleted.map(s => new Date(s.start_time).toDateString()));
      let streak = 0;
      const cur = new Date();
      while (sessionDays.has(cur.toDateString())) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      }

      const domainScores = DEFAULT_DOMAINS.map((d, i) => ({
        label: d.label,
        score: scored.length ? Math.min(10, parseFloat(avgScore) * [1, 0.95, 0.9, 0.93, 0.85][i]) : 0,
      }));

      setStats({
        total: allCompleted.length,
        avgScore,
        streak,
        upcoming: allExams.length + (upcoming || []).length,
      });
      setRecent(recent || []);
      setUpcoming(upcoming || []);
      setUpcomingExams(allExams);
      setDomains(domainScores);
      setLoading(false);
    })();
  }, [user?.id]);

  if (showExam) {
    return (
      <AssignedExamStart
        onBack={() => setShowExam(false)}
        onStart={() => {
          setShowExam(false);
          setActiveTab?.('student-dashboard');
        }}
      />
    );
  }

  const showAnyAction = has_hardware || can_exam;

  // Conditional dashboard logic based on role, has_hardware, can_exam
  const isStudent = role === 'student';
  const showFullDashboard = isStudent && has_hardware;
  const showUpcomingExamCard = isStudent && can_exam;
  const showExamOnlyDashboard = isStudent && !has_hardware && can_exam;
  const showNoCapabilities = isStudent && !has_hardware && !can_exam;

  // Prefer exams table (instructor-assigned) over sessions
  const examFromExams = upcomingExams?.[0];
  const examFromSessions = upcomingSessions?.[0];
  const nextExam = examFromExams
    ? {
        id: examFromExams.id,
        case: { title: examFromExams.case_name },
        start_time: examFromExams.exam_date,
        status: examFromExams.status === 'scheduled' ? 'Scheduled' : examFromExams.status,
        station: examFromExams.station,
        examiner: examFromExams.instructor,
      }
    : examFromSessions || null;
  const examinerName = nextExam?.examiner?.full_name || 'Instructor';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const sub = stats.total === 0
    ? "Start your first practice session to begin tracking your progress."
    : stats.avgScore
    ? `You're averaging ${stats.avgScore}/10 across ${stats.total} completed session${stats.total !== 1 ? 's' : ''}.`
    : `You've completed ${stats.total} session${stats.total !== 1 ? 's' : ''}. Keep going!`;

  const quickActions = [
    { icon: BookOpen,  label: 'Browse Cases',         tab: 'student-practice', color: 'text-blue-400',   bg: 'bg-blue-500/10' },
    { icon: Brain,     label: 'AI Practice (Voice)',  href: '/practice-history', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { icon: Clock,     label: 'My Sessions',          tab: 'student-history', color: 'text-amber-400',  bg: 'bg-amber-500/10' },
    { icon: TrendingUp, label: 'My Profile',          tab: 'student-settings', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  // ── Upcoming Exam card (reusable) ──
  const UpcomingExamCard = () => (
    <div className={cn(CARD_CLASS, 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4')}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <ClipboardCheck size={24} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Upcoming Exam</h2>
          {nextExam ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmt(nextExam.start_time)} · {examinerName}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">No scheduled exam at this time.</p>
          )}
        </div>
      </div>
      {nextExam && (
        <button
          type="button"
          onClick={() => {
            setActiveTab?.('student-exam');
            window.history.pushState(null, '', '/exam');
          }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          Start Exam
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );

  // ── No capabilities card ──
  const NoCapabilitiesCard = () => (
    <div className={CARD_CLASS}>
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <ClipboardCheck size={28} />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">No capabilities enabled yet.</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Ask your instructor to enable practice or exam access in your profile settings.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab?.('student-settings')}
          className="px-6 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Contact Instructor
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-0 pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}, {displayName} 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {showNoCapabilities
              ? "Ask your instructor to enable practice or exam access."
              : showExamOnlyDashboard
              ? "Your next exam is scheduled below."
              : sub}
          </p>
        </div>
      </div>

      {/* 4️⃣ No capabilities: only this card */}
      {showNoCapabilities && (
        <NoCapabilitiesCard />
      )}

      {/* 3️⃣ Exam only (no hardware): only Upcoming Exam card */}
      {showExamOnlyDashboard && (
        <UpcomingExamCard />
      )}

      {/* 1️⃣ & 2️⃣ Full dashboard (has_hardware) */}
      {showFullDashboard && (
        <>
          {/* 2️⃣ Upcoming Exam card at top when can_exam */}
          {showUpcomingExamCard && <UpcomingExamCard />}

          {/* Stat Cards */}
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

      {/* Settings fallback when no actions */}
      {!showAnyAction && (
        <div className={CARD_CLASS}>
          <p className="text-muted-foreground text-sm">Enable practice or exam access in Settings to get started.</p>
          <button
            type="button"
            onClick={() => setActiveTab?.('student-settings')}
            className="mt-3 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Open Settings
          </button>
        </div>
      )}

      {/* Today's Goal */}
      <div className={cn(CARD_CLASS, 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4')}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Target size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Today&apos;s Goal</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete 1 practice session today to maintain your clinical training streak.
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground shrink-0">
          Progress: {MOCK_TODAY_GOAL.completed} / {MOCK_TODAY_GOAL.target} sessions
        </div>
      </div>

      {/* Start Practice */}
      <div className={cn(CARD_CLASS, 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4')}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <Stethoscope size={24} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Start Practice</h2>
            <p className="text-sm text-muted-foreground mt-0.5">AI case, history taking &amp; physical exam</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {can_exam && (
            <button
              type="button"
              onClick={() => setShowExam(true)}
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5"
            >
              <FileCheck size={16} />
              Start assigned exam
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setActiveTab?.('student-practice');
              window.history.pushState(null, '', '/practice');
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start Practice
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Main grid: Clinical Skills | Weekly Activity | Recent | Upcoming | OSCE | Quick Actions | Hardware */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinical Skills */}
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Clinical Skills</h2>
          <div className="space-y-4">
            {MOCK_SKILLS.map((skill) => (
              <div key={skill.name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-foreground">{skill.name}</span>
                  <span className="text-muted-foreground font-medium">{skill.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${skill.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Activity */}
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={16} />
            Weekly Activity
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-muted-foreground mb-1">Sessions completed</p>
              <p className="text-2xl font-bold text-foreground">{MOCK_WEEKLY.sessionsCompleted}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-muted-foreground mb-1">Average score</p>
              <p className="text-2xl font-bold text-foreground">{MOCK_WEEKLY.averageScore}%</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-muted-foreground mb-1">Training time</p>
              <p className="text-xl font-bold text-foreground">{MOCK_WEEKLY.trainingTime}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-muted-foreground mb-1">Best case</p>
              <p className="text-sm font-semibold text-foreground truncate" title={MOCK_WEEKLY.bestCase}>
                {MOCK_WEEKLY.bestCase}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions | Upcoming Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions (real data) */}
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <History size={16} />
              Recent Sessions
            </h2>
            <button
              onClick={() => setActiveTab?.('student-history')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="py-6 text-center">
              <Stethoscope className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
              <button
                onClick={() => { setActiveTab?.('student-practice'); window.history.pushState(null, '', '/practice'); }}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Start practice →
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentSessions.map((s) => {
                const diff = s.case?.difficulty;
                const statusCls = STATUS_COLOR[s.status] || STATUS_COLOR['Cancelled'];
                const diffCls = DIFFICULTY_COLOR[diff] || '';
                return (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground text-sm truncate">{s.case?.title || 'Session'}</p>
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
                      {s.score != null && (
                        <span className="text-sm font-semibold text-primary">{s.score.toFixed(1)}/10</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-purple-400" />
            Upcoming Sessions
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="py-6 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No scheduled sessions.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingSessions.map((s) => {
                const statusCls = STATUS_COLOR[s.status] || '';
                return (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground text-sm truncate">{s.case?.title || 'Session'}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.station?.name || s.station?.room_number ? `${s.station.name || s.station.room_number} · ` : ''}
                        {fmt(s.start_time)}
                      </p>
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0', statusCls)}>
                      {s.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* OSCE Performance | Quick Actions | Hardware Status | Daily Tip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OSCE Performance */}
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-primary" />
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
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Target size={16} className="text-primary" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickActions.map(({ icon: Icon, label, tab, href, color, bg }) => (
              <button
                key={label}
                onClick={() => {
                  if (href) window.location.href = href;
                  else setActiveTab?.(tab);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                  <Icon className={cn('w-4 h-4', color)} />
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto" />
              </button>
            ))}
          </div>
        </div>

        {/* Hardware Status + Daily Tip */}
        <div className="space-y-6">
          <div className={CARD_CLASS}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Activity size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Hardware Status</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manikin and sensors connectivity.</p>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                  has_hardware ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                )}
              >
                {has_hardware ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Manikin</span>
                <span className={has_hardware ? 'text-emerald-400 font-medium' : 'text-neutral-400'}>
                  {has_hardware ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sensors</span>
                <span className={has_hardware ? 'text-emerald-400 font-medium' : 'text-neutral-400'}>
                  {has_hardware ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Tip */}
          <div
            className="rounded-xl p-5"
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
                    "Start every history with an open question — let the patient speak before narrowing down.",
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
        </>
      )}
    </div>
  );
}
