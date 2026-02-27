import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState } from 'react';

export function MainLayout({ children, activeTab, setActiveTab }) {
  const hideLandingChrome = activeTab === 'landing' || activeTab === 'auth' || activeTab === 'onboarding';

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      {!hideLandingChrome && (
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        {!hideLandingChrome && <Header />}

        <main className={`flex-1 overflow-y-auto overflow-x-hidden min-w-0 relative ${hideLandingChrome ? '' : 'p-6'}`}>
          {!hideLandingChrome && (
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
          )}
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
