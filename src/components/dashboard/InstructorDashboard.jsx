import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ActiveStations } from './ActiveStations';
import { QuickActions } from './QuickActions';
import { Calendar, MapPin, User, ChevronRight, Clock, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

export function InstructorDashboard({ setActiveTab }) {
  const { user, profile } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Instructor';

  useEffect(() => {
    if (!user?.id) return;

    const fetchUpcoming = async () => {
      const { data } = await supabase
        .from('sessions')
        .select(`
          id,
          start_time,
          status,
          case:cases(title),
          student:profiles!student_id(full_name),
          station:stations(name, room_number)
        `)
        .eq('examiner_id', user.id)
        .in('status', ['Scheduled', 'In Progress'])
        .order('start_time', { ascending: true })
        .limit(5);

      if (data) {
        setUpcomingSessions(
          data.map((s) => ({
            id: s.id,
            title: s.case?.title || 'Session',
            student: s.student?.full_name || '—',
            station: s.station?.name || s.station?.room_number || '—',
            startTime: s.start_time,
            status: s.status,
          }))
        );
      }
    };

    fetchUpcoming();
  }, [user?.id]);

  const formatTime = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  const activeSessions = upcomingSessions.filter((s) => s.status === 'In Progress');

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground text-sm">
          Here’s an overview of your stations, sessions, and quick actions.
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Active sessions
          </h3>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className="text-sm text-primary hover:underline"
          >
            View all sessions
          </button>
        </div>

        {activeSessions.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border shadow-[0_0_0_1px_rgba(0,0,0,0.4)] p-4 text-sm text-muted-foreground text-center">
            No active sessions right now. Start one from the Sessions or Students tab.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="bg-card rounded-2xl border border-border shadow-[0_0_0_1px_rgba(0,0,0,0.4)] p-4 relative group hover:border-primary/30 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      In progress
                    </span>
                  </div>
                </div>

                <h4 className="font-medium text-foreground truncate mb-1" title={s.title}>
                  {s.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate mb-3">
                  {s.student !== '—' ? s.student : 'Student'} • {s.station}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>{formatTime(s.startTime)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sessions')}
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ActiveStations onViewAll={() => setActiveTab('stations')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border shadow-[0_0_0_1px_rgba(0,0,0,0.4)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming session blocks
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all
                <ChevronRight size={14} />
              </button>
            </div>

            {upcomingSessions.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">
                No upcoming sessions. Create one from the Sessions page.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingSessions.map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      'flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border',
                      s.status === 'In Progress' && 'bg-primary/5 border-primary/20'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock size={16} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTime(s.startTime)}
                      </span>
                    </div>
                    <span className="font-medium text-foreground truncate">{s.title}</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                      <User size={14} />
                      {s.student}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin size={14} />
                      {s.station}
                    </span>
                    {s.status === 'In Progress' && (
                      <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        In progress
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <QuickActions
            onStartSession={() => setActiveTab('sessions')}
            onManageStudents={() => setActiveTab('students')}
            onViewAnalytics={() => setActiveTab('cases')}
            onRunDiagnostics={() => setActiveTab('hardware')}
            onOpenSettings={() => setActiveTab('settings')}
          />
        </div>
      </div>
    </div>
  );
}
