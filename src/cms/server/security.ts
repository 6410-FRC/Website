/** Request hygiene shared by every adapter: body limits, origin/CSRF checks, filenames, file types. */
import { AdminError } from './types';

export const JSON_LIMIT = 1024 * 1024; // 1 MB for text edits
export const UPLOAD_LIMIT = 5 * 1024 * 1024; // 5 MB per picture or PDF

export async function readBody(request: Request, limit: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > limit) throw new AdminError(413, `That file is too large. The limit is ${Math.round(limit / 1024 / 1024)} MB.`);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel().catch(() => {}); throw new AdminError(413, `That is too large. The limit is ${Math.round(limit / 1024 / 1024)} MB.`); }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.byteLength; }
  return out;
}

export async function readJson<T = unknown>(request: Request): Promise<T> {
  const bytes = await readBody(request, JSON_LIMIT);
  try { return JSON.parse(new TextDecoder().decode(bytes)) as T; }
  catch { throw new AdminError(400, 'The request could not be read.'); }
}

/** Mutating requests must come from our own pages. Blocks cross-site form posts and stray navigations. */
export function assertSameOrigin(request: Request): void {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw new AdminError(403, 'Blocked: request came from another site.');
  const origin = request.headers.get('origin');
  if (origin) {
    const expected = new URL(request.url).origin;
    if (origin !== expected) throw new AdminError(403, 'Blocked: request came from another site.');
  }
}

export function assertCsrf(request: Request, expected: string): void {
  const given = request.headers.get('x-csrf-token') ?? '';
  if (!given || !timingSafeEqualString(given, expected)) throw new AdminError(403, 'Your session needs a refresh. Reload the page and try again.');
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i % x.length] ?? 0) ^ (y[i % y.length] ?? 0);
  return diff === 0;
}

/** Only these files may be uploaded. Types are checked by content, not by the name alone. */
export const IMAGE_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
export const FILE_TYPES: Record<string, string> = { ...IMAGE_TYPES, pdf: 'application/pdf' };

/** Lowercase ASCII file name with a safe extension; never a path. */
export function sanitizeFilename(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  const ext = (dot > 0 ? base.slice(dot + 1) : '').toLowerCase();
  if (!FILE_TYPES[ext]) throw new AdminError(415, 'Use a JPG, PNG, WebP, GIF or SVG picture, or a PDF.');
  const stem = (dot > 0 ? base.slice(0, dot) : base)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
  return `${stem}.${ext === 'jpeg' ? 'jpg' : ext}`;
}

/** Sniff the real type of an upload and make sure it matches the extension. */
export function detectFileType(bytes: Uint8Array, filename: string): string {
  const ext = filename.split('.').pop()!;
  const b = bytes;
  const startsWith = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  const head = new TextDecoder('utf-8', { fatal: false }).decode(b.subarray(0, 512)).trimStart();
  let actual: string | undefined;
  if (startsWith(0xff, 0xd8, 0xff)) actual = 'jpg';
  else if (startsWith(0x89, 0x50, 0x4e, 0x47)) actual = 'png';
  else if (startsWith(0x47, 0x49, 0x46, 0x38)) actual = 'gif';
  else if (startsWith(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) actual = 'webp';
  else if (startsWith(0x25, 0x50, 0x44, 0x46)) actual = 'pdf';
  else if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) actual = 'svg';
  if (!actual || actual !== ext) throw new AdminError(415, 'The file does not look like a valid picture or PDF. Save it again from your photo app and retry.');
  if (actual === 'svg') {
    const text = new TextDecoder().decode(b);
    if (/<script|\bon[a-z]+\s*=|javascript:|<foreignObject|<iframe|<embed|<object/i.test(text)) throw new AdminError(415, 'This SVG contains scripting and cannot be used. Export it again as a plain SVG.');
  }
  return FILE_TYPES[actual]!;
}

/** Repo-relative path safety: no absolute paths, no `..`, no odd characters. */
export function assertSafePath(path: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(path) || path.split('/').some((p) => p === '..' || p === '.' || p === '')) {
    throw new AdminError(400, 'That location is not allowed.');
  }
  return path;
}

export function slugify(text: string): string {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export const base64url = {
  encode(bytes: Uint8Array): string {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode(text: string): Uint8Array {
    const s = atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '='));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  },
};
export const utf8 = { encode: (s: string) => new TextEncoder().encode(s), decode: (b: Uint8Array) => new TextDecoder().decode(b) };

export async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', utf8.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url.encode(new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8.encode(message))));
}
