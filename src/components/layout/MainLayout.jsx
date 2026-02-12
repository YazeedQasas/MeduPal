import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState } from 'react';

export function MainLayout({ children, activeTab, setActiveTab }) {
 const hideLandingChrome = activeTab === 'landing';

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {!hideLandingChrome && (
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {!hideLandingChrome && <Header />}

        <main className={`flex-1 overflow-y-auto ${hideLandingChrome ? '' : 'p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
