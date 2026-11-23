/** One news story: /en/news/<file-name>/ or /es/noticias/<file-name>/. Only stories with text get a page. */
import { error } from '@sveltejs/kit';
import { getNews, getPage } from '#lib/server/content.ts';
import { isLocale, locales, routes } from '#lib/site.ts';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () =>
	locales.flatMap((lang) => getNews(lang).filter((post) => post.url).map((post) => ({ lang, slug: routes[lang].news, post: post.slug })));

export const load = ({ params }) => {
	const locale = isLocale(params.lang) && params.slug === routes[params.lang].news ? params.lang : undefined;
	const post = locale && getNews(locale).find((p) => p.slug === params.post && p.url);
	if (!locale || !post) error(404, 'Not found');
	const { title, summary, category, photo, dateLabel, html, url } = post;
	return {
		post: { title, summary, photo, dateLabel, html, categoryLabel: getPage('news', locale).categories[category] },
		meta: { title, description: summary, page: 'news' as const, path: url, image: photo?.src }
	};
};
