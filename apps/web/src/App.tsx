import { useCallback, useState } from "react";
import type { Role } from "./types";
import { LoginScreen } from "./components/LoginScreen";
import { WelcomeJourney } from "./components/WelcomeJourney";
import { DashboardView } from "./components/DashboardView";

type AppPhase = "login" | "welcome" | "dashboard";

export function App() {
  const [phase, setPhase] = useState<AppPhase>("login");
  const [role, setRole] = useState<Role>("donor");

  const handleLogin = useCallback(() => setPhase("welcome"), []);
  const handleWelcomeComplete = useCallback(() => setPhase("dashboard"), []);

  if (phase === "login") {
    return (
      <LoginScreen
        selectedRole={role}
        onRoleChange={setRole}
        onContinue={handleLogin}
      />
    );
  }

  if (phase === "welcome") {
    return <WelcomeJourney role={role} onComplete={handleWelcomeComplete} />;
  }

  return <DashboardView role={role} onLogout={() => setPhase("login")} />;
}
