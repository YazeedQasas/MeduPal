import { useEffect, useState } from 'react';
import { Play, Pause, MoreVertical, Clock, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';


export function ActiveStations({ onViewAll }) {
    const [stations, setStations] = useState([]);

    useEffect(() => {
        const fetchStations = async () => {
            // 1. Fetch all stations
            const { data: stationsData } = await supabase
                .from('stations')
                .select('*')
                .order('room_number', { ascending: true });

            // 2. Fetch all active sessions
            const { data: activeSessions } = await supabase
                .from('sessions')
                .select(`
                    id,
                    station_id,
                    start_time,
                    case:cases(title),
                    student:students(full_name)
                `)
                .eq('status', 'In Progress');

            if (stationsData) {
                // Map stations to include active session data
                const formatted = stationsData.map(station => {
                    const activeSession = activeSessions?.find(s => s.station_id === station.id);

                    if (activeSession) {
                        // Calculate duration
                        const start = new Date(activeSession.start_time);
                        const now = new Date();
                        const diffMs = now - start;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffSecs = Math.floor((diffMs % 60000) / 1000);
                        const timeStr = `${diffMins.toString().padStart(2, '0')}:${diffSecs.toString().padStart(2, '0')}`;

                        return {
                            id: station.id,
                            room: station.room_number,
                            case: activeSession.case?.title || 'Untitled Case',
                            mode: 'Exam', // Could specific mode later
                            time: timeStr,
                            status: 'active',
                            students: activeSession.student ? [activeSession.student.full_name] : []
                        };
                    } else {
                        return {
                            id: station.id,
                            room: station.room_number,
                            case: 'Idle',
                            mode: 'Standby',
                            time: '—',
                            status: 'idle',
                            students: []
                        };
                    }
                });
                setStations(formatted);
            }
        };

        fetchStations();
        // Poll for timer updates
        const interval = setInterval(fetchStations, 10000); // Update every 10s for timer
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Available Stations</h3>
                <button
                    onClick={onViewAll}
                    className="text-sm text-primary hover:underline"
                >
                    View All Map
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stations.map((station) => (
                    <div key={station.id} className="bg-card rounded-xl border border-border/50 shadow-sm p-4 relative group hover:border-primary/50 transition-colors">

                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", station.status === 'active' ? 'bg-emerald-500 animate-pulse' : station.status === 'critical' ? 'bg-amber-500' : 'bg-muted')} />
                                <span className="font-semibold text-foreground">Room {station.room}</span>
                            </div>
                            <button className="text-muted-foreground hover:text-foreground">
                                <MoreVertical size={16} />
                            </button>
                        </div>

                        <h4 className="font-medium text-foreground truncate mb-1" title={station.case}>{station.case}</h4>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold bg-muted/50 px-1.5 py-0.5 rounded">{station.mode}</span>

                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock size={14} />
                                <span className={cn("text-sm font-mono font-medium", station.time === '00:00' ? 'text-muted-foreground' : 'text-foreground')}>{station.time}</span>
                            </div>

                            <div className="flex -space-x-2">
                                {station.students && station.students.length > 0 ? (
                                    station.students.map((s, i) => (
                                        <div key={i} className="w-6 h-6 rounded-full bg-primary/20 border border-card flex items-center justify-center text-[10px] text-primary font-bold" title={s}>
                                            {s.charAt(0)}
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                )}
                            </div>
                        </div>

                        {/* Hover Action Overlay */}
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
                            <button className="p-2 bg-emerald-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg">
                                <Play size={20} fill="currentColor" />
                            </button>
                            <button className="p-2 bg-muted text-foreground rounded-full hover:scale-110 transition-transform shadow-lg">
                                <Pause size={20} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
