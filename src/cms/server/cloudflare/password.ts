/**
 * Username + password sign-in for the live site, for teams that do not use Cloudflare Access.
 * Runs on Cloudflare Pages Functions, so it only uses Web Crypto.
 *
 * The password is generated (npm run admin:live-password) and is long and random, so it is stored as a
 * salted HMAC rather than a slow hash: guessing it is infeasible, and the free Functions CPU budget is small.
 */
import { base64url, hmacSha256, timingSafeEqualString, utf8 } from '../security';
import { AdminError, type AuthContext, type AuthProvider } from '../types';

export interface PasswordConfig { username: string; passwordHash: string; sessionSecret: string }

const COOKIE = '__Host-wn_admin';
const SESSION_HOURS = 12;

/** Stored form: v1$<salt>$<mac>. */
export async function hashLivePassword(password: string, salt: string): Promise<string> {
  return `v1$${salt}$${await hmacSha256(salt, `password:${password.normalize('NFKC')}`)}`;
}

async function passwordMatches(password: string, stored: string): Promise<boolean> {
  const [version, salt, mac] = stored.split('$');
  if (version !== 'v1' || !salt || !mac) return false;
  return timingSafeEqualString(await hashLivePassword(password, salt), stored);
}

/** Best-effort throttle. Memory is per server instance, so the real protection is the password length. */
const attempts = new Map<string, { count: number; until: number }>();

const cookieOptions = 'Path=/; Secure; HttpOnly; SameSite=Strict';
const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export class PasswordAuth implements AuthProvider {
  readonly mode = 'password' as const;
  constructor(private config: PasswordConfig) {}

  private sign(payload: string) { return hmacSha256(this.config.sessionSecret, `session:${payload}`); }

  async authenticate(request: Request): Promise<AuthContext | null> {
    const value = request.headers.get('cookie')?.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
    if (!value) return null;
    const [payload, sig] = value.split('.');
    if (!payload || !sig || !timingSafeEqualString(await this.sign(payload), sig)) return null;
    let session: { u: string; exp: number; n: string };
    try { session = JSON.parse(utf8.decode(base64url.decode(payload))); } catch { return null; }
    if (typeof session.exp !== 'number' || session.exp < Date.now() || session.u !== this.config.username || !session.n) return null;
    return { user: { name: session.u }, csrfToken: await hmacSha256(this.config.sessionSecret, `csrf:${session.n}`) };
  }

  async login(request: Request, body: { username?: string; password?: string }): Promise<Response> {
    const who = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const now = Date.now();
    const lock = attempts.get(who);
    if (lock && lock.count >= 5 && lock.until > now) throw new AdminError(429, 'Too many tries. Wait a minute and try again.');
    const { username = '', password = '' } = body ?? {};
    const userOk = timingSafeEqualString(String(username).trim().toLowerCase(), this.config.username.toLowerCase());
    const passOk = await passwordMatches(String(password), this.config.passwordHash);
    if (!userOk || !passOk) {
      if (attempts.size > 5000) attempts.clear();
      attempts.set(who, { count: (lock && lock.until > now ? lock.count : 0) + 1, until: now + 60_000 });
      throw new AdminError(401, 'That username or password is not right.');
    }
    attempts.delete(who);
    const nonce = base64url.encode(crypto.getRandomValues(new Uint8Array(16)));
    const payload = base64url.encode(utf8.encode(JSON.stringify({ u: this.config.username, exp: now + SESSION_HOURS * 3600_000, n: nonce })));
    const cookie = `${COOKIE}=${payload}.${await this.sign(payload)}; ${cookieOptions}; Max-Age=${SESSION_HOURS * 3600}`;
    const csrfToken = await hmacSha256(this.config.sessionSecret, `csrf:${nonce}`);
    return new Response(JSON.stringify({ mode: this.mode, user: { name: this.config.username }, csrfToken }), { status: 200, headers: { ...jsonHeaders, 'set-cookie': cookie } });
  }

  async logout(): Promise<Response> {
    return new Response(JSON.stringify({ ok: true }), { headers: { ...jsonHeaders, 'set-cookie': `${COOKIE}=; ${cookieOptions}; Max-Age=0` } });
  }
}
