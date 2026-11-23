/**
 * Astro integration: during `astro dev` it serves the admin API at /api/admin/* from this
 * machine's files. It does nothing during `astro build`, so the public site stays fully static.
 */
import type { AstroIntegration } from 'astro';
import { createAdminApi, API_PREFIX } from './server/api';
import { LocalAuth } from './server/local/auth';
import { sendResponse, toRequest } from './server/local/node';
import { PREVIEW_ENV } from './server/local/preview';
import { LocalWorkspace } from './server/local/workspace';

export interface AdminIntegrationOptions { previewPort?: number }

export default function wingnutsAdmin(options: AdminIntegrationOptions = {}): AstroIntegration {
  return {
    name: 'wingnuts-admin',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        if (process.env[PREVIEW_ENV] === '1') return; // the preview server only renders drafts
        const root = process.cwd();
        const handle = createAdminApi({ auth: new LocalAuth(root), workspace: new LocalWorkspace(root, { previewPort: options.previewPort }) });
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith(API_PREFIX + '/') && req.url !== API_PREFIX) return next();
          try {
            await sendResponse(res, await handle(toRequest(req)));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: (e as Error).message }));
          }
        });
        logger.info('Admin ready at /admin/ (local files, drafts in .local/drafts)');
      },
    },
  };
}
