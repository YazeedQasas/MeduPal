import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout({ children, activeTab, setActiveTab }) {
  const hideLandingChrome = activeTab === 'landing' || activeTab === 'auth' || activeTab === 'onboarding';

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

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 relative p-6">
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[130%] h-[80%] opacity-30"
              style={{
                background: 'radial-gradient(ellipse 65% 50% at 50% 0%, rgba(100,170,145,0.25) 0%, rgba(60,120,100,0.08) 45%, transparent 70%)',
                filter: 'blur(24px)',
              }}
            />
          </div>
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
