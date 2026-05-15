import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import AuditReport from "./pages/AuditReport";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Pricing from "./pages/Pricing";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import { ToastProvider } from "./components/Toast";
import { AppShell } from "./components/layout/AppShell";
import { PublicShell } from "./components/layout/PublicShell";

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
        </Route>

        {/* Authed routes — AppShell (TopNav + Sidebar + Footer).
            AppShell redirects to /login when the user isn't signed in. */}
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects/new" element={<ProjectNew />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          {/* Placeholder routes — implemented in later Phase-4 sections */}
          <Route path="/wiki" element={<PlaceholderPage title="SEO Wiki" hint="Wird in Bereich 5 implementiert." />} />
          <Route path="/einstellungen" element={<PlaceholderPage title="Einstellungen" hint="Wird in Bereich 3 implementiert." />} />
          <Route path="/legal/impressum" element={<PlaceholderPage title="Impressum" hint="Wird in Bereich 4 implementiert." />} />
          <Route path="/legal/datenschutz" element={<PlaceholderPage title="Datenschutz" hint="Wird in Bereich 4 implementiert." />} />
          <Route path="/legal/agb" element={<PlaceholderPage title="AGB" hint="Wird in Bereich 4 implementiert." />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
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
