/**
 * Cloudflare Pages Function: serves /api/admin/* in production.
 * Static pages are never routed here (see public/_routes.json).
 */
import { createAdminApi } from '../../../src/cms/server/api';
import { CloudflareAccessAuth } from '../../../src/cms/server/cloudflare/access';
import { parseEnv } from '../../../src/cms/server/cloudflare/env';
import { PasswordAuth } from '../../../src/cms/server/cloudflare/password';
import { GitHubClient } from '../../../src/cms/server/github/app';
import { GitHubWorkspace } from '../../../src/cms/server/github/workspace';

interface PagesContext { request: Request; env: Record<string, unknown> }

let cached: { key: string; handle: (request: Request) => Promise<Response> } | undefined;

function build(raw: Record<string, unknown>) {
  const key = JSON.stringify(Object.keys(raw).sort());
  if (cached?.key === key) return cached.handle;
  const parsed = parseEnv(raw);
  const handle = parsed.ok
    ? createAdminApi({
        auth: parsed.env.ADMIN_PASSWORD_HASH
          ? new PasswordAuth({ username: parsed.env.ADMIN_USERNAME, passwordHash: parsed.env.ADMIN_PASSWORD_HASH, sessionSecret: parsed.env.ADMIN_SESSION_SECRET })
          : new CloudflareAccessAuth({ teamDomain: parsed.env.CF_ACCESS_TEAM_DOMAIN!, audience: parsed.env.CF_ACCESS_AUD!, sessionSecret: parsed.env.ADMIN_SESSION_SECRET }),
        workspace: new GitHubWorkspace(
          new GitHubClient({ appId: parsed.env.GITHUB_APP_ID, privateKey: parsed.env.GITHUB_APP_PRIVATE_KEY, installationId: parsed.env.GITHUB_APP_INSTALLATION_ID, repo: parsed.env.GITHUB_REPO }),
          { mainBranch: parsed.env.GITHUB_BRANCH_MAIN, draftBranch: parsed.env.GITHUB_BRANCH_DRAFTS, previewBaseUrl: parsed.env.PREVIEW_BASE_URL },
        ),
      })
    : async () => new Response(JSON.stringify({ error: 'The admin is not configured on this site yet. Ask the website developer to finish the Cloudflare setup.', details: parsed.missing }), { status: 503, headers: { 'content-type': 'application/json' } });
  cached = { key, handle };
  return handle;
}

export const onRequest = async (context: PagesContext): Promise<Response> => build(context.env)(context.request);
