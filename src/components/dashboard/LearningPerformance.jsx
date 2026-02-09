import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';

export function LearningPerformance() {
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

    return (
        <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4 flex flex-col h-full">
            <h3 className="font-semibold text-foreground mb-4">Performance Snapshot</h3>
            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={60} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            cursor={{ fill: 'transparent' }}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#10b981' : '#f59e0b'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-muted/20 rounded">
                    <span className="block text-2xl font-bold text-foreground">{avgScore}</span>
                    <span className="text-xs text-muted-foreground">Avg Score</span>
                </div>
                <div className="p-2 bg-destructive/10 rounded">
                    <span className="block text-2xl font-bold text-destructive">{avgFailRate}%</span>
                    <span className="text-xs text-muted-foreground">Crit. Fail Rate</span>
                </div>
            </div>
        </div>
    );
}
