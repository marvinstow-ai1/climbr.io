import { Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import AuditReport from "./pages/AuditReport";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Pricing from "./pages/Pricing";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import { ToastProvider } from "./components/Toast";

export default function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <header className="glass-nav sticky top-0 z-50">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-ink">
              <span className="inline-block h-6 w-6 rounded-md bg-accent shadow-glow-sm" />
              climbr.io
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link to="/pricing" className="rounded-md px-3 py-1.5 text-ink-muted transition-colors hover:text-ink">Pricing</Link>
              <Link to="/dashboard" className="rounded-md px-3 py-1.5 text-ink-muted transition-colors hover:text-ink">Dashboard</Link>
              <Link to="/login" className="rounded-md px-3 py-1.5 text-ink-muted transition-colors hover:text-ink">Log in</Link>
              <Link to="/signup" className="btn-ghost ml-2">Sign up</Link>
            </div>
          </nav>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects/new" element={<ProjectNew />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/audit/:id" element={<AuditReport />} />
          </Routes>
        </main>

        <footer className="border-t border-line py-8 text-center text-xs text-ink-subtle">
          <p>© {new Date().getFullYear()} climbr.io — Hosted in the EU.</p>
        </footer>
      </div>
    </ToastProvider>
  );
}
