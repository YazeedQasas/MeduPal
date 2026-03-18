import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout({ children, activeTab, setActiveTab }) {
  const hideLandingChrome = activeTab === 'landing' || activeTab === 'auth' || activeTab === 'onboarding' || activeTab === 'student-usage-setup';

  // Landing / auth / onboarding: no fixed height, natural document scroll — one scrollbar only
  if (hideLandingChrome) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        {children}
      </div>
    );
  }

  // Dashboard: fixed viewport shell, only <main> scrolls — one scrollbar only
  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header />

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 relative p-6 flex flex-col items-stretch min-h-0">
          <div className="relative z-10 flex flex-col items-stretch flex-1 min-h-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
