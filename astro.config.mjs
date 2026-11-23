import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import wingnutsAdmin from './src/cms/integration';
import { fromRoot, isPreviewServer } from './src/cms/content-root';

export default defineConfig({
  site: 'https://wingnuts6410.org',
  output: 'static',
  integrations: [react(), wingnutsAdmin({ previewPort: 4322 }), sitemap({ filter: (page) => !page.includes('/admin') })],
  vite: { plugins: [tailwindcss()] },
  // The draft preview server (started from the admin) renders the mirror in .local/preview.
  ...(isPreviewServer ? { publicDir: fromRoot('public'), cacheDir: '.local/preview/.astro-cache' } : {}),
});
