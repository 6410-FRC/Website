/**
 * Local sign-in for `npm run dev`. The password hash and session secret live in
 * .local/admin-auth.json (gitignored), created by `npm run admin:setup`.
 * This is NOT the production sign-in; on Cloudflare, Access identifies editors.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { base64url, hmacSha256, utf8 } from '../security';
import { AdminError, type AuthContext, type AuthProvider } from '../types';

export const AUTH_FILE = '.local/admin-auth.json';
const COOKIE = 'wn_admin';
const SESSION_HOURS = 12;

export interface LocalAuthFile { username: string; salt: string; hash: string; sessionSecret: string; keyLength?: number }

export function hashPassword(password: string, salt: string, keyLength = 64): string {
  return scryptSync(password.normalize('NFKC'), Buffer.from(salt, 'hex'), keyLength, { N: 16384, r: 8, p: 1 }).toString('hex');
}
export function newAuthFile(username: string, password: string): LocalAuthFile {
  const salt = randomBytes(16).toString('hex');
  return { username, salt, hash: hashPassword(password, salt), sessionSecret: randomBytes(32).toString('hex'), keyLength: 64 };
}

const attempts = new Map<string, { count: number; until: number }>();

export class LocalAuth implements AuthProvider {
  readonly mode = 'local' as const;
  private config?: LocalAuthFile;
  constructor(private root: string) {}

  private async load(): Promise<LocalAuthFile> {
    if (this.config) return this.config;
    try {
      const parsed = JSON.parse(await readFile(join(this.root, AUTH_FILE), 'utf8')) as LocalAuthFile;
      if (!parsed.username || !parsed.salt || !parsed.hash || !parsed.sessionSecret) throw new Error('incomplete');
      return (this.config = parsed);
    } catch {
      throw new AdminError(503, 'Local sign-in is not set up yet. In the terminal, run: npm run admin:setup');
    }
  }

  private async sign(payload: string, secret: string) { return hmacSha256(secret, `session:${payload}`); }

  async authenticate(request: Request): Promise<AuthContext | null> {
    const cookie = request.headers.get('cookie') ?? '';
    const value = cookie.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
    if (!value) return null;
    const [payload, sig] = value.split('.');
    if (!payload || !sig) return null;
    let config: LocalAuthFile;
    try { config = await this.load(); } catch { return null; }
    if ((await this.sign(payload, config.sessionSecret)) !== sig) return null;
    let session: { u: string; exp: number; n: string };
    try { session = JSON.parse(utf8.decode(base64url.decode(payload))); } catch { return null; }
    if (session.exp < Date.now() || session.u !== config.username) return null;
    return { user: { name: session.u }, csrfToken: await hmacSha256(config.sessionSecret, `csrf:${session.n}`) };
  }

  async login(request: Request, body: { username?: string; password?: string }): Promise<Response> {
    const config = await this.load();
    const key = request.headers.get('x-forwarded-for') ?? 'local';
    const lock = attempts.get(key);
    if (lock && lock.count >= 5 && lock.until > Date.now()) throw new AdminError(429, 'Too many tries. Wait a minute and try again.');
    const { username = '', password = '' } = body ?? {};
    const given = Buffer.from(hashPassword(String(password), config.salt, config.keyLength ?? 64), 'hex');
    const expected = Buffer.from(config.hash, 'hex');
    const ok = String(username).trim().toLowerCase() === config.username.toLowerCase() && given.length === expected.length && timingSafeEqual(given, expected);
    if (!ok) {
      const cur = attempts.get(key);
      attempts.set(key, { count: (cur && cur.until > Date.now() ? cur.count : 0) + 1, until: Date.now() + 60_000 });
      throw new AdminError(401, 'That username or password is not right.');
    }
    attempts.delete(key);
    const payload = base64url.encode(utf8.encode(JSON.stringify({ u: config.username, exp: Date.now() + SESSION_HOURS * 3600_000, n: randomBytes(16).toString('hex') })));
    const cookie = `${COOKIE}=${payload}.${await this.sign(payload, config.sessionSecret)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${secure(request)}`;
    const ctx = await this.authenticate(new Request(request.url, { headers: { cookie } }));
    return new Response(JSON.stringify({ mode: this.mode, user: ctx?.user, csrfToken: ctx?.csrfToken }), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': cookie, 'cache-control': 'no-store' } });
  }

  async logout(request: Request): Promise<Response> {
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure(request)}` } });
  }
}

const secure = (request: Request) => (new URL(request.url).protocol === 'https:' ? '; Secure' : '');
