import React, { useState, useEffect } from 'react';
import {
    Cpu,
    Volume2,
    Activity,
    Zap,
    Signal,
    AlertTriangle,
    CheckCircle2,
    Settings2,
    RefreshCcw,
    Thermometer,
    Gauge,
    Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export function Hardware() {
    const [selectedDevice, setSelectedDevice] = useState('ESP32-01');
    const [controllers, setControllers] = useState([]);
    const [sensors, setSensors] = useState([]);
    const [speakers, setSpeakers] = useState([]);

    useEffect(() => {
        const fetchHardware = async () => {
            const { data: controllersData } = await supabase.from('controllers').select('*');
            const { data: sensorsData } = await supabase.from('sensors').select('*');

            if (controllersData) setControllers(controllersData);
            if (sensorsData) setSensors(sensorsData);

            // Speakers are not in our current schema, so we'll leave them as empty or mock later
        };
        fetchHardware();
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Hardware & Sensors</h1>
                    <p className="text-muted-foreground mt-1">Real-time telemetry from Manikin ESP32 network.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg font-medium transition-colors border border-border text-sm">
                        <RefreshCcw size={16} />
                        Sync All
                    </button>
                    <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-sm">
                        <Settings2 size={16} />
                        Global Config
                    </button>
                </div>
            </div>

            {/* Microcontrollers Section (4 ESP32s) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {controllers.map((esp) => (
                    <button
                        key={esp.id}
                        onClick={() => setSelectedDevice(esp.id)}
                        className={cn(
                            "p-4 rounded-xl border transition-all text-left group",
                            selectedDevice === esp.id
                                ? "bg-primary/5 border-primary shadow-lg shadow-primary/5 ring-1 ring-primary"
                                : "bg-card border-border hover:border-primary/50"
                        )}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                esp.status === 'Warning' ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                            )}>
                                <Cpu size={20} />
                            </div>
                            <div className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                esp.status === 'Warning' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                            )}>
                                {esp.status}
                            </div>
                        </div>
                        <h3 className="font-bold text-foreground text-sm">{esp.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{esp.ip_address}</p>
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Battery</span>
                                <span className="text-xs font-bold text-foreground">{esp.battery_level}%</span>
                            </div>
                            <Zap size={14} className={cn(
                                esp.status === 'Warning' ? "text-amber-500" : "text-emerald-500"
                            )} />
                        </div>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sensors Grid (14 Sensors) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Activity size={20} className="text-primary" />
                            Sensor Network <span className="text-xs font-normal text-muted-foreground">({sensors.length} Active Nodes)</span>
                        </h2>
                        <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                        {sensors.map((sensor) => {
                            // Helper to format the JSONB value
                            const formatValue = (s) => {
                                if (!s.value) return '--';
                                // If it's already an object (from Supabase JSONB), use it. 
                                // referencing the error: "found object with keys {sound, resp_rate}"
                                const v = s.value;

                                if (s.type === 'Lung') return `${v.resp_rate || 0} rpm | ${v.sound || 'Clear'}`;
                                if (s.type === 'Heart') return `${v.bpm || 0} bpm | ${v.rhythm || 'NSR'}`;
                                if (s.type === 'Mic') return `${v.db || 0} dB`;
                                return JSON.stringify(v); // Fallback
                            };

                            return (
                                <div key={sensor.id} className="bg-card border border-border rounded-xl p-3 hover:border-primary/30 transition-colors relative overflow-hidden group">
                                    {sensor.status === 'Error' && (
                                        <div className="absolute top-0 right-0 p-1">
                                            <AlertTriangle size={12} className="text-destructive" />
                                        </div>
                                    )}
                                    <p className="text-[10px] font-mono text-muted-foreground">{sensor.id}</p>
                                    <h4 className="text-xs font-bold text-foreground mt-1 line-clamp-1">{sensor.type} Sensor</h4>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-muted-foreground">12ms</span>
                                        <span className={cn(
                                            "text-xs font-bold",
                                            sensor.status === 'Error' ? "text-destructive" : "text-emerald-500"
                                        )}>{formatValue(sensor)}</span>
                                    </div>
                                    <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-1000",
                                                sensor.status === 'Error' ? "bg-destructive w-full" : "bg-emerald-500"
                                            )}
                                            style={sensor.status !== 'Error' ? { width: `${Math.random() * 40 + 50}%` } : { width: '100%' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Audio System (16 Speakers) */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Volume2 size={20} className="text-primary" />
                        Audio Matrix <span className="text-xs font-normal text-muted-foreground">({speakers.length} Channels)</span>
                    </h2>
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                            {speakers.map((spk) => (
                                <div key={spk.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 group hover:bg-muted/50 transition-colors">
                                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <Volume2 size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{spk.id}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{spk.db}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                                            <span>Pos: {spk.location}</span>
                                            <span className="text-emerald-500 group-hover:block transition-all">READY</span>
                                        </div>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
