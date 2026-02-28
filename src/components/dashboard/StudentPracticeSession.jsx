import React, { useState, useEffect } from 'react';
import { BookOpen, MapPin, Play, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import SessionWorkspace from './SessionWorkspace';

function StudentPracticeSession({ onExit }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [stations, setStations] = useState([]);
    const [selectedCase, setSelectedCase] = useState('');
    const [selectedStation, setSelectedStation] = useState('');
    const [activeSession, setActiveSession] = useState(null);

    useEffect(() => {
        const fetchOptions = async () => {
            setLoading(true);
            try {
                const [casesRes, stationsRes] = await Promise.all([
                    supabase.from('cases').select('id, title'),
                    supabase.from('stations').select('id, name, room_number')
                ]);

                setCases(casesRes.data || []);
                setStations(stationsRes.data || []);

                if (casesRes.data?.length) setSelectedCase(casesRes.data[0].id);
                if (stationsRes.data?.length) setSelectedStation(stationsRes.data[0].id);
            } catch (err) {
                console.error('Error fetching options:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOptions();
    }, []);

    const handleStartPractice = () => {
        const caseObj = cases.find(c => c.id === selectedCase);
        const stationObj = stations.find(s => s.id === selectedStation);

        setActiveSession({
            id: `practice-${Date.now()}`,
            type: 'training',
            caseName: caseObj?.title || 'Practice Case',
            stationName: stationObj?.name || 'Practice Station'
        });
    };

    const handleExitWorkspace = () => {
        setActiveSession(null);
    };

    if (activeSession) {
        return (
            <SessionWorkspace
                session={activeSession}
                onExit={handleExitWorkspace}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            <header className="bg-card border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <BookOpen size={22} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Practice Session</h1>
                        <p className="text-xs text-muted-foreground">Choose a case and station to begin</p>
                    </div>
                </div>
                <button
                    onClick={onExit}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                    <X size={20} />
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-6">
                {loading ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-muted-foreground text-sm">Loading options...</p>
                    </div>
                ) : (
                    <div className="w-full max-w-md bg-card border border-white/5 rounded-2xl p-6 space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-foreground">Start Practice</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Select a clinical case and station for your training session.
                            </p>
                        </div>

                        {/* Case Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <BookOpen size={16} className="text-primary" />
                                Select Case
                            </label>
                            <select
                                value={selectedCase}
                                onChange={(e) => setSelectedCase(e.target.value)}
                                className="w-full bg-muted/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            >
                                {cases.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Station Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <MapPin size={16} className="text-blue-500" />
                                Select Station
                            </label>
                            <select
                                value={selectedStation}
                                onChange={(e) => setSelectedStation(e.target.value)}
                                className="w-full bg-muted/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            >
                                {stations.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.room_number ? `(Room ${s.room_number})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 space-y-3">
                            <button
                                onClick={handleStartPractice}
                                disabled={!selectedCase || !selectedStation}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play size={18} />
                                Start Practice
                            </button>
                            <button
                                onClick={onExit}
                                className="w-full py-3 rounded-xl text-sm font-medium bg-muted/50 text-foreground hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StudentPracticeSession;
