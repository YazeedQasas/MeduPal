import { useState, useEffect } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { StatCards } from "./components/dashboard/StatCards";
import { ActiveStations } from "./components/dashboard/ActiveStations";
import { SystemHealth } from "./components/dashboard/SystemHealth";
import { AlertsFeed } from "./components/dashboard/AlertsFeed";
import { LearningPerformance } from "./components/dashboard/LearningPerformance";
import { QuickActions } from "./components/dashboard/QuickActions";
import { Cases } from "./components/dashboard/Cases";
import { Sessions } from "./components/dashboard/Sessions";
import { Students } from "./components/dashboard/Students";
import { Hardware } from "./components/dashboard/Hardware";
import { Settings } from "./components/dashboard/Settings";
import { StationsMap } from "./components/dashboard/StationsMap";
import LandingPage from "./components/landingPage/LandingPage";
import AuthPage from "./components/auth/AuthPage";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AppContent() {
  const [activeTab, setActiveTab] = useState("landing");
  const { user, loading, role } = useAuth();

  // When auth has finished loading, restore route:
  // - if there's no user, send to landing
  // - if there is a user, send admins to admin dashboard, others to cases (for now)
  useEffect(() => {
    if (loading) return;

    if (!user && activeTab !== "landing" && activeTab !== "auth") {
      setActiveTab("landing");
      return;
    }

    if (user && (activeTab === "landing" || activeTab === "auth")) {
      if (role === "admin") {
        setActiveTab("dashboard");
      } else {
        setActiveTab("cases");
      }
    }
  }, [loading, user, role, activeTab]);

  // Don't show landing/dashboard until we know auth state (avoids flash of landing on refresh)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "landing":
        return <LandingPage setActiveTab={setActiveTab} />;

      case "auth":
        return <AuthPage setActiveTab={setActiveTab} />;

      case "dashboard":
        if (role !== "admin") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">
                  Admin area
                </h2>
                <p className="text-muted-foreground mt-2">
                  You don't have permission to view the admin dashboard.
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="max-w-[1600px] mx-auto space-y-6">
            <StatCards />
            <ActiveStations onViewAll={() => setActiveTab("stations")} />
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
      case "cases":
        return <Cases />;
      case "sessions":
        return <Sessions />;
      case "students":
        return <Students />;
      case "hardware":
        return <Hardware />;
      case "stations":
        return <StationsMap />;
      case "settings":
        return <Settings />;
      case "users":
        if (role !== "admin") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">
                  Admin area
                </h2>
                <p className="text-muted-foreground mt-2">
                  You don't have permission to manage users.
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="max-w-[1200px] mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-muted-foreground">
              Admin user management (create users, assign roles) will go here.
            </p>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-[500px]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-muted-foreground capitalize">
                {activeTab} Page
              </h2>
              <p className="text-muted-foreground mt-2">
                This page is under development.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
