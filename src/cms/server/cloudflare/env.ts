/** Typed, validated production configuration. Every value comes from Cloudflare Pages variables or secrets. */
import { z } from 'zod';

export const envSchema = z.object({
  CF_ACCESS_TEAM_DOMAIN: z.string().url().describe('https://<team>.cloudflareaccess.com'),
  CF_ACCESS_AUD: z.string().min(10).describe('Audience tag of the Access application'),
  ADMIN_SESSION_SECRET: z.string().min(32).describe('Random string (openssl rand -hex 32)'),
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_PRIVATE_KEY: z.string().min(100).describe('PEM private key of the GitHub App'),
  GITHUB_APP_INSTALLATION_ID: z.string().min(1),
  GITHUB_REPO: z.string().regex(/^[\w.-]+\/[\w.-]+$/).describe('owner/name'),
  GITHUB_BRANCH_MAIN: z.string().min(1).default('main'),
  GITHUB_BRANCH_DRAFTS: z.string().min(1).default('cms-drafts'),
  PREVIEW_BASE_URL: z.string().url().optional().describe('https://cms-drafts.<project>.pages.dev'),
});
export type AdminEnv = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, unknown>): { ok: true; env: AdminEnv } | { ok: false; missing: string[] } {
  const result = envSchema.safeParse(raw);
  if (result.success) return { ok: true, env: result.data };
  return { ok: false, missing: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}
