import { error } from '@sveltejs/kit';
import { getPage } from '#lib/server/content.ts';
import { isLocale, locales, routeFor, routes } from '#lib/site.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () =>
    locales.map(lang => ({ lang, slug: routes[lang].gallery }));

export const load: PageServerLoad = ({ params }) => {
    const locale = params.lang;
    if (!isLocale(locale) || params.slug !== routes[locale].gallery) error(404, 'Not found');
    return {
        videos: getPage('gallery', 'en').videos,
        meta: {
            title: 'Videos',
            description: locale === 'es' ? 'Mira a nuestro equipo en acción.' : 'Watch our team in action.',
            page: 'gallery' as const,
            path: `${routeFor(locale, 'gallery')}videos/`
        }
    };
};
