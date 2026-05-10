import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, ClipboardCheck, Clock, FileText, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

function AssignedExamStart({ onBack, onStart }) {
    const { user } = useAuth();
    const [status, setStatus] = useState('loading');
    const [examInfo, setExamInfo] = useState(null);

    useEffect(() => {
        if (!user?.id) return;

        const fetchAssignedExam = async () => {
            setStatus('loading');

            const { data, error } = await supabase
                .from('sessions')
                .select('id, start_time, end_time, case:cases(id, title)')
                .eq('student_id', user.id)
                .eq('status', 'Scheduled')
                .eq('session_type', 'exam')
                .order('start_time', { ascending: true })
                .limit(1)
                .single();

            if (error || !data) {
                setStatus('not_found');
                return;
            }

            const durationMs = data.end_time
                ? new Date(data.end_time) - new Date(data.start_time)
                : 10 * 60 * 1000;
            const durationMin = Math.max(1, Math.round(durationMs / 60000));

            setExamInfo({
                id: data.id,
                caseName: data.case?.title || 'Exam',
                duration: durationMin,
                startTime: data.start_time,
            });
            setStatus('found');
        };

        fetchAssignedExam();
    }, [user?.id]);

    const formatDateTime = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onBack();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div className="relative w-full max-w-md mx-4 bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Close */}
                <button
                    onClick={onBack}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <ClipboardCheck size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Assigned Exam</h2>
                            <p className="text-sm text-muted-foreground">Your scheduled examination</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                            <p className="text-muted-foreground text-sm">Checking your assigned exam...</p>
                        </div>
                    )}

                    {status === 'not_found' && (
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                                <AlertCircle size={28} />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">No Assigned Exam</h3>
                            <p className="text-sm text-muted-foreground text-center mb-6">
                                You don't have any scheduled exams at this time.
                            </p>
                            <button
                                onClick={onBack}
                                className="px-6 py-2 rounded-lg text-sm font-medium bg-muted/50 text-foreground hover:bg-muted transition-colors"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {status === 'found' && examInfo && (
                        <div className="space-y-4">
                            {/* Case */}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-white/5">
                                <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Case</p>
                                    <p className="text-sm font-semibold text-foreground">{examInfo.caseName}</p>
                                </div>
                            </div>

                            {/* Scheduled time */}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-white/5">
                                <Calendar className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Scheduled</p>
                                    <p className="text-sm font-semibold text-foreground">{formatDateTime(examInfo.startTime)}</p>
                                </div>
                            </div>

                            {/* Duration */}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-white/5">
                                <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Duration</p>
                                    <p className="text-sm font-semibold text-foreground">{examInfo.duration} minutes</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={onBack}
                                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-muted/50 text-foreground hover:bg-muted transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => onStart(examInfo)}
                                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                                >
                                    Start Exam
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AssignedExamStart;
