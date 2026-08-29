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
import SeoIntegrations from "./pages/seo/SeoIntegrations";
import SeoWorkflow from "./pages/seo/SeoWorkflow";
import SeoOpportunities from "./pages/seo/SeoOpportunities";
import SeoTasks from "./pages/seo/SeoTasks";
import SeoBriefs from "./pages/seo/SeoBriefs";
import SeoLocal from "./pages/seo/SeoLocal";
import SeoReports from "./pages/seo/SeoReports";
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
          <Route path="/passwort-vergessen" element={<PasswortVergessen />} />
          <Route path="/passwort-neu" element={<PasswortNeu />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/audit/:id" element={<AuditReport />} />
          <Route path="/wiki" element={<WikiIndex />} />
          <Route path="/wiki/:slug" element={<WikiArticle />} />
          <Route path="/legal/impressum" element={<Impressum />} />
          <Route path="/legal/datenschutz" element={<Datenschutz />} />
          <Route path="/legal/agb" element={<AGB />} />
          {/* Wiki ist öffentlich zugänglich — soll auch ohne Account
              durchsucht werden können. */}
          <Route path="/wiki" element={<WikiIndex />} />
          <Route path="/wiki/:slug" element={<WikiArticle />} />
        </Route>

        {/* Authed routes — AppShell (TopNav + Sidebar + Footer).
            AppShell redirects to /login when the user isn't signed in. */}
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects/new" element={<ProjectNew />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/einstellungen" element={<Einstellungen />} />
          {/* SEO workflow (Phase 5) */}
          <Route path="/seo" element={<SeoIntegrations />} />
          <Route path="/seo/workflow" element={<SeoWorkflow />} />
          <Route path="/seo/opportunities" element={<SeoOpportunities />} />
          <Route path="/seo/tasks" element={<SeoTasks />} />
          <Route path="/seo/briefs" element={<SeoBriefs />} />
          <Route path="/seo/local" element={<SeoLocal />} />
          <Route path="/seo/reports" element={<SeoReports />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <CookieBanner />
    </ToastProvider>
  );
}

