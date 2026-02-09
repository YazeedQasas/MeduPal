import { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { StatCards } from './components/dashboard/StatCards';
import { ActiveStations } from './components/dashboard/ActiveStations';
import { SystemHealth } from './components/dashboard/SystemHealth';
import { AlertsFeed } from './components/dashboard/AlertsFeed';
import { LearningPerformance } from './components/dashboard/LearningPerformance';
import { QuickActions } from './components/dashboard/QuickActions';
import { Cases } from './components/dashboard/Cases';
import { Sessions } from './components/dashboard/Sessions';
import { Students } from './components/dashboard/Students';
import { Hardware } from './components/dashboard/Hardware';
import { Settings } from './components/dashboard/Settings';
import { StationsMap } from './components/dashboard/StationsMap';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="max-w-[1600px] mx-auto space-y-6">
            <StatCards />
            <ActiveStations onViewAll={() => setActiveTab('stations')} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
              <div className="lg:col-span-1 h-full">
                <SystemHealth />
              </div>
              <div className="lg:col-span-1 h-full">
                <LearningPerformance />
              </div>
              <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                <div className="flex-1 min-h-0">
                  <AlertsFeed />
                </div>
                <div className="shrink-0">
                  <QuickActions />
                </div>
              </div>
            </div>
          </div>
        );
      case 'cases':
        return <Cases />;
      case 'sessions':
        return <Sessions />;
      case 'students':
        return <Students />;
      case 'hardware':
        return <Hardware />;
      case 'stations':
        return <StationsMap />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="flex items-center justify-center h-[500px]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-muted-foreground capitalize">{activeTab} Page</h2>
              <p className="text-muted-foreground mt-2">This page is under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </MainLayout>
  )
}

export default App
