import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			// The whole site is built to plain files in dist/ (see src/routes/+layout.ts).
			adapter: adapter({ pages: 'dist', assets: 'dist', fallback: '404.html' }),
			prerender: {
				// News stories only get their own page once they have text, so that route can be empty.
				handleUnseenRoutes: 'ignore'
			}
		})
	]
});
