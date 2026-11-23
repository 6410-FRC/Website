import { error } from '@sveltejs/kit';
import { loadPage } from '#lib/server/pages.ts';
import { isLocale, locales, pageFromSlug, routes } from '#lib/site.ts';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () => locales.flatMap((lang) => Object.values(routes[lang]).map((slug) => ({ lang, slug })));

export const load = ({ params }) => {
	const key = isLocale(params.lang) ? pageFromSlug(params.lang, params.slug) : undefined;
	if (!isLocale(params.lang) || !key) error(404, 'Not found');
	const view = loadPage(key, params.lang);
	return { view, meta: { title: view.c.title, description: view.c.intro, page: key } };
};
