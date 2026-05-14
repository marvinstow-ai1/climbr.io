import { useEffect, useState } from "react";
import { ensureSupabase } from "./supabase";

export interface SessionState {
  loading: boolean;
  token: string | null;
  userId: string | null;
  email: string | null;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ loading: true, token: null, userId: null, email: null });

  useEffect(() => {
    let cancelled = false;
    const sb = ensureSupabase();

    void sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const s = data.session;
      setState({
        loading: false,
        token: s?.access_token ?? null,
        userId: s?.user?.id ?? null,
        email: s?.user?.email ?? null,
      });
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setState({
        loading: false,
        token: session?.access_token ?? null,
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
