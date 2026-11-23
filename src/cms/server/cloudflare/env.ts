/** Typed, validated production configuration. Every value comes from Cloudflare Pages variables or secrets. */
import { z } from 'zod';

export const envSchema = z.object({
  // Sign-in, option 1: Cloudflare Access (both values).
  CF_ACCESS_TEAM_DOMAIN: z.string().url().optional().describe('https://<team>.cloudflareaccess.com'),
  CF_ACCESS_AUD: z.string().min(10).optional().describe('Audience tag of the Access application'),
  // Sign-in, option 2: username + generated password (npm run admin:live-password).
  ADMIN_USERNAME: z.string().min(1).default('admin'),
  ADMIN_PASSWORD_HASH: z.string().regex(/^v1\$[^$]+\$[^$]+$/).optional().describe('Output of npm run admin:live-password'),
  ADMIN_SESSION_SECRET: z.string().min(32).describe('Random string (openssl rand -hex 32)'),
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_PRIVATE_KEY: z.string().min(100).describe('PEM private key of the GitHub App'),
  GITHUB_APP_INSTALLATION_ID: z.string().min(1),
  GITHUB_REPO: z.string().regex(/^[\w.-]+\/[\w.-]+$/).describe('owner/name'),
  GITHUB_BRANCH_MAIN: z.string().min(1).default('main'),
  GITHUB_BRANCH_DRAFTS: z.string().min(1).default('cms-drafts'),
  PREVIEW_BASE_URL: z.string().url().optional().describe('https://cms-drafts.<project>.pages.dev'),
}).refine((env) => Boolean(env.ADMIN_PASSWORD_HASH) || Boolean(env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD), {
  path: ['sign-in'],
  message: 'Set ADMIN_PASSWORD_HASH, or both CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD',
});
export type AdminEnv = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, unknown>): { ok: true; env: AdminEnv } | { ok: false; missing: string[] } {
  const result = envSchema.safeParse(raw);
  if (result.success) return { ok: true, env: result.data };
  return { ok: false, missing: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}
