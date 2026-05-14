// Spawns Vite (frontend) and `vercel dev` (api functions on :3000) side by
// side so `npm run dev` is a single command. Vite proxies /api/* to :3000
// via its server.proxy config — see frontend/vite.config.ts.
//
// We pin vercel dev to :3000 because the vite proxy target is hard-coded
// there. Open the Vite URL (default :5173, or the Codespaces forwarded
// host for that port) in the browser — NOT the :3000 URL.

import { spawn } from "node:child_process";

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
