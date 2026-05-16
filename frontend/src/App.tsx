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
import Impressum from "./pages/legal/Impressum";
import Datenschutz from "./pages/legal/Datenschutz";
import AGB from "./pages/legal/AGB";
import { ToastProvider } from "./components/Toast";
import { AppShell } from "./components/layout/AppShell";
import { PublicShell } from "./components/layout/PublicShell";
import { CookieBanner } from "./components/cookie/CookieBanner";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Public routes — minimaler Header mit Login/Signup-Buttons. */}
        <Route element={<PublicShell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
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
          <Route path="/wiki" element={<PlaceholderPage title="SEO Wiki" hint="Wird in Bereich 5 implementiert." />} />
          <Route path="/einstellungen" element={<Einstellungen />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <CookieBanner />
    </ToastProvider>
  );
}

function PlaceholderPage({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12" data-testid="placeholder-page">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-slate2">{hint}</p>
    </div>
  );
}
