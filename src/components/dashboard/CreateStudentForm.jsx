import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function CreateStudentForm({ onClose, onCreated }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        student_identifier: '',
        email: '',
        graduation_year: new Date().getFullYear() + 2 // Default to 2 years from now
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Check if student with same ID exists
            const { data: existing } = await supabase
                .from('students')
                .select('id')
                .eq('student_identifier', formData.student_identifier)
                .single();

            if (existing) {
                throw new Error("A student with this ID already exists.");
            }

            const { error: insertError } = await supabase
                .from('students')
                .insert([formData]);

            if (insertError) throw insertError;

            onCreated();
            onClose();
        } catch (err) {
            console.error('Error creating student:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-foreground mb-1">Add New Student</h2>
                <p className="text-sm text-muted-foreground mb-6">Register a new student in the system.</p>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Full Name</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            placeholder="e.g. John Doe"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Student ID / Number</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            placeholder="e.g. MED-24-001"
                            value={formData.student_identifier}
                            onChange={e => setFormData({ ...formData, student_identifier: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email Address</label>
                        <input
                            type="email"
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            placeholder="student@medupal.edu"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Expected Graduation Year</label>
                        <input
                            type="number"
                            min="2024"
                            max="2035"
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.graduation_year}
                            onChange={e => setFormData({ ...formData, graduation_year: parseInt(e.target.value) })}
                        />
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
                            disabled={loading}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : (
                                <>
                                    <Save size={16} />
                                    Add Student
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
