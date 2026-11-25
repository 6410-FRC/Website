/** Gathers what each inner page (Team, Robots, …) needs from src/content/. */
import { getDownloads, getNews, getPage, getPrograms, getSeasons, getSponsors, getSubteams, newsCard } from './content.ts';
import type { Locale, PageKey } from '#lib/site.ts';

export function loadPage(key: PageKey, locale: Locale) {
	switch (key) {
		case 'team': return { view: 'team' as const, c: getPage('team', locale), subteams: getSubteams() };
		case 'robots': return { view: 'robots' as const, c: getPage('robots', locale), seasons: getSeasons() };
		case 'outreach': return { view: 'outreach' as const, c: getPage('outreach', locale), programs: getPrograms() };
		case 'sponsors': {
			const c = getPage('sponsors', locale);
			if (locale === 'es') {
				const { supporters, thanks } = getPage('sponsors', 'en').wall;
				c.wall = { ...c.wall, supporters, thanks };
			}
			return { view: 'sponsors' as const, c, sponsors: getSponsors(), packets: getDownloads(locale, true) };
		}
		case 'news': return { view: 'news' as const, c: getPage('news', locale), posts: getNews(locale).map(newsCard) };
		case 'gallery': {
			const c = getPage('gallery', locale);
			const albums = locale === 'en' ? c.albums : getPage('gallery', 'en').albums;
			return { view: 'gallery' as const, c, albums };
		}
		case 'join': return { view: 'join' as const, c: getPage('join', locale), files: getDownloads(locale, false) };
	}
}
export type PageView = ReturnType<typeof loadPage>;
export type ViewOf<K extends PageKey> = Extract<PageView, { view: K }>;
