import { X } from 'lucide-react';

export function CreateStudentForm({ onClose }) {
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-foreground mb-1">About students</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Students are users who sign up and choose the <strong>Student</strong> role during onboarding.
                    The list above shows all profiles with the student role. To add students, have them create an
                    account and select &quot;Student&quot; when prompted.
                </p>
                <p className="text-sm text-muted-foreground">
                    Instructors and admins are identified by their profile role (e.g. faculty, admin). There are no
                    separate student or instructor tables — everything is driven by the profile role.
                </p>

                <div className="pt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
