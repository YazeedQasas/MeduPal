import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { glassCardStyle, DASHBOARD_THEME } from './DashboardShell';

const CHART_COLORS = ['#60a5fa', '#34d399', '#a78bfa', '#f472b6', '#fb923c'];

export function LearningPerformance({ variant }) {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchPerformanceData = async () => {
            // Fetch from the view we created
            const { data: performanceData } = await supabase
                .from('performance_metrics')
                .select('*');

            if (performanceData) {
                const formatted = performanceData.map(p => ({
                    name: p.category || 'General',
                    score: Math.round(p.avg_score),
                    failRate: Math.round((p.fail_count / p.total_attempts) * 100) || 0
                }));
                setData(formatted);
            }
        };
        fetchPerformanceData();
    }, []);

    const avgScore = data.length > 0 ? (data.reduce((acc, curr) => acc + curr.score, 0) / data.length).toFixed(1) : 0;
    const avgFailRate = data.length > 0 ? (data.reduce((acc, curr) => acc + curr.failRate, 0) / data.length).toFixed(1) : 0;
    const isGlass = variant === 'glass';

    return (
        <div
            className={cn('rounded-2xl p-4 flex flex-col h-full', !isGlass && 'bg-card border border-border shadow-[0_0_0_1px_rgba(0,0,0,0.4)]')}
            style={isGlass ? glassCardStyle : undefined}
        >
            <h3 className="font-semibold mb-4" style={isGlass ? { color: DASHBOARD_THEME.text } : {}}>Performance Snapshot</h3>
            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={60} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(6,9,9,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 12 }}
                            cursor={{ fill: 'transparent' }}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.score > 80 ? CHART_COLORS[1] : CHART_COLORS[4]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className={cn('p-2 rounded', !isGlass && 'bg-muted/20')} style={isGlass ? { background: 'rgba(255,255,255,0.05)' } : undefined}>
                    <span className="block text-2xl font-bold" style={isGlass ? { color: DASHBOARD_THEME.text } : {}}>{avgScore}</span>
                    <span className="text-xs" style={isGlass ? { color: DASHBOARD_THEME.muted } : {}}>Avg Score</span>
                </div>
                <div className={cn('p-2 rounded', !isGlass && 'bg-destructive/10')} style={isGlass ? { background: 'rgba(239,68,68,0.1)' } : undefined}>
                    <span className="block text-2xl font-bold text-destructive">{avgFailRate}%</span>
                    <span className="text-xs" style={isGlass ? { color: DASHBOARD_THEME.muted } : {}}>Crit. Fail Rate</span>
                </div>
            </div>
        </div>
    );
}
