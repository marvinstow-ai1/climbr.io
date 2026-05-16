import { type ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ensureSupabase } from "../../lib/supabase";

interface Props {
  children: ReactNode;
}

/**
 * Versteckt die Landing-Page solange climbr.io nicht öffentlich gelauncht ist.
 *
 * Verhalten:
 *   - User ohne Session → Redirect auf /login
 *   - User mit Session → Redirect auf /dashboard
 *
 * Die eigentliche Landing-Page wird also nie gerendert. Sobald wir
 * öffentlich launchen, kann der Guard durch ein einfaches Entfernen
 * dieser Komponente in App.tsx entfernt werden — die Landing-Komponente
 * selbst bleibt unverändert erhalten.
 */
export function ComingSoonGuard({ children }: Props) {
  const [decided, setDecided] = useState<"loading" | "anon" | "authed">("loading");

  useEffect(() => {
    const sb = ensureSupabase();
    let cancelled = false;
    void sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setDecided(data.session ? "authed" : "anon");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (decided === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate2">
        Lade…
      </div>
    );
  }

  if (decided === "anon") {
    return <Navigate to="/login" replace />;
  }

  if (decided === "authed") {
    return <Navigate to="/dashboard" replace />;
  }

  // Defensiver Fallback — sollte nie erreicht werden, hält aber die Landing
  // erreichbar, falls jemand den Guard manuell deaktivieren möchte.
  return <>{children}</>;
}
