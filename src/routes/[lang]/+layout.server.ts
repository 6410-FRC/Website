import { error } from '@sveltejs/kit';
import { getSettings } from '#lib/server/content.ts';
import { isLocale } from '#lib/site.ts';

export const load = ({ params }) => {
	if (!isLocale(params.lang)) error(404, 'Not found');
	return { locale: params.lang, settings: getSettings() };
};
