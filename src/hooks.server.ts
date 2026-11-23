import type { Handle } from '@sveltejs/kit/hooks';

/** Sets <html lang> from the /en/ or /es/ part of the address. */
export const handle: Handle = ({ event, resolve }) =>
	resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', event.params.lang === 'es' ? 'es' : 'en') });
