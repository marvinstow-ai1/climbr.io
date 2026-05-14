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
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-ink">
              <span className="inline-block h-7 w-7 rounded-md bg-primary" />
              climbr.io
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <Link to="/pricing" className="text-slate2 hover:text-ink">Pricing</Link>
              <Link to="/dashboard" className="text-slate2 hover:text-ink">Dashboard</Link>
              <Link to="/login" className="text-slate2 hover:text-ink">Log in</Link>
              <Link to="/signup" className="btn-ghost">Sign up</Link>
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

        <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate2">
          <p>© {new Date().getFullYear()} climbr.io — Hosted in the EU.</p>
        </footer>
      </div>
    </ToastProvider>
  );
}
