import React from 'react';
import { TrendingUp, Award, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

const MOCK_STATS = {
  avgScore: 78,
  sessionsCompleted: 12,
  improvement: '+5%',
};

export function StudentProgress() {
  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Progress</h1>
      <p className="text-muted-foreground text-sm">Your performance overview and improvement metrics.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Award size={20} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Average Score</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{MOCK_STATS.avgScore}%</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Activity size={20} className="text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Sessions Completed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{MOCK_STATS.sessionsCompleted}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Improvement</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{MOCK_STATS.improvement}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Improvement Metrics</h2>
        <p className="text-sm text-muted-foreground">
          Continue practicing to build your score history. Your improvement trend will appear here as you complete more sessions.
        </p>
      </div>
    </div>
  );
}
