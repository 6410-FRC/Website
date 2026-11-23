/**
 * The admin API. One function that takes a standard Request and returns a Response,
 * so the same code runs inside the Astro dev server (local) and Cloudflare Pages Functions (production).
 */
import { deleteDoc, deleteUpload, loadSnapshot, pathsForIds, readUpload, saveDoc, storeUpload } from './content';
import { UPLOAD_LIMIT, assertCsrf, assertSameOrigin, readBody, readJson } from './security';
import { AdminError, type AuthProvider, type Workspace } from './types';

export const API_PREFIX = '/api/admin';

export interface AdminApiOptions { auth: AuthProvider; workspace: Workspace; }

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export function createAdminApi({ auth, workspace }: AdminApiOptions): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      return await route(request, auth, workspace);
    } catch (e) {
      if (e instanceof AdminError) return json({ error: e.message, details: e.details }, e.status);
      console.error('[admin]', e);
      return json({ error: 'Something went wrong on the server. Try again in a moment.' }, 500);
    }
  };
}

async function route(request: Request, auth: AuthProvider, ws: Workspace): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(API_PREFIX)) throw new AdminError(404, 'Not found.');
  const path = url.pathname.slice(API_PREFIX.length).replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();
  const unsafe = method !== 'GET' && method !== 'HEAD';
  if (unsafe) assertSameOrigin(request);

  // Sign-in endpoints (local mode only; production identity comes from Cloudflare Access).
  if (path === '/login' && method === 'POST') {
    if (!auth.login) throw new AdminError(404, 'Sign-in is handled by Cloudflare Access on the live site.');
    return auth.login(request, await readJson(request));
  }
  if (path === '/logout' && method === 'POST') {
    if (!auth.logout) throw new AdminError(404, 'Sign-out is handled by Cloudflare Access on the live site.');
    return auth.logout(request);
  }

  const session = await auth.authenticate(request);
  if (path === '/session' && method === 'GET') {
    return session ? json({ mode: auth.mode, user: session.user, csrfToken: session.csrfToken }) : json({ error: 'Please sign in.', mode: auth.mode }, 401);
  }
  if (!session) throw new AdminError(401, 'Please sign in.');
  if (unsafe) assertCsrf(request, session.csrfToken);

  if (path === '/content' && method === 'GET') return json(await loadSnapshot(ws));

  const doc = path.match(/^\/docs\/(.+)$/);
  if (doc) {
    const id = decodeURIComponent(doc[1]!);
    if (method === 'PUT') {
      const body = await readJson<{ data?: unknown }>(request);
      return json({ doc: await saveDoc(ws, id, body?.data) });
    }
    if (method === 'DELETE') { await deleteDoc(ws, id); return json({ ok: true }); }
  }

  if (path === '/publish' && method === 'POST') {
    const body = await readJson<{ ids?: string[]; all?: boolean }>(request);
    const ids = body.all ? (await loadSnapshot(ws)).pending : Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string') : [];
    const paths = await pathsForIds(ws, ids);
    if (paths.length) await ws.publish(paths, `Publish ${describe(ids)} (${session.user.name})`);
    return json({ ok: true, published: paths.length });
  }
  if (path === '/discard' && method === 'POST') {
    const body = await readJson<{ ids?: string[] }>(request);
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string') : [];
    await ws.discard(await pathsForIds(ws, ids));
    return json({ ok: true });
  }

  if (path === '/uploads' && method === 'POST') {
    const name = request.headers.get('x-file-name') ?? '';
    const replace = request.headers.get('x-replace') === '1';
    const bytes = await readBody(request, UPLOAD_LIMIT);
    return json({ upload: await storeUpload(ws, decodeURIComponent(name), bytes, replace) });
  }
  const upload = path.match(/^\/uploads\/([^/]+)$/);
  if (upload) {
    const name = decodeURIComponent(upload[1]!);
    if (method === 'GET') {
      const file = await readUpload(ws, name);
      if (!file) throw new AdminError(404, 'File not found.');
      return new Response(file.bytes as unknown as BodyInit, { headers: { 'content-type': file.type, 'cache-control': 'private, max-age=60', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'", 'x-content-type-options': 'nosniff' } });
    }
    if (method === 'DELETE') { await deleteUpload(ws, name); return json({ ok: true }); }
  }

  if (path === '/preview' && method === 'GET') {
    const page = url.searchParams.get('path') ?? '/';
    if (!/^\/[A-Za-z0-9\/_-]*$/.test(page)) throw new AdminError(400, 'Unknown page.');
    return json(await ws.previewUrl(page));
  }

  throw new AdminError(404, 'Not found.');
}

function describe(ids: string[]): string {
  if (ids.length === 1) return ids[0]!;
  return `${ids.length} items`;
}
