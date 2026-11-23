/**
 * Minimal GitHub App client for Workers: signs the app JWT with WebCrypto, exchanges it
 * for an installation token (cached in memory), and wraps REST + GraphQL calls.
 */
import { base64url, utf8 } from '../security';
import { AdminError } from '../types';

export interface GitHubAppConfig { appId: string; privateKey: string; installationId: string; repo: string; userAgent?: string }

const API = 'https://api.github.com';

export class GitHubClient {
  private token?: { value: string; expires: number };
  private key?: CryptoKey;
  readonly owner: string;
  readonly name: string;
  constructor(private config: GitHubAppConfig) {
    const [owner, name] = config.repo.split('/');
    if (!owner || !name) throw new AdminError(500, 'GITHUB_REPO must look like owner/name.');
    this.owner = owner; this.name = name;
  }

  private async signingKey(): Promise<CryptoKey> {
    if (this.key) return this.key;
    const pem = this.config.privateKey.replace(/\\n/g, '\n');
    const isPkcs1 = /BEGIN RSA PRIVATE KEY/.test(pem);
    const der = base64url.decode(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '').replace(/\+/g, '-').replace(/\//g, '_'));
    const pkcs8 = isPkcs1 ? wrapPkcs1(der) : der;
    this.key = await crypto.subtle.importKey('pkcs8', pkcs8 as unknown as BufferSource, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    return this.key;
  }

  private async appJwt(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url.encode(utf8.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
    const payload = base64url.encode(utf8.encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: this.config.appId })));
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await this.signingKey(), utf8.encode(`${header}.${payload}`));
    return `${header}.${payload}.${base64url.encode(new Uint8Array(sig))}`;
  }

  async installationToken(): Promise<string> {
    if (this.token && this.token.expires > Date.now() + 60_000) return this.token.value;
    const res = await fetch(`${API}/app/installations/${this.config.installationId}/access_tokens`, {
      method: 'POST', headers: { authorization: `Bearer ${await this.appJwt()}`, accept: 'application/vnd.github+json', 'user-agent': this.ua(), 'x-github-api-version': '2022-11-28' },
    });
    if (!res.ok) throw new AdminError(502, `GitHub sign-in failed (${res.status}). Check the GitHub App settings.`);
    const data = (await res.json()) as { token: string; expires_at: string };
    this.token = { value: data.token, expires: new Date(data.expires_at).getTime() };
    return data.token;
  }

  private ua() { return this.config.userAgent ?? 'wingnuts-admin'; }

  async rest<T = unknown>(path: string, init: RequestInit & { allow404?: boolean } = {}): Promise<T> {
    const res = await fetch(`${API}/repos/${this.owner}/${this.name}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${await this.installationToken()}`, accept: 'application/vnd.github+json', 'user-agent': this.ua(), 'x-github-api-version': '2022-11-28', ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) },
    });
    if (res.status === 404 && init.allow404) return null as T;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AdminError(502, `GitHub request failed (${res.status}) on ${path}: ${text.slice(0, 200)}`);
    }
    return res.status === 204 ? (null as T) : ((await res.json()) as T);
  }

  async graphql<T = unknown>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${API}/graphql`, {
      method: 'POST', body: JSON.stringify({ query, variables }),
      headers: { authorization: `Bearer ${await this.installationToken()}`, 'content-type': 'application/json', 'user-agent': this.ua() },
    });
    const data = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (!res.ok || data.errors?.length) throw new AdminError(502, `GitHub query failed: ${data.errors?.[0]?.message ?? res.status}`);
    return data.data as T;
  }
}

/** PKCS#1 RSAPrivateKey → PKCS#8 PrivateKeyInfo (WebCrypto only imports PKCS#8). */
function wrapPkcs1(pkcs1: Uint8Array): Uint8Array {
  const len = (n: number) => (n < 0x80 ? [n] : n < 0x100 ? [0x81, n] : [0x82, n >> 8, n & 0xff]);
  const algorithm = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octet = [0x04, ...len(pkcs1.length)];
  const inner = [0x02, 0x01, 0x00, ...algorithm, ...octet];
  const total = inner.length + pkcs1.length;
  return new Uint8Array([0x30, ...len(total), ...inner, ...pkcs1]);
}
