import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { AppShell } from "./components/layout/AppShell";
import { PublicShell } from "./components/layout/PublicShell";
import { ComingSoonGuard } from "./components/layout/ComingSoonGuard";
import { CookieBanner } from "./components/cookie/CookieBanner";

// Lazy-loaded routes split the bundle per page. Heavy pages like the wiki
// (1k+ lines of article content) only ship when the user navigates there.
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AuditReport = lazy(() => import("./pages/AuditReport"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Pricing = lazy(() => import("./pages/Pricing"));
const ProjectNew = lazy(() => import("./pages/ProjectNew"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Einstellungen = lazy(() => import("./pages/Einstellungen"));
const PasswortVergessen = lazy(() => import("./pages/PasswortVergessen"));
const PasswortNeu = lazy(() => import("./pages/PasswortNeu"));
const Impressum = lazy(() => import("./pages/legal/Impressum"));
const Datenschutz = lazy(() => import("./pages/legal/Datenschutz"));
const AGB = lazy(() => import("./pages/legal/AGB"));
const WikiIndex = lazy(() => import("./pages/wiki/WikiIndex"));
const WikiArticle = lazy(() => import("./pages/wiki/WikiArticle"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate2">
      Laden…
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
      <CookieBanner />
    </ToastProvider>
  );
}
