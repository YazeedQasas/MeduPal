import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function CreateSessionForm({ onClose, onCreated }) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        case_id: '',
        student_id: '',
        station_id: '',
        status: 'Scheduled',
        start_time: new Date().toISOString().slice(0, 16) // Default to now
    });
    const [options, setOptions] = useState({
        cases: [],
        students: [],
        stations: []
    });

    useEffect(() => {
        const fetchOptions = async () => {
            setLoading(true);
            try {
                const { data: cases } = await supabase.from('cases').select('id, title');
                const { data: students } = await supabase.from('students').select('id, full_name, student_identifier');
                const { data: stations } = await supabase.from('stations').select('id, name, room_number');

                setOptions({
                    cases: cases || [],
                    students: students || [],
                    stations: stations || []
                });

                // Pre-select first options if available
                setFormData(prev => ({
                    ...prev,
                    case_id: cases?.[0]?.id || '',
                    student_id: students?.[0]?.id || '',
                    station_id: stations?.[0]?.id || ''
                }));
            } catch (err) {
                console.error("Error fetching options", err);
                setError("Failed to load form options");
            } finally {
                setLoading(false);
            }
        };
        fetchOptions();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Get current user for examiner_id
            const { data: { user } } = await supabase.auth.getUser();

            // Try to find a profile to use
            let examinerId = user?.id;

            if (!examinerId) {
                const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
                examinerId = profile?.id;
            }

            if (!examinerId) throw new Error("No examiner profile found (you must be logged in or have seeded users).");

            const { error: insertError } = await supabase
                .from('sessions')
                .insert([{
                    ...formData,
                    examiner_id: examinerId,
                    start_time: new Date(formData.start_time).toISOString(),
                }]);

            if (insertError) throw insertError;

            onCreated();
            onClose();
        } catch (err) {
            console.error('Error creating session:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null; // Or a spinner

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-foreground mb-1">Schedule New Session</h2>
                <p className="text-sm text-muted-foreground mb-6">Assign a student to a clinical case and station.</p>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Select Case</label>
                        <select
                            required
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.case_id}
                            onChange={e => setFormData({ ...formData, case_id: e.target.value })}
                        >
                            {options.cases.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Select Student</label>
                        <select
                            required
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.student_id}
                            onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                        >
                            {options.students.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name} ({s.student_identifier})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Select Station</label>
                        <select
                            required
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.station_id}
                            onChange={e => setFormData({ ...formData, station_id: e.target.value })}
                        >
                            {options.stations.map(s => (
                                <option key={s.id} value={s.id}>{s.name} (Room {s.room_number})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Initial Status</label>
                            <select
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="Scheduled">Scheduled</option>
                                <option value="In Progress">Start Immediately (In Progress)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Start Time</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                value={formData.start_time}
                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? 'Scheduling...' : (
                                <>
                                    <Save size={16} />
                                    Schedule Session
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
