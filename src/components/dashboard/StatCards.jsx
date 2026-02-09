import { useEffect, useState } from 'react';
import { Users, Clock, Award, Activity, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export function StatCards() {
    const [stats, setStats] = useState({
        roomStatus: {
            status: "Idle",
            activeRooms: 0,
            currentSessions: []
        },
        todaySessions: {
            count: 0,
            passRate: "0%",
            avgScore: "0.0/10"
        },
        upcomingBlocks: {
            count: 0,
            blocks: []
        }
    });

    useEffect(() => {
        const fetchStats = async () => {
            // 1. Active Sessions (In Progress)
            const { data: activeSessionsData } = await supabase
                .from('sessions')
                .select(`
                    id,
                    station:stations(name),
                    case:cases(title),
                    start_time,
                    student:students(full_name)
                `)
                .eq('status', 'In Progress');

            const activeSessions = activeSessionsData || [];
            const activeRoomsCount = new Set(activeSessions.map(s => s.station?.name)).size;

            // 2. Total Sessions Today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: sessionCount } = await supabase
                .from('sessions')
                .select('*', { count: 'exact', head: true })
                .gte('start_time', today.toISOString());

            // 3. Average Score (Completed sessions)
            const { data: scoreData } = await supabase
                .from('sessions')
                .select('score')
                .eq('status', 'Completed')
                .not('score', 'is', null);

            // Calculate Avg Score
            const avgScoreVal = scoreData?.length
                ? (scoreData.reduce((a, b) => a + b.score, 0) / scoreData.length).toFixed(1)
                : '0.0';

            // Calculate Pass Rate (assuming >= 50 is pass)
            const passCount = scoreData?.filter(s => s.score >= 50).length || 0;
            const passRateVal = scoreData?.length
                ? `${Math.round((passCount / scoreData.length) * 100)}%`
                : 'N/A';

            // 4. Upcoming Blocks (Scheduled Sessions)
            const { data: upcomingSessions, error: upcomingError } = await supabase
                .from('sessions')
                .select(`
                    id,
                    start_time,
                    case:cases(title)
                `)
                .eq('status', 'Scheduled')
                .order('start_time', { ascending: true })
                .limit(3);

            console.log('Upcoming Sessions Query:', { upcomingSessions, upcomingError });

            // Format Upcoming Blocks
            const upcomingBlocksFormatted = upcomingSessions?.map(s => {
                const date = new Date(s.start_time);
                const now = new Date();
                const diffMs = date - now;
                const diffMins = Math.round(diffMs / 60000);
                const startsIn = diffMins > 60
                    ? `Starts in ~${Math.round(diffMins / 60)}h`
                    : `Starts in ${diffMins}m`;

                return {
                    name: s.case?.title || 'Scheduled Session',
                    startsIn: startsIn,
                    students: null, // Specific student count maybe not relevant here if it's 1-on-1
                    color: "bg-blue-500"
                };
            }) || [];


            setStats(prev => ({
                roomStatus: {
                    status: activeRoomsCount > 0 ? "Active" : "Idle",
                    activeRooms: activeRoomsCount,
                    currentSessions: activeSessions.slice(0, 2).map(s => ({
                        room: s.station?.name || 'Unknown',
                        case: s.case?.title || 'Untitled',
                        timeLeft: 'ACTIVE' // Dynamic time left requires a timer, simpler for now
                    }))
                },
                todaySessions: {
                    count: sessionCount || 0,
                    passRate: passRateVal,
                    avgScore: `${avgScoreVal}/100`
                },
                upcomingBlocks: {
                    count: upcomingSessions?.length || 0,
                    blocks: upcomingBlocksFormatted
                }
            }));
        };
        fetchStats();

        // Poll for updates every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Topic Session Status Card */}
            <div className="bg-card p-5 rounded-xl border border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity size={80} />
                </div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">Topic Session Status</p>
                        <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.roomStatus.status}</h3>
                    </div>
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <Clock size={20} />
                    </div>
                </div>
                <div className="space-y-2">
                    {stats.roomStatus.currentSessions.map((session, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{session.room}</span>
                            <span className="font-medium text-foreground">{session.case} ({session.timeLeft} left)</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 flex gap-2">
                    <span className="text-emerald-500 text-xs font-medium flex items-center bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {stats.roomStatus.activeRooms} Active Rooms
                    </span>
                </div>
            </div>

            {/* Today's Sessions Card */}
            <div className="bg-card p-5 rounded-xl border border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Award size={80} />
                </div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">Today's Sessions</p>
                        <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.todaySessions.count}</h3>
                    </div>
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                        <Users size={20} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Pass Rate</p>
                        <div className="flex items-center gap-1">
                            <span className="text-lg font-semibold text-foreground">{stats.todaySessions.passRate}</span>
                            <TrendingUp size={12} className="text-emerald-500" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                        <span className="text-lg font-semibold text-foreground">{stats.todaySessions.avgScore}</span>
                    </div>
                </div>
            </div>

            {/* Upcoming Blocks Card */}
            <div className="bg-card p-5 rounded-xl border border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Calendar size={80} />
                </div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">Upcoming Blocks</p>
                        <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.upcomingBlocks.count}</h3>
                    </div>
                    <div className="p-2 bg-violet-500/10 text-violet-500 rounded-lg">
                        <Calendar size={20} />
                    </div>
                </div>
                <div className="space-y-3">
                    {stats.upcomingBlocks.blocks.map((block, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className={cn("w-1 h-8 rounded-full", block.color)}></div>
                            <div>
                                <p className="text-sm font-medium text-foreground">{block.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {block.startsIn}{block.students ? ` • ${block.students} Students` : ''}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
