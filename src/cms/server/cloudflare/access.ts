/** Verifies the Cloudflare Access JWT that Access attaches to every request it lets through. */
import { base64url, utf8 } from '../security';
import { AdminError, type AuthContext, type AuthProvider } from '../types';
import { hmacSha256 } from '../security';

export interface AccessConfig { teamDomain: string; audience: string; sessionSecret: string }

interface Jwk extends JsonWebKey { kid: string }
let certs: { at: number; keys: Jwk[] } | undefined;

async function keys(teamDomain: string): Promise<Jwk[]> {
  if (certs && Date.now() - certs.at < 3600_000) return certs.keys;
  const res = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new AdminError(502, 'Could not reach Cloudflare Access to verify your sign-in.');
  const data = (await res.json()) as { keys: Jwk[] };
  certs = { at: Date.now(), keys: data.keys };
  return certs.keys;
}

export async function verifyAccessJwt(token: string, config: AccessConfig): Promise<{ email?: string; sub: string; name?: string }> {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) throw new AdminError(401, 'Please sign in.');
  const header = JSON.parse(utf8.decode(base64url.decode(h))) as { alg: string; kid: string };
  if (header.alg !== 'RS256') throw new AdminError(401, 'Please sign in.');
  const jwk = (await keys(config.teamDomain)).find((k) => k.kid === header.kid);
  if (!jwk) { certs = undefined; throw new AdminError(401, 'Your sign-in has expired. Reload the page.'); }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64url.decode(s) as unknown as BufferSource, utf8.encode(`${h}.${p}`));
  if (!ok) throw new AdminError(401, 'Please sign in.');
  const claims = JSON.parse(utf8.decode(base64url.decode(p))) as { aud: string | string[]; iss: string; exp: number; nbf?: number; email?: string; sub: string; name?: string };
  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(config.audience) || claims.iss !== config.teamDomain || claims.exp < now || (claims.nbf && claims.nbf > now + 60)) throw new AdminError(401, 'Please sign in.');
  return claims;
}

export class CloudflareAccessAuth implements AuthProvider {
  readonly mode = 'cloudflare' as const;
  constructor(private config: AccessConfig) {}
  async authenticate(request: Request): Promise<AuthContext | null> {
    const token = request.headers.get('cf-access-jwt-assertion') ?? request.headers.get('cookie')?.split(/;\s*/).find((c) => c.startsWith('CF_Authorization='))?.slice('CF_Authorization='.length);
    if (!token) return null;
    try {
      const claims = await verifyAccessJwt(token, this.config);
      const name = claims.email ?? claims.name ?? claims.sub;
      return { user: { name, email: claims.email }, csrfToken: await hmacSha256(this.config.sessionSecret, `csrf:${claims.sub}:${claims.email ?? ''}`) };
    } catch (e) {
      if (e instanceof AdminError && e.status === 401) return null;
      throw e;
    }
  }
}
