import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import AuditReport from "./pages/AuditReport";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Pricing from "./pages/Pricing";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import Einstellungen from "./pages/Einstellungen";
import PasswortVergessen from "./pages/PasswortVergessen";
import PasswortNeu from "./pages/PasswortNeu";
import Impressum from "./pages/legal/Impressum";
import Datenschutz from "./pages/legal/Datenschutz";
import AGB from "./pages/legal/AGB";
import WikiIndex from "./pages/wiki/WikiIndex";
import WikiArticle from "./pages/wiki/WikiArticle";
import { ToastProvider } from "./components/Toast";
import { AppShell } from "./components/layout/AppShell";
import { PublicShell } from "./components/layout/PublicShell";
import { ComingSoonGuard } from "./components/layout/ComingSoonGuard";
import { CookieBanner } from "./components/cookie/CookieBanner";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Public routes — minimaler Header mit Login/Signup-Buttons. */}
        <Route element={<PublicShell />}>
          {/* Landing bleibt hidden bis zum öffentlichen Launch. Der Guard
              redirected anon→/login und authed→/dashboard. Zum Aktivieren
              der Landing: <ComingSoonGuard> in App.tsx durch <Landing />
              ersetzen. */}
          <Route path="/" element={<ComingSoonGuard><Landing /></ComingSoonGuard>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/passwort-vergessen" element={<PasswortVergessen />} />
          <Route path="/passwort-neu" element={<PasswortNeu />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/audit/:id" element={<AuditReport />} />
          <Route path="/legal/impressum" element={<Impressum />} />
          <Route path="/legal/datenschutz" element={<Datenschutz />} />
          <Route path="/legal/agb" element={<AGB />} />
        </Route>

        {/* Authed routes — AppShell (TopNav + Sidebar + Footer).
            AppShell redirects to /login when the user isn't signed in. */}
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects/new" element={<ProjectNew />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          {/* Placeholder routes — implemented in later Phase-4 sections */}
          <Route path="/wiki" element={<WikiIndex />} />
          <Route path="/wiki/:slug" element={<WikiArticle />} />
          <Route path="/einstellungen" element={<Einstellungen />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <CookieBanner />
    </ToastProvider>
  );
}

