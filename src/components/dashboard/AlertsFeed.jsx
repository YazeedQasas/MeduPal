import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { glassCardStyle, DASHBOARD_THEME, instructorPanelCardStyle } from './DashboardShell';

export function AlertsFeed({ variant }) {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const fetchAlerts = async () => {
            const { data, error } = await supabase
                .from('alerts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (data) {
                const formatted = data.map(a => ({
                    id: a.id,
                    type: a.type,
                    message: a.message,
                    time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setAlerts(formatted);
            }
        };
        fetchAlerts();

        // Optional: Real-time subscription
        // const channel = supabase.channel('live-alerts')
        //     .on('postgres_changes', { event: 'INSERT', table: 'alerts' }, payload => {
        //         setAlerts(prev => [payload.new, ...prev]);
        //     })
        //     .subscribe();
        // return () => { supabase.removeChannel(channel) }
    }, []);

    const isGlass = variant === 'glass';
    const isPanel = variant === 'panel';
    const useTheme = isGlass || isPanel;
    const surface = isGlass ? glassCardStyle : isPanel ? instructorPanelCardStyle : undefined;

    return (
        <div
            className={cn('rounded-2xl overflow-hidden flex flex-col h-full', !useTheme && 'bg-card border border-border shadow-[0_0_0_1px_rgba(0,0,0,0.4)]')}
            style={surface}
        >
            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: useTheme ? 'rgba(255,255,255,0.08)' : undefined }}>
                <h3 className="font-semibold flex items-center gap-2" style={useTheme ? { color: DASHBOARD_THEME.text } : {}}>
                    <AlertCircle className="text-amber-500" size={18} />
                    Live Alerts
                </h3>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {alerts.map((alert) => (
                    <div key={alert.id} className={cn('p-3 rounded-lg flex gap-3 items-start relative group', !useTheme && 'bg-muted/30')} style={useTheme ? { background: 'rgba(255,255,255,0.04)' } : undefined}>
                        <div className={cn("mt-0.5",
                            alert.type === 'critical' ? "text-destructive" :
                                alert.type === 'warning' ? "text-amber-500" : "text-emerald-500"
                        )}>
                            {alert.type === 'critical' && <AlertTriangle size={16} />}
                            {alert.type === 'warning' && <AlertCircle size={16} />}
                            {alert.type === 'success' && <CheckCircle2 size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug" style={useTheme ? { color: DASHBOARD_THEME.text } : {}}>{alert.message}</p>
                            <p className="text-xs mt-1" style={useTheme ? { color: DASHBOARD_THEME.muted } : {}}>{alert.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
