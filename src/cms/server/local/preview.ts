/** Starts a second Astro dev server that renders the draft mirror in .local/preview (see workspace.ts). */
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

export const PREVIEW_ENV = 'WINGNUTS_PREVIEW';
let child: ChildProcess | undefined;
let starting: Promise<number | null> | undefined;

async function responds(port: number): Promise<boolean> {
  try { await fetch(`http://localhost:${port}/en/`, { redirect: 'manual' }); return true; } catch { return false; }
}

export function ensurePreviewServer(root: string, port: number): Promise<number | null> {
  if (child && !child.killed && child.exitCode === null) return Promise.resolve(port);
  if (starting) return starting;
  starting = (async () => {
    if (await responds(port)) return port; // already running from an earlier session
    const bin = resolve(root, 'node_modules/astro/bin/astro.mjs');
    child = spawn(process.execPath, [bin, 'dev', '--port', String(port)], {
      cwd: root, env: { ...process.env, [PREVIEW_ENV]: '1' }, stdio: ['ignore', 'ignore', 'inherit'],
    });
    child.on('exit', () => { child = undefined; });
    const stop = () => child?.kill();
    process.once('exit', stop); process.once('SIGINT', stop); process.once('SIGTERM', stop);
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await responds(port)) return port;
      if (child.exitCode !== null) break;
    }
    return null;
  })().finally(() => { starting = undefined; });
  return starting;
}
