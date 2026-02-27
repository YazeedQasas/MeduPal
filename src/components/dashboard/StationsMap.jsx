import { useState, useEffect } from 'react';
import { Plus, MapPin, Activity, Trash2, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function StationsMap() {
    const [stations, setStations] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        room_number: '',
        location: ''
    });

    const fetchStations = async () => {
        // Fetch all stations with their active sessions
        const { data: stationsData } = await supabase
            .from('stations')
            .select('*')
            .order('room_number', { ascending: true });

        const { data: activeSessions } = await supabase
            .from('sessions')
            .select(`
                id,
                station_id,
                start_time,
                case:cases(title),
                student:profiles!student_id(full_name)
            `)
            .eq('status', 'In Progress');

        if (stationsData) {
            const formatted = stationsData.map(station => {
                const activeSession = activeSessions?.find(s => s.station_id === station.id);
                return {
                    ...station,
                    isActive: !!activeSession,
                    activeSession: activeSession
                };
            });
            setStations(formatted);
        }
    };

    useEffect(() => {
        fetchStations();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('stations').insert([formData]);
        if (!error) {
            setIsCreating(false);
            setFormData({ name: '', room_number: '', location: '' });
            fetchStations();
        } else {
            alert(`Error creating station: ${error.message}`);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this station?')) {
            const { error } = await supabase.from('stations').delete().eq('id', id);
            if (!error) {
                fetchStations();
            } else {
                alert(`Error deleting station: ${error.message}`);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Stations Map</h1>
                    <p className="text-muted-foreground mt-1">Manage all clinical training stations and rooms.</p>
                </div>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus size={18} />
                    Add Station
                </button>
            </div>

            {/* Create Form */}
            {isCreating && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-foreground mb-4">Create New Station</h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Station Name</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                placeholder="e.g. Cardiology Station A"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Room Number</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                placeholder="e.g. 101"
                                value={formData.room_number}
                                onChange={e => setFormData({ ...formData, room_number: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-sm font-medium text-foreground">Location / Building</label>
                            <input
                                type="text"
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                placeholder="e.g. Medical Building 2nd Floor"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2 flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                Create Station
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {stations.map((station) => (
                    <div
                        key={station.id}
                        className={cn(
                            "bg-card border rounded-xl p-5 shadow-sm transition-all hover:shadow-md",
                            station.isActive ? "border-emerald-500/50 bg-emerald-500/5" : "border-border"
                        )}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "w-2.5 h-2.5 rounded-full",
                                    station.isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                                )} />
                                <h3 className="font-bold text-foreground">{station.name}</h3>
                            </div>
                            <button
                                onClick={() => handleDelete(station.id)}
                                className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin size={14} />
                                <span>Room {station.room_number}</span>
                            </div>
                            {station.location && (
                                <div className="text-xs text-muted-foreground">
                                    {station.location}
                                </div>
                            )}
                        </div>

                        {station.isActive && station.activeSession && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={14} className="text-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-500 uppercase">Active Session</span>
                                </div>
                                <p className="text-sm font-medium text-foreground truncate">
                                    {station.activeSession.case?.title || 'Untitled'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {station.activeSession.student?.full_name || 'Unknown Student'}
                                </p>
                            </div>
                        )}

                        {!station.isActive && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                                <span className="text-xs text-muted-foreground">Available</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {stations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <MapPin size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No stations found. Create your first station to get started.</p>
                </div>
            )}
        </div>
    );
}
