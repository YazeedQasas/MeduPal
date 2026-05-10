import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { TrendingUp, ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  Cardiology:       '#e84940',
  Respiratory:      '#4f8ef7',
  Pulmonology:      '#4f8ef7',
  Gastroenterology: '#f59e0b',
  Endocrinology:    '#34c97a',
  Neurology:        '#a78bfa',
  General:          '#6ee7b7',
  Pediatrics:       '#f472b6',
};

const SKILL_LABELS = {
  history_taking:       'History Taking',
  physical_examination: 'Physical Examination',
};

const TODAY_LABEL = new Date().toLocaleDateString([], {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});

const STATUS_STYLE = {
  'EXCELLENT':  { color: '#6ee7b7', background: 'rgba(110,231,183,0.1)',  border: '1px solid rgba(110,231,183,0.2)' },
  'GOOD':       { color: '#60a5fa', background: 'rgba(96,165,250,0.1)',   border: '1px solid rgba(96,165,250,0.2)'  },
  'NEEDS WORK': { color: '#f59e0b', background: 'rgba(245,158,11,0.1)',   border: '1px solid rgba(245,158,11,0.2)'  },
  'POOR':       { color: '#f87171', background: 'rgba(248,113,113,0.1)',  border: '1px solid rgba(248,113,113,0.2)' },
};

const DOT_COLOR = {
  'EXCELLENT':  '#6ee7b7',
  'GOOD':       '#60a5fa',
  'NEEDS WORK': '#f59e0b',
  'POOR':       '#f87171',
};

function scoreColor(s) {
  if (s >= 8.5) return '#6ee7b7';
  if (s >= 7.5) return '#60a5fa';
  return '#f59e0b';
}

function scoreStatus(score) {
  if (score >= 8.5) return 'EXCELLENT';
  if (score >= 7.5) return 'GOOD';
  if (score >= 6.0) return 'NEEDS WORK';
  return 'POOR';
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function formatRelativeDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function transformSessions(raw) {
  return (raw || []).map(s => {
    const score10 = s.score != null ? parseFloat((s.score / 10).toFixed(1)) : 0;
    const domains = {};
    (s.scores || []).forEach(ss => {
      const label = SKILL_LABELS[ss.skill_type] || ss.skill_type;
      domains[label] = ss.score;
    });
    return {
      id: s.id,
      date: formatRelativeDate(s.start_time),
      isoDate: s.start_time ? s.start_time.slice(0, 10) : null,
      case: s.case?.title || 'Unknown Case',
      category: s.case?.category || 'General',
      score: score10,
      status: scoreStatus(score10),
      domains,
      feedback: s.feedback_notes || '',
    };
  });
}

function computeDomainSummary(sessions) {
  const map = {};
  sessions.forEach(s => {
    Object.entries(s.domains).forEach(([domain, score]) => {
      if (!map[domain]) map[domain] = [];
      map[domain].push(score);
    });
  });
  return Object.entries(map).map(([domain, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const n = Math.max(1, Math.floor(scores.length / 2));
    const firstAvg = scores.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const lastAvg = scores.slice(-n).reduce((a, b) => a + b, 0) / n;
    const diff = parseFloat((lastAvg - firstAvg).toFixed(1));
    return {
      domain,
      avg: parseFloat(avg.toFixed(1)),
      sessions: scores.length,
      trend: diff >= 0 ? `+${diff}` : `${diff}`,
    };
  });
}

function computeCategorySummary(sessions) {
  const map = {};
  sessions.forEach(s => {
    if (!map[s.category]) map[s.category] = [];
    map[s.category].push(s.score);
  });
  return Object.entries(map)
    .map(([category, scores]) => ({
      category,
      sessions: scores.length,
      avg: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
      color: CATEGORY_COLORS[category] || '#6ee7b7',
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function computeStats(sessions) {
  if (!sessions.length) return {
    total: 0, avg: 0, first3avg: 0, last3avg: 0, improvementPts: '0.0', improvementPct: 0,
  };
  const asc = [...sessions].reverse();
  const avg = sessions.reduce((a, s) => a + s.score, 0) / sessions.length;
  const n = Math.min(3, asc.length);
  const first3avg = asc.slice(0, n).reduce((a, s) => a + s.score, 0) / n;
  const last3avg  = asc.slice(-n).reduce((a, s) => a + s.score, 0) / n;
  const diff = last3avg - first3avg;
  return {
    total: sessions.length,
    avg: parseFloat(avg.toFixed(2)),
    first3avg,
    last3avg,
    improvementPts: diff.toFixed(1),
    improvementPct: first3avg > 0 ? Math.round((diff / first3avg) * 100) : 0,
  };
}

function computeStreaks(sessions) {
  const dateSet = new Set(sessions.map(s => s.isoDate).filter(Boolean));
  if (!dateSet.size) return { current: 0, longest: 0, totalDays: 0 };

  const todayStr     = new Date().toISOString().slice(0, 10);
  const yesterStr    = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Current streak — walk back from today (or yesterday if no session today)
  let current = 0;
  if (dateSet.has(todayStr) || dateSet.has(yesterStr)) {
    const d = new Date(dateSet.has(todayStr) ? todayStr : yesterStr);
    while (dateSet.has(d.toISOString().slice(0, 10))) {
      current++;
      d.setDate(d.getDate() - 1);
    }
  }

  // Longest streak — scan sorted dates
  const sorted = [...dateSet].sort();
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round((new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  return { current, longest: Math.max(longest, current), totalDays: dateSet.size };
}

function buildHeatmap(sessions) {
  const map = {};
  sessions.forEach(s => {
    if (s.isoDate) map[s.isoDate] = (map[s.isoDate] || 0) + 1;
  });
  return map;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProgressCtx = createContext(null);
const useProgress = () => useContext(ProgressCtx);

function useProgressData(userId) {
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('sessions')
      .select('id, start_time, score, feedback_notes, case:cases(id, title, category), scores:session_scores(skill_type, score)')
      .eq('student_id', userId)
      .eq('status', 'Completed')
      .order('start_time', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setSessions(transformSessions(data));
        setLoading(false);
      });
  }, [userId]);

  return {
    sessions,
    domainSummary:    computeDomainSummary(sessions),
    categorySummary:  computeCategorySummary(sessions),
    stats:            computeStats(sessions),
    streaks:          computeStreaks(sessions),
    heatmap:          buildHeatmap(sessions),
    loading,
    error,
  };
}

// ─── Tab: All Sessions ────────────────────────────────────────────────────────

function AllSessionsTab() {
  const { sessions } = useProgress();
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '130px 1fr 120px 70px 110px 28px',
        padding: '0 12px 8px', gap: 8,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {['DATE', 'CASE', 'CATEGORY', 'SCORE', 'STATUS', ''].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em' }}>{h}</span>
        ))}
      </div>

      {sessions.length === 0 && (
        <div style={{ padding: '40px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
          No sessions yet — complete a practice case to see your history.
        </div>
      )}

      {sessions.map(s => {
        const isOpen = expanded === s.id;
        return (
          <div key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div
              onClick={() => setExpanded(isOpen ? null : s.id)}
              style={{
                display: 'grid', gridTemplateColumns: '130px 1fr 120px 70px 110px 28px',
                alignItems: 'center', padding: '11px 12px', gap: 8, cursor: 'pointer',
                background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: DOT_COLOR[s.status], flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{s.date}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.case}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{s.category}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(s.score) }}>{s.score.toFixed(1)}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', borderRadius: 6, padding: '3px 8px', ...STATUS_STYLE[s.status] }}>
                {s.status}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)' }}>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {isOpen && (
              <div style={{
                margin: '0 12px 12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                padding: '14px 16px',
              }}>
                {Object.keys(s.domains).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 12 }}>
                    {Object.entries(s.domains).map(([d, v]) => (
                      <div key={d} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{d}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(v) }}>{v.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {s.feedback && (
                  <div style={{ borderTop: Object.keys(s.domains).length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingTop: Object.keys(s.domains).length > 0 ? 10 : 0 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginRight: 6 }}>Feedback:</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>{s.feedback}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: By Domain ───────────────────────────────────────────────────────────

function ByDomainTab() {
  const { domainSummary } = useProgress();
  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
        padding: '0 12px 8px', gap: 8,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {['DOMAIN', 'AVG', 'SESSIONS', 'TREND'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em' }}>{h}</span>
        ))}
      </div>
      {domainSummary.length === 0 && (
        <div style={{ padding: '40px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
          Domain data will appear after your first session.
        </div>
      )}
      {domainSummary.map(d => {
        const pct = (d.avg / 10) * 100;
        const clr = scoreColor(d.avg);
        return (
          <div key={d.domain} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
            alignItems: 'center', padding: '13px 12px', gap: 8,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>{d.domain}</span>
              <div style={{ marginTop: 5, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', maxWidth: 180 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: clr, borderRadius: 99 }} />
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: clr }}>{d.avg.toFixed(1)}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{d.sessions}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7' }}>{d.trend}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: By Category ─────────────────────────────────────────────────────────

function ByCategoryTab() {
  const { categorySummary } = useProgress();
  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
        padding: '0 12px 8px', gap: 8,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {['SPECIALTY', 'SESSIONS', 'AVG SCORE', 'STATUS'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em' }}>{h}</span>
        ))}
      </div>
      {categorySummary.length === 0 && (
        <div style={{ padding: '40px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
          Category breakdown will appear after your first session.
        </div>
      )}
      {categorySummary.map(c => {
        const status = c.avg >= 8.5 ? 'EXCELLENT' : c.avg >= 7.5 ? 'GOOD' : 'NEEDS WORK';
        return (
          <div key={c.category} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
            alignItems: 'center', padding: '13px 12px', gap: 8,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>{c.category}</span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{c.sessions}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(c.avg) }}>{c.avg.toFixed(1)}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', borderRadius: 6, padding: '3px 8px', ...STATUS_STYLE[status] }}>
              {status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tabbed table ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'all',      label: 'All Sessions' },
  { id: 'domain',   label: 'By Domain' },
  { id: 'category', label: 'By Category' },
];

function SessionTable() {
  const [active, setActive] = useState('all');

  return (
    <div style={{
      borderRadius: 16,
      background: 'hsl(var(--card))',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 4px',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            style={{
              padding: '13px 16px',
              fontSize: 13, fontWeight: active === t.id ? 600 : 500,
              color: active === t.id ? '#f4f4f5' : 'rgba(255,255,255,0.35)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: active === t.id ? '2px solid #6ee7b7' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', padding: '0 12px', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>
          <LayoutGrid size={15} />
        </div>
      </div>

      <div style={{ padding: '8px 0' }}>
        {active === 'all'      && <AllSessionsTab />}
        {active === 'domain'   && <ByDomainTab />}
        {active === 'category' && <ByCategoryTab />}
      </div>
    </div>
  );
}

// ─── Decorative SVG circles ───────────────────────────────────────────────────

function DecorativeCircles() {
  return (
    <svg aria-hidden style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}
      viewBox="0 0 500 240" preserveAspectRatio="xMidYMid slice">
      <circle cx="420" cy="-30" r="160" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <circle cx="380" cy="20"  r="110" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
      <circle cx="440" cy="80"  r="60"  fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <circle cx="-40" cy="220" r="140" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
    </svg>
  );
}

// ─── Improvement (Insights) widget ───────────────────────────────────────────

function ImprovementWidget() {
  const { stats } = useProgress();
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 20,
      background: 'linear-gradient(135deg, #0f2d4a 0%, #0a1f38 40%, #071628 100%)',
      border: '1px solid rgba(99,179,237,0.15)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(99,179,237,0.12)',
      padding: '22px 26px 26px', flex: 1, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <DecorativeCircles />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, fontWeight:600, color:'rgba(147,210,255,0.85)', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:99, padding:'3px 12px', letterSpacing:'0.04em' }}>
          Insights
        </span>
        <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <TrendingUp size={15} color="rgba(147,210,255,0.9)" />
        </div>
      </div>
      {stats.total > 0 && (
        <div style={{ marginTop:20 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, background:'rgba(110,231,183,0.15)', color:'#6ee7b7', border:'1px solid rgba(110,231,183,0.2)', borderRadius:99, padding:'4px 12px' }}>
            +{stats.improvementPct}% improvement
          </span>
        </div>
      )}
      <p style={{ fontSize:22, fontWeight:700, lineHeight:1.3, color:'#f0f8ff', marginTop:14 }}>
        {stats.total === 0
          ? 'Complete your first practice session to start tracking your progress.'
          : <>Your Score Has Improved by{' '}<span style={{ color:'#6ee7b7' }}>{stats.improvementPts} points</span>{' '}Across Your Last {stats.total} Sessions</>
        }
      </p>
    </div>
  );
}

// ─── Widget card style ────────────────────────────────────────────────────────

const CARD = {
  borderRadius: 20,
  background: 'hsl(var(--card))',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  position: 'relative',
  overflow: 'hidden',
};

// ─── Score Trend widget ───────────────────────────────────────────────────────

function ScoreTrendWidget() {
  const { sessions, stats } = useProgress();
  const bars = [...sessions].reverse().slice(-6);
  const labels = bars.map((_, i) => {
    if (i === bars.length - 1) return 'Latest';
    if (i === 0) return 'Oldest';
    return `#${i + 1}`;
  });

  return (
    <div style={{ ...CARD, padding: '22px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(147,210,255,0.5)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>Score History</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#f0f8ff' }}>{stats.total}</div>
          <div style={{ fontSize: 11, color: 'rgba(147,210,255,0.45)', marginTop: 1 }}>total sessions</div>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(147,210,255,0.6)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,179,237,0.15)', borderRadius: 99, padding: '4px 12px', cursor: 'default' }}>
          All time ▾
        </span>
      </div>

      {bars.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
          No sessions yet
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90, position: 'relative', zIndex: 1, marginTop: 'auto' }}>
          {bars.map((s, i) => {
            const hPct = (s.score / 10) * 100;
            const isLatest = i === bars.length - 1;
            return (
              <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: '100%', height: 80, borderRadius: 10, overflow: 'hidden', background: 'rgba(99,179,237,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', height: `${hPct}%`, background: isLatest ? '#6ee7b7' : 'rgba(110,231,183,0.25)', borderRadius: 10, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: isLatest ? 'rgba(167,139,250,0.65)' : 'rgba(167,139,250,0.2)' }} />
                  </div>
                </div>
                <span style={{ fontSize: 9, color: 'rgba(147,210,255,0.3)' }}>{labels[i]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Gauge ────────────────────────────────────────────────────────────────────

function Gauge({ pct, size = 160 }) {
  const r = 58, sw = 14;
  const cx = size / 2;
  const cy = r + sw / 2 + 6;
  const svgH = cy + sw / 2 + 14;
  const toRad = (p) => (180 + p * 180) * (Math.PI / 180);
  const ex = cx + r * Math.cos(toRad(pct));
  const ey = cy + r * Math.sin(toRad(pct));
  const largeArc = 0; // arc spans at most 180°, always use small-arc flag

  return (
    <svg width={size} height={svgH} viewBox={`0 0 ${size} ${svgH}`}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
      </defs>
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="rgba(99,179,237,0.1)" strokeWidth={sw} strokeLinecap="round" />
      {pct > 0.01 && <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`} fill="none" stroke="url(#gaugeGrad)" strokeWidth={sw} strokeLinecap="round" />}
      <circle cx={ex} cy={ey} r={7} fill="#071628" stroke="#6ee7b7" strokeWidth="2.5" />
      <circle cx={ex} cy={ey} r={3.5} fill="#a78bfa" />
    </svg>
  );
}

// ─── Current Score widget ─────────────────────────────────────────────────────

function CurrentScoreWidget() {
  const { stats } = useProgress();
  const pct = stats.avg / 10;
  return (
    <div style={{ ...CARD, padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(147,210,255,0.5)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>Performance</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f4ff' }}>Current Score</div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#6ee7b7' }}>↗</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
        <Gauge pct={pct} size={160} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(147,210,255,0.45)' }}>Sessions</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7' }}>{stats.total}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f8ff', lineHeight: 1 }}>
            {stats.total > 0 ? stats.avg.toFixed(1) : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(147,210,255,0.45)', marginTop: 3 }}>out of 10</div>
        </div>
      </div>
    </div>
  );
}

// ─── Recent Sessions widget ───────────────────────────────────────────────────

function RecentSessionsWidget() {
  const { sessions, categorySummary } = useProgress();
  const recent = sessions.slice(0, 3);
  const avatarColors = categorySummary.slice(0, 3).map(c => c.color);

  return (
    <div style={{ ...CARD, padding: '20px 22px', flex: 1, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(147,210,255,0.5)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>Latest Practice</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f4ff' }}>Recent Sessions</div>
        </div>
        {avatarColors.length > 0 && (
          <div style={{ display: 'flex' }}>
            {avatarColors.map((color, i) => (
              <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: color, border: '2px solid #071628', marginLeft: i === 0 ? 0 : -8 }} />
            ))}
          </div>
        )}
      </div>
      <div>
        {recent.length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
            No recent sessions yet.
          </div>
        )}
        {recent.map(s => {
          const catColor = CATEGORY_COLORS[s.category] ?? '#6ee7b7';
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, marginBottom: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `${catColor}18`, border: `1px solid ${catColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: catColor }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.case}</div>
                <div style={{ fontSize: 11, color: 'rgba(147,210,255,0.45)', marginTop: 1 }}>{s.category}</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(s.score), flexShrink: 0 }}>{s.score.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Best Domain widget ───────────────────────────────────────────────────────

function BestDomainWidget() {
  const { domainSummary } = useProgress();
  const best = domainSummary.length ? domainSummary.reduce((a, b) => a.avg > b.avg ? a : b) : null;
  const R = 30, CIRC = 2 * Math.PI * R, dash = best ? (best.avg / 10) * CIRC : 0;
  return (
    <div style={{ ...CARD, padding: '20px 22px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Best Domain</span>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6ee7b7', boxShadow: '0 0 7px #6ee7b7' }} />
      </div>
      {!best ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', paddingBottom: 8 }}>No domain data yet.</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width={72} height={72} viewBox="0 0 72 72">
              <circle cx={36} cy={36} r={R} fill="none" stroke="rgba(99,179,237,0.1)" strokeWidth={7} />
              <circle cx={36} cy={36} r={R} fill="none" stroke="#6ee7b7" strokeWidth={7} strokeDasharray={`${dash} ${CIRC}`} strokeDashoffset={CIRC / 4} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#6ee7b7' }}>{best.avg.toFixed(1)}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f4ff', marginBottom: 4 }}>{best.domain}</div>
            <div style={{ fontSize: 11, color: 'rgba(147,210,255,0.45)', marginBottom: 8 }}>{best.sessions} sessions</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.15)', borderRadius: 99, padding: '2px 9px' }}>{best.trend} trend</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Growth widget ────────────────────────────────────────────────────────────

function MiniBarSparkline() {
  const { sessions } = useProgress();
  const scores = [...sessions].reverse().map(s => s.score);
  if (!scores.length) return null;
  const min = Math.min(...scores) - 0.5;
  const max = Math.max(...scores) + 0.5;
  const W = 110, H = 36, barW = 13;
  const gap = scores.length > 1 ? (W - scores.length * barW) / (scores.length - 1) : 0;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {scores.map((s, i) => {
        const barH = Math.max(4, ((s - min) / (max - min || 1)) * H);
        return <rect key={i} x={i * (barW + gap)} y={H - barH} width={barW} height={barH} rx={4} fill={i === scores.length - 1 ? '#c4b5fd' : 'rgba(167,139,250,0.25)'} />;
      })}
    </svg>
  );
}

function GrowthWidget() {
  const { sessions, stats } = useProgress();
  return (
    <div style={{ ...CARD, padding: '20px 22px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Improvement</span>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 7px #a78bfa' }} />
      </div>
      {sessions.length === 0 ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No improvement data yet.</div>
      ) : (
        <>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#a78bfa', lineHeight: 1, marginBottom: 12 }}>+{stats.improvementPct}%</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(147,210,255,0.45)' }}>{stats.first3avg.toFixed(1)}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(99,179,237,0.1)' }} />
            <span style={{ fontSize: 11, color: '#a78bfa' }}>→</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(99,179,237,0.1)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f8ff' }}>{stats.last3avg.toFixed(1)}</span>
          </div>
          <MiniBarSparkline />
        </>
      )}
    </div>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function ScrambleButton({ onClick, label }) {
  const [text, setText] = useState(label);
  const [busy, setBusy] = useState(false);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const scramble = () => {
    if (busy) return;
    setBusy(true);
    let iter = 0;
    const id = setInterval(() => {
      setText(label.split('').map((_, i) => i < iter ? label[i] : chars[Math.floor(Math.random() * chars.length)]).join(''));
      if (iter >= label.length) { clearInterval(id); setBusy(false); }
      iter += 1 / 3;
    }, 30);
  };

  return (
    <button
      onMouseEnter={scramble}
      onClick={onClick}
      style={{
        padding: '13px 30px', background: '#6ee7b7', color: '#071628',
        borderRadius: 99, border: 'none', fontWeight: 700, fontSize: 14,
        cursor: 'pointer', letterSpacing: '0.04em', fontFamily: 'monospace',
        boxShadow: '0 4px 20px rgba(110,231,183,0.35)',
        transition: 'transform 0.1s', flexShrink: 0,
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {text}
    </button>
  );
}

function CTAWidget({ onStartPractice }) {
  const { stats } = useProgress();
  const statItems = [
    { label: 'Sessions',  value: stats.total },
    { label: 'Avg Score', value: stats.total > 0 ? `${stats.avg.toFixed(1)}/10` : '—' },
    { label: 'Growth',    value: stats.total > 0 ? `+${stats.improvementPct}%` : '—' },
  ];

  return (
    <div style={{ ...CARD, padding: '20px 22px', flex: 1, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <DecorativeCircles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(147,210,255,0.5)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>Keep going</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#f0f8ff', lineHeight: 1.3, marginBottom: 10 }}>
          Ready to push your score higher?
        </div>
        <div style={{ fontSize: 12, color: 'rgba(147,210,255,0.5)', lineHeight: 1.6 }}>
          Jump into a new case and keep building your clinical skills.
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 18 }}>
          {statItems.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f0f8ff' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(147,210,255,0.4)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <ScrambleButton label="Start Practicing" onClick={onStartPractice} />
      </div>
    </div>
  );
}

// ─── Heatmap calendar ─────────────────────────────────────────────────────────

const WEEKS = 16;
const CELL  = 11;
const GAP   = 2;
const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S'];

function cellColor(count, isFuture) {
  if (isFuture || count === 0) return 'rgba(255,255,255,0.05)';
  if (count === 1) return 'rgba(110,231,183,0.28)';
  if (count === 2) return 'rgba(110,231,183,0.55)';
  return '#6ee7b7';
}

const DAY_LABEL_W = 18;

function HeatmapCalendar() {
  const { heatmap } = useProgress();
  const wrapRef = useRef(null);
  const [visibleWeeks, setVisibleWeeks] = useState(WEEKS);

  // Measure container width and fit as many weeks as possible
  useEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => {
      const avail = wrapRef.current.getBoundingClientRect().width - DAY_LABEL_W - 6;
      const w = Math.max(4, Math.floor(avail / (CELL + GAP)));
      setVisibleWeeks(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - visibleWeeks * 7);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);

  const weeks = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10);
      week.push({ iso, count: heatmap[iso] || 0, isFuture: cursor > today, month: cursor.getMonth(), day: cursor.getDate() });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabel = (week) => { const f = week.find(d => d.day === 1); return f ? monthNames[f.month] : ''; };

  return (
    <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden' }}>
      {/* Month labels */}
      <div style={{ display: 'flex', gap: GAP, marginBottom: 4, paddingLeft: DAY_LABEL_W + 6 }}>
        {weeks.map((week, i) => (
          <div key={i} style={{ width: CELL, flexShrink: 0, fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            {monthLabel(week)}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: GAP }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, width: DAY_LABEL_W, flexShrink: 0, marginRight: 2 }}>
          {DAY_LABELS.map((lbl, i) => (
            <div key={i} style={{ height: CELL, fontSize: 8, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              {lbl}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP, flex: 1 }}>
            {week.map(({ iso, count, isFuture }) => (
              <div
                key={iso}
                title={!isFuture ? `${iso} · ${count} session${count !== 1 ? 's' : ''}` : ''}
                style={{
                  width: '100%', height: CELL, borderRadius: 2,
                  background: cellColor(count, isFuture),
                  transition: 'background 0.1s',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, paddingLeft: DAY_LABEL_W + 6 }}>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>Less</span>
        {[0, 1, 2, 3].map(l => (
          <div key={l} style={{ width: 8, height: 8, borderRadius: 2, background: cellColor(l, false) }} />
        ))}
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>More</span>
      </div>
    </div>
  );
}

function ActivitySection() {
  const { streaks } = useProgress();

  const stats = [
    { label: 'Current Streak', value: streaks.current, unit: streaks.current === 1 ? 'day' : 'days', accent: '#f97316' },
    { label: 'Best Streak',    value: streaks.longest,  unit: streaks.longest  === 1 ? 'day' : 'days', accent: '#f0f8ff' },
    { label: 'Active Days',    value: streaks.totalDays, unit: 'total',                                 accent: '#a78bfa' },
  ];

  return (
    <div style={{ ...CARD, padding: '20px 22px', flex: 1, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 220 }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>Practice Activity</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f4ff' }}>Consistency Heatmap</div>
      </div>

      {/* Streak stats row */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        {stats.map(s => (
          <div key={s.label}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{s.unit}</span>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap fills remaining space */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
        <HeatmapCalendar />
      </div>
    </div>
  );
}

// ─── Bento grid ───────────────────────────────────────────────────────────────

function PageGrid({ onStartPractice }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/*
       * Main bento — mirrors the Tailwind 3-col × 2-row pattern:
       *   [Left tall row-span-2] [Top middle   ] [Right tall row-span-2]
       *   [Left tall row-span-2] [Bottom middle] [Right tall row-span-2]
       */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: 'auto auto',
        gap: 16,
      }}>
        {/* Left — spans both rows */}
        <div style={{ gridColumn: '1', gridRow: '1 / 3', display: 'flex' }}>
          <ImprovementWidget />
        </div>

        {/* Middle top */}
        <div style={{ gridColumn: '2', gridRow: '1' }}>
          <CurrentScoreWidget />
        </div>

        {/* Middle bottom — start practicing CTA */}
        <div style={{ gridColumn: '2', gridRow: '2', display: 'flex' }}>
          <CTAWidget onStartPractice={onStartPractice} />
        </div>

        {/* Right — spans both rows */}
        <div style={{ gridColumn: '3', gridRow: '1 / 3', display: 'flex' }}>
          <RecentSessionsWidget />
        </div>
      </div>

      {/* Secondary row — 4 equal cols */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
        <ScoreTrendWidget />
        <BestDomainWidget />
        <GrowthWidget />
        <ActivitySection />
      </div>

    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function StudentProgress({ onStartPractice, user }) {
  const data = useProgressData(user?.id);

  return (
    <ProgressCtx.Provider value={data}>
      <div className="w-full space-y-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">My Progress</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {TODAY_LABEL} &middot; Performance overview
          </p>
        </div>

        {data.loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            Loading your progress…
          </div>
        ) : data.error ? (
          <div className="flex items-center justify-center py-20 text-red-400 text-sm">
            Could not load progress data: {data.error}
          </div>
        ) : (
          <>
            <PageGrid onStartPractice={onStartPractice} />
            <SessionTable />
          </>
        )}
      </div>
    </ProgressCtx.Provider>
  );
}
