import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client. Uses the service-role key — NEVER expose to the browser.
export function serverClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in env");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Client scoped to an end-user JWT (RLS applies). Used when we want to act
// "as" the authenticated user from within an edge function.
export function userClient(accessToken: string): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY missing in env");
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// AES-256-GCM encryption for OAuth refresh tokens.
// Web Crypto — edge-runtime compatible.
export async function encryptToken(plaintext: string): Promise<string> {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) throw new Error("TOKEN_ENCRYPTION_KEY missing");
  const keyBytes = hexToBytes(keyHex);
  if (keyBytes.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");

  const key = await crypto.subtle.importKey("raw", keyBytes.buffer as ArrayBuffer, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      plain.buffer as ArrayBuffer,
    ),
  );

  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return bytesToBase64(out);
}

export async function decryptToken(ciphertext: string): Promise<string> {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) throw new Error("TOKEN_ENCRYPTION_KEY missing");
  const keyBytes = hexToBytes(keyHex);
  const all = base64ToBytes(ciphertext);
  const iv = all.slice(0, 12);
  const ct = all.slice(12);
  const key = await crypto.subtle.importKey("raw", keyBytes.buffer as ArrayBuffer, "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    ct.buffer as ArrayBuffer,
  );
  return new TextDecoder().decode(pt);
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToBase64(b: Uint8Array): string {
  let s = "";
  for (const c of b) s += String.fromCharCode(c);
  return btoa(s);
}

function base64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
