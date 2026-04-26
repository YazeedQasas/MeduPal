import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export function MainLayout({ children, activeTab, setActiveTab }) {
  const { role } = useAuth();
  const hideLandingChrome = activeTab === 'landing' || activeTab === 'auth' || activeTab === 'auth-signup' || activeTab === 'onboarding' || activeTab === 'student-usage-setup';

  // Landing / auth / onboarding: no fixed height, natural document scroll — one scrollbar only
  if (hideLandingChrome) {
    return (
      <div className="min-h-screen min-h-[100vh] text-foreground font-sans">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen text-foreground font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Hairline only — avoids a heavy black band between sidebar and content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background">
        {/* pt-0 / px on inner only: avoids stacked padding (main + page wrappers) on top and sides */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 relative px-0 pb-8 pt-0 flex flex-col items-stretch min-h-0">
          <div className="relative z-10 flex flex-col items-stretch flex-1 min-h-0 w-full min-w-0 px-4 sm:px-6 lg:px-8 pt-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
