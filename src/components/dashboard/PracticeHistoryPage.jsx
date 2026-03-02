import React from 'react';
import StudentPracticeFlow from './StudentPracticeFlow';

/**
 * Standalone Practice Session "History Taking" page at /practice-history.
 * Renders the same two-panel layout as in student practice sessions
 * (Patient Conversation + Patient Status, Voice On, vitals, timer, etc.)
 * with "Back to app" instead of "Proceed to Evaluation".
 */
function PracticeHistoryPage() {
    const handleExit = () => {
        window.location.href = '/';
    };

    return (
        <StudentPracticeFlow
            onExit={handleExit}
            standaloneHistoryOnly
        />
    );
}

export default PracticeHistoryPage;
