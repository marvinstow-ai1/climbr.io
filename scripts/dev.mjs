// Spawns Vite (frontend) and `vercel dev` (api functions on :3000) side by
// side so `npm run dev` is a single command. Vite proxies /api/* to :3000
// via its server.proxy config — see frontend/vite.config.ts.
//
// We pin vercel dev to :3000 because the vite proxy target is hard-coded
// there. Open the Vite URL (default :5173, or the Codespaces forwarded
// host for that port) in the browser — NOT the :3000 URL.

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load .env.local into process.env BEFORE spawning children so both vite
// and vercel dev inherit the values. We do this explicitly because
// `vercel dev` against a linked Vercel project can override the local
// .env.local with empty cloud values, which breaks the edge function
// runtime (e.g. serverClient() throws "SUPABASE_URL missing").
loadDotEnv(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"));

function loadDotEnv(path) {
  if (!existsSync(path)) {
    console.warn(`\x1b[31m[dev]\x1b[0m ${path} not found — API will likely fail with "missing env".`);
    return;
  }
  const raw = readFileSync(path, "utf8");
  let loaded = 0;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
      loaded++;
    }
  }
  console.log(`\x1b[33m[dev]\x1b[0m loaded ${loaded} vars from ${path}`);
}

const children = [];

function start(name, cmd, args, color) {
  const child = spawn(cmd, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m`;
  child.stdout.on("data", (b) => process.stdout.write(prefixLines(prefix, b)));
  child.stderr.on("data", (b) => process.stderr.write(prefixLines(prefix, b)));
  child.on("exit", (code, signal) => {
    console.log(`${prefix} exited (code=${code} signal=${signal})`);
    shutdown(code ?? 1);
  });
  children.push(child);
  return child;
}

function prefixLines(prefix, buf) {
  return buf
    .toString("utf8")
    .split("\n")
    .map((l, i, a) => (i === a.length - 1 && l === "" ? "" : `${prefix} ${l}\n`))
    .join("");
}

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    if (!c.killed) {
      try { c.kill("SIGTERM"); } catch { /* ignore */ }
    }
  }
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("\x1b[33m[dev]\x1b[0m starting Vite (frontend) + Vercel (api on :3000)");
console.log("\x1b[33m[dev]\x1b[0m OPEN THE VITE URL — the one on :5173 (or its Codespaces forward), NOT :3000.\n");

start("api ", "npx", ["vercel", "dev", "--listen", "3000", "--yes"], "36");
start("vite", "npm", ["--prefix", "frontend", "run", "dev"], "35");
