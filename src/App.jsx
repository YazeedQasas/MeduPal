import { useState, useEffect } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { AdminDashboard } from "./components/dashboard/AdminDashboard";
import { Cases } from "./components/dashboard/Cases";
import Sessions from "./components/dashboard/Sessions";
import { Students } from "./components/dashboard/Students";
import { Hardware } from "./components/dashboard/Hardware";
import { Settings } from "./components/dashboard/Settings";
import { StationsMap } from "./components/dashboard/StationsMap";
import { InstructorDashboard } from "./components/dashboard/InstructorDashboard";
import { StudentDashboard } from "./components/dashboard/StudentDashboard";
import { ProfileSettings } from "./components/dashboard/ProfileSettings";
import LandingPage from "./components/landingPage/LandingPage";
import AuthPage from "./components/auth/AuthPage";
import RoleSelectPage from "./components/auth/RoleSelectPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import PracticeHistoryPage from "./components/dashboard/PracticeHistoryPage";
import { StudentHub } from "./components/dashboard/StudentHub";
import StudentPracticeFlow from "./components/dashboard/StudentPracticeFlow";
import { StudentUsageSetup } from "./components/dashboard/StudentUsageSetup";
import { ExamPage } from "./components/dashboard/ExamPage";
import { AssignExamPage } from "./components/dashboard/AssignExamPage";
import { DashboardShell } from "./components/dashboard/DashboardShell";
import { StudentHistory } from "./components/dashboard/StudentHistory";
import { StudentProgress } from "./components/dashboard/StudentProgress";
import { StudentProfile } from "./components/dashboard/StudentProfile";

function AppContent() {
  const [activeTab, setActiveTab] = useState("landing");
  const [instructorViewingStudent, setInstructorViewingStudent] = useState(null);
  const { user, loading, role } = useAuth();

  // Dedicated URL: /practice-history — standalone History Taking (voice) page for AI work
  if (typeof window !== "undefined" && window.location.pathname === "/practice-history") {
    return <PracticeHistoryPage />;
  }

  // Test loading screen: open app with ?loading=1 in the URL (e.g. http://localhost:5173/?loading=1)
  if (new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("loading") === "1") {
    return <LoadingScreen />;
  }

  // When auth has finished loading, restore route:
  // - if there's no user, send to landing
  // - if there is a user, send admins to dashboard, students to student-dashboard, others to student-portal
  useEffect(() => {
    if (loading) return;

    if (!user && activeTab !== "landing" && activeTab !== "auth" && activeTab !== "auth-signup") {
      setActiveTab("landing");
      return;
    }

    // Only auto-redirect from landing (e.g. page refresh while logged in).
    // If user signed up but didn't complete onboarding (role select + usage setup), send them back to onboarding.
    if (user && activeTab === "landing") {
      if (typeof window !== 'undefined' && window.localStorage.getItem('medupal_onboarding_pending') === 'true') {
        setActiveTab("onboarding");
        return;
      }
      if (role === "admin" || role === "instructor") {
        setActiveTab("dashboard");
      } else if (role === "student") {
        setActiveTab("student-dashboard");
      } else {
        setActiveTab("student-portal");
      }
    }
  }, [loading, user, role, activeTab]);

  // URL-based redirect: student default "/" | "/home" → "/student-dashboard"; /practice → student-practice; /exam → student-exam
  // Skip when in auth/onboarding flow to avoid flash of dashboard before RoleSelect
  useEffect(() => {
    if (loading || !user || role !== "student") return;
    if (activeTab === "auth" || activeTab === "auth-signup" || activeTab === "onboarding" || activeTab === "student-usage-setup") return;
    if (typeof window !== "undefined" && window.localStorage.getItem("medupal_onboarding_pending") === "true") return;
    const path = window.location.pathname;
    if (path === "/" || path === "/home" || path === "/student-dashboard" || path === "/student-hub") {
      setActiveTab("student-dashboard");
      if (path === "/" || path === "/home" || path === "/student-hub") {
        window.history.replaceState(null, "", "/student-dashboard");
      }
    } else if (path === "/practice") {
      setActiveTab("student-practice");
      window.history.replaceState(null, "", "/practice");
    } else if (path === "/exam") {
      setActiveTab("student-exam");
      window.history.replaceState(null, "", "/exam");
    }
  }, [loading, user, role]);

  // URL-based redirect: instructor — default to dashboard; /assign-exam, /students, /sessions when explicitly visited
  useEffect(() => {
    if (loading || !user) return;
    const isInstructor = role === "instructor" || role === "admin";
    if (!isInstructor) return;
    if (activeTab === "auth" || activeTab === "auth-signup" || activeTab === "onboarding") return;
    const path = window.location.pathname;
    if (path === "/" || path === "/home" || path === "/dashboard") {
      setActiveTab("dashboard");
      if (path === "/" || path === "/home") {
        window.history.replaceState(null, "", "/dashboard");
      }
    } else if (path === "/assign-exam") {
      setActiveTab("assign-exam");
      window.history.replaceState(null, "", "/assign-exam");
    } else if (path === "/students") {
      setActiveTab("students");
      window.history.replaceState(null, "", "/students");
    } else if (path === "/sessions") {
      setActiveTab("sessions");
      window.history.replaceState(null, "", "/sessions");
    }
  }, [loading, user, role, activeTab]);

  // Don't show landing/dashboard until we know auth state (avoids flash of landing on refresh)
  if (loading) {
    return <LoadingScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "landing":
        return <LandingPage setActiveTab={setActiveTab} />;

      case "onboarding":
        return <RoleSelectPage setActiveTab={setActiveTab} />;

      case "student-usage-setup":
        if (role !== "student") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">Setup</h2>
                <p className="text-muted-foreground mt-2">This page is for students only.</p>
              </div>
            </div>
          );
        }
        return <StudentUsageSetup setActiveTab={setActiveTab} />;

      case "auth":
        return <AuthPage setActiveTab={setActiveTab} initialMode="signin" />;
      case "auth-signup":
        return <AuthPage setActiveTab={setActiveTab} initialMode="signup" />;

      case "profile":
        return <ProfileSettings setActiveTab={setActiveTab} />;

      case "student-dashboard":
        if (role !== "student") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">Student Dashboard</h2>
                <p className="text-muted-foreground mt-2">This page is for students only.</p>
              </div>
            </div>
          );
        }
        return <StudentHub setActiveTab={setActiveTab} />;

      case "dashboard":
        if (role === "instructor") {
          return (
            <InstructorDashboard
              setActiveTab={setActiveTab}
              onViewStudentProfile={(student) => {
                setInstructorViewingStudent(student);
                setActiveTab("instructor-student-profile");
              }}
            />
          );
        }
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
        return <AdminDashboard setActiveTab={setActiveTab} />;
      case "student-portal":
        return <StudentDashboard setActiveTab={setActiveTab} />;

      case "student-practice":
        return (
          <StudentPracticeFlow
            onExit={() => {
              setActiveTab("student-dashboard");
              window.history.replaceState(null, "", "/student-dashboard");
            }}
          />
        );

      case "student-exam":
        if (role !== "student") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">Exam</h2>
                <p className="text-muted-foreground mt-2">This page is for students only.</p>
              </div>
            </div>
          );
        }
        return <ExamPage setActiveTab={setActiveTab} />;

      case "assign-exam":
        if (role !== "instructor" && role !== "admin") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">Assign Exam</h2>
                <p className="text-muted-foreground mt-2">This page is for instructors only.</p>
              </div>
            </div>
          );
        }
        return (
          <DashboardShell>
            <AssignExamPage setActiveTab={setActiveTab} />
          </DashboardShell>
        );

      case "cases":
        return <Cases />;
      case "sessions":
        return (
          (role === "instructor" || role === "admin") ? (
            <DashboardShell>
              <Sessions />
            </DashboardShell>
          ) : (
            <Sessions />
          )
        );
      case "students":
        return (
          (role === "instructor" || role === "admin") ? (
            <DashboardShell>
              <Students />
            </DashboardShell>
          ) : (
            <Students />
          )
        );
      case "hardware":
        return <Hardware />;
      case "student-hardware":
        if (role !== "student") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">Hardware</h2>
                <p className="text-muted-foreground mt-2">This page is for students only.</p>
              </div>
            </div>
          );
        }
        return <Hardware />;
      case "stations":
        return <StationsMap />;
      case "settings":
        return <Settings setActiveTab={setActiveTab} />;
      case "student-progress":
        if (role !== "student") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">Progress</h2>
                <p className="text-muted-foreground mt-2">This page is for students only.</p>
              </div>
            </div>
          );
        }
        return <StudentProgress />;
      case "student-history":
        if (role !== "student") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">History</h2>
                <p className="text-muted-foreground mt-2">This page is for students only.</p>
              </div>
            </div>
          );
        }
        return <StudentHistory />;
      case "student-profile":
        if (role !== "student") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">Profile</h2>
                <p className="text-muted-foreground mt-2">This page is for students only.</p>
              </div>
            </div>
          );
        }
        return (
          <StudentProfile
            student={user}
            onBack={() => setActiveTab("student-dashboard")}
          />
        );
      case "instructor-student-profile":
        if ((role !== "instructor" && role !== "admin") || !instructorViewingStudent) {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">Student Profile</h2>
                <p className="text-muted-foreground mt-2">No student selected.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("dashboard")}
                  className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          );
        }
        return (
          <DashboardShell>
            <div className="p-6">
              <StudentProfile
                student={instructorViewingStudent}
                onBack={() => {
                  setInstructorViewingStudent(null);
                  setActiveTab("dashboard");
                }}
              />
            </div>
          </DashboardShell>
        );
      case "student-settings":
        if (role !== "student") {
          return (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-muted-foreground">Settings</h2>
                <p className="text-muted-foreground mt-2">This page is for students only.</p>
              </div>
            </div>
          );
        }
        return (
          <ProfileSettings
            setActiveTab={setActiveTab}
            backTab="student-dashboard"
            backLabel="Back to Home"
          />
        );
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
