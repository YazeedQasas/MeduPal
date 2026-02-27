import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export function CreateSessionForm({ onClose, onCreated, advisedStudentIds = null, defaultStudentId = null, sessionMode = null }) {
    const { user, role } = useAuth();
    const isStudentTraining = sessionMode === 'training' && role === 'student';

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        case_id: '',
        student_id: isStudentTraining ? user?.id : '',
        station_id: '',
        status: isStudentTraining ? 'In Progress' : 'Scheduled',
        start_time: new Date().toISOString().slice(0, 16)
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
                const { data: allStudents } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'student');
                let studentProfiles = allStudents || [];
                if (advisedStudentIds && advisedStudentIds.length > 0) {
                    studentProfiles = studentProfiles.filter((s) => advisedStudentIds.includes(s.id));
                }
                const { data: stations } = await supabase.from('stations').select('id, name, room_number');

                setOptions({
                    cases: cases || [],
                    students: studentProfiles,
                    stations: stations || []
                });

                const defaultStudent = isStudentTraining
                    ? user?.id
                    : (defaultStudentId && studentProfiles.some((s) => s.id === defaultStudentId)
                        ? defaultStudentId
                        : studentProfiles?.[0]?.id || '');

                setFormData(prev => ({
                    ...prev,
                    case_id: cases?.[0]?.id || '',
                    student_id: defaultStudent,
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
    }, [advisedStudentIds, defaultStudentId, isStudentTraining, user?.id]);

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

                <h2 className="text-xl font-bold text-foreground mb-1">
                    {isStudentTraining ? 'Start Training Session' : 'Schedule New Session'}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                    {isStudentTraining
                        ? 'Choose a case and station to begin your practice session.'
                        : (advisedStudentIds ? 'Assign one of your advisees to a clinical case and station.' : 'Assign a student to a clinical case and station.')}
                </p>

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

                    {!isStudentTraining && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Select Student</label>
                            {options.students.length === 0 && advisedStudentIds?.length > 0 ? (
                                <p className="text-sm text-muted-foreground py-2">You have no advisees yet. Advise students from the Students tab first.</p>
                            ) : (
                                <select
                                    required
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                    value={formData.student_id}
                                    onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                                >
                                    {options.students.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name || 'Unnamed'} {s.email ? `(${s.email})` : ''}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

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

                    {!isStudentTraining && (
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
                    )}

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
                            disabled={submitting || (!isStudentTraining && advisedStudentIds?.length > 0 && options.students.length === 0)}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? (isStudentTraining ? 'Starting...' : 'Scheduling...') : (
                                <>
                                    {isStudentTraining ? <Play size={16} /> : <Save size={16} />}
                                    {isStudentTraining ? 'Start Training' : 'Schedule Session'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
