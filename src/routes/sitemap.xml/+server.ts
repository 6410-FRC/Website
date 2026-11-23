import { getNews } from '#lib/server/content.ts';
import { SITE_URL, locales, routeFor, routes, type PageKey } from '#lib/site.ts';

export const prerender = true;

export function GET() {
	const paths = locales.flatMap((locale) => [
		routeFor(locale),
		...(Object.keys(routes[locale]) as PageKey[]).map((page) => routeFor(locale, page)),
		...getNews(locale).flatMap((post) => (post.url ? [post.url] : []))
	]);
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n')}\n</urlset>\n`;
	return new Response(body, { headers: { 'content-type': 'application/xml' } });
}
