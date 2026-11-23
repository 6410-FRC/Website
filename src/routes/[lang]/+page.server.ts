import { getNews, getPage, getSponsors, newsCard } from '#lib/server/content.ts';
import { isLocale, locales } from '#lib/site.ts';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () => locales.map((lang) => ({ lang }));

export const load = ({ params }) => {
	const locale = isLocale(params.lang) ? params.lang : 'en';
	const c = getPage('home', locale);
	const { categories, soonLabel, note } = getPage('news', locale);
	return {
		c,
		news: { categories, soonLabel, note },
		posts: getNews(locale).slice(0, 3).map(newsCard),
		sponsors: getSponsors(),
		meta: { title: c.title, description: c.description }
	};
};
