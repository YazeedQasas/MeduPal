import React from 'react';
import { History, FileText, Calendar, Award } from 'lucide-react';
import { cn } from '../../lib/utils';

const MOCK_SESSIONS = [
  { id: '1', caseName: 'Community Acquired Pneumonia', score: 85, date: 'Feb 25, 2025' },
  { id: '2', caseName: 'Aortic Stenosis', score: 72, date: 'Feb 22, 2025' },
  { id: '3', caseName: 'Asthma Exacerbation', score: 90, date: 'Feb 18, 2025' },
];

export function StudentHistory() {
  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">History</h1>
      <p className="text-muted-foreground text-sm">Your previous practice sessions.</p>

      <div className="space-y-3">
        {MOCK_SESSIONS.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-white/10 bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{s.caseName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar size={12} />
                  {s.date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Award size={16} className="text-amber-400" />
              <span className="font-semibold text-foreground">{s.score}%</span>
            </div>
          </div>
        ))}
      </div>

      {MOCK_SESSIONS.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-card p-8 text-center">
          <History size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No sessions yet. Start practicing to see your history here.</p>
        </div>
      )}
    </div>
  );
}
