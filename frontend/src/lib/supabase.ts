import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon) : null;

export function ensureSupabase() {
  if (!supabase) {
    // Dump exactly which VITE_* keys Vite did expose, so the user can see
    // whether the .env.local was read at all, and whether the variable
    // names match. Values are not logged.
    const viteKeys = Object.keys(import.meta.env)
      .filter((k) => k.startsWith("VITE_"))
      .sort();
    const detail = [
      `VITE_SUPABASE_URL: ${url ? "set" : "MISSING"}`,
      `VITE_SUPABASE_ANON_KEY: ${anon ? "set" : "MISSING"}`,
      `MODE: ${import.meta.env.MODE}`,
      `All VITE_* keys Vite saw: ${viteKeys.length === 0 ? "(none)" : viteKeys.join(", ")}`,
    ].join(" | ");
    // eslint-disable-next-line no-console
    console.error("[climbr] Supabase env missing —", detail);
    throw new Error(
      `Supabase env vars missing. Expected VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local at the repo root. Diagnostic: ${detail}`,
    );
  }
  return supabase;
}
