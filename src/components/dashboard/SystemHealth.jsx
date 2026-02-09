import { useEffect, useState } from 'react';
import { BadgeCheck, Wifi, WifiOff, Activity, Mic, Volume2, Heart, Wind } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export function SystemHealth() {
    const [sensors, setSensors] = useState([]);

    useEffect(() => {
        const fetchSystemHealth = async () => {
            // Fetch controllers (representing Manikins) with their sensors
            const { data: controllers, error } = await supabase
                .from('controllers')
                .select(`
                    *,
                    station:stations(name, room_number),
                    sensors(*)
                `);

            if (controllers) {
                const formatted = controllers.map(c => {
                    // Start with default healthy state
                    let health = { lung: true, heart: true, pulse: true, mic: true, spkr: true };

                    // Check actual sensors if any report error
                    // This is a naive mapping based on seed data types
                    c.sensors.forEach(s => {
                        if (s.status !== 'Active') {
                            if (s.type === 'Lung') health.lung = false;
                            if (s.type === 'Heart') health.heart = false;
                            if (s.type === 'Pulse') health.pulse = false;
                            if (s.type === 'Mic') health.mic = false;
                        }
                    });

                    return {
                        id: c.id,
                        name: c.name || `Unit ${c.id}`,
                        status: c.status.toLowerCase(),
                        ping: c.status === 'Online' ? '24ms' : '-', // Mock ping for now
                        ...health
                    };
                });
                setSensors(formatted);
            }
        };
        fetchSystemHealth();
    }, []);

    const operationalRate = sensors.length > 0 ? Math.round((sensors.filter(s => s.status === 'online').length / sensors.length) * 100) : 100;

    return (
        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-border/50 flex justify-between items-center">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Activity className="text-primary" size={18} />
                    System Health
                </h3>
                <span className={cn(
                    "text-xs px-2 py-1 rounded-full border font-medium",
                    operationalRate > 90 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                )}>
                    {operationalRate}% Operational
                </span>
            </div>

            <div className="divide-y divide-border/50">
                {sensors.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full",
                                item.status === 'online' ? 'bg-emerald-500' :
                                    item.status === 'warning' ? 'bg-amber-500' : 'bg-destructive'
                            )} />
                            <div>
                                <p className="text-sm font-medium text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    {item.status === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
                                    {item.ping}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <StatusDot active={item.lung} icon={Wind} label="Lungs" />
                            <StatusDot active={item.heart} icon={Heart} label="Heart" />
                            <StatusDot active={item.pulse} icon={Activity} label="Pulse" />
                            <StatusDot active={item.mic} icon={Mic} label="Mic" />
                            <StatusDot active={item.spkr} icon={Volume2} label="Speaker" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatusDot({ active, icon: Icon, label }) {
    return (
        <div className={cn(
            "w-6 h-6 rounded flex items-center justify-center transition-colors",
            active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/50"
        )} title={label}>
            <Icon size={12} />
        </div>
    )
}
