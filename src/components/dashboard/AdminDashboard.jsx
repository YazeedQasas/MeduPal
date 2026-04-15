import { StatCards } from './StatCards';
import { ActiveStations } from './ActiveStations';
import { SystemHealth } from './SystemHealth';
import { LearningPerformance } from './LearningPerformance';
import { AlertsFeed } from './AlertsFeed';
import { QuickActions } from './QuickActions';
import { DashboardShell } from './DashboardShell';

export function AdminDashboard({ setActiveTab }) {
  return (
    <DashboardShell>
      <div className="max-w-[1600px] mx-auto px-1 py-2 space-y-8">
        <StatCards variant="glass" />
        <ActiveStations onViewAll={() => setActiveTab('stations')} variant="glass" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          <div className="lg:col-span-1 h-full">
            <SystemHealth variant="glass" />
          </div>
          <div className="lg:col-span-1 h-full">
            <LearningPerformance variant="glass" />
          </div>
          <div className="lg:col-span-1 flex flex-col gap-6 h-full">
            <div className="flex-1 min-h-0">
              <AlertsFeed variant="glass" />
            </div>
            <div className="shrink-0">
              <QuickActions
                onAssignExam={() => setActiveTab('assign-exam')}
                onStartSession={() => setActiveTab('sessions')}
                onCreateCase={() => {
                  try { sessionStorage.setItem('medupal_open_create_case', '1'); } catch (_) {}
                  setActiveTab('cases');
                }}
                onManageStudents={() => setActiveTab('students')}
                onViewAnalytics={() => setActiveTab('cases')}
                onRunDiagnostics={() => setActiveTab('hardware')}
                onOpenSettings={() => setActiveTab('settings')}
                variant="glass"
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
