/* Site address, routes and fixed interface strings. Page text lives in src/content/. */

/** The public address of the site. Change this if the team moves to its own domain. */
export const SITE_URL = 'https://wingnuts6410.pages.dev';

export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export type PageKey = 'team' | 'robots' | 'outreach' | 'sponsors' | 'news' | 'join';

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

export const routes: Record<Locale, Record<PageKey, string>> = {
	en: { team: 'team', robots: 'robots', outreach: 'outreach', sponsors: 'sponsors', news: 'news', join: 'join' },
	es: { team: 'equipo', robots: 'robots', outreach: 'comunidad', sponsors: 'patrocinadores', news: 'noticias', join: 'unete' }
};

export const routeFor = (locale: Locale, page?: PageKey) => (page ? `/${locale}/${routes[locale][page]}/` : `/${locale}/`);

export const pageFromSlug = (locale: Locale, slug: string): PageKey | undefined =>
	Object.entries(routes[locale]).find(([, value]) => value === slug)?.[0] as PageKey | undefined;

/** "WingNuts 6410" -> ["WingNuts", "6410"] so the number can be styled separately. */
export const splitTeamName = (name: string) => name.split(/\s+(?=\d+$)/) as [string, string | undefined];

/* Shared UI strings: header, footer, placeholders. */
export const ui = {
	en: {
		language: 'Español', skip: 'Skip to content', support: 'Support us', menu: 'Menu', close: 'Close', viewPhoto: 'View photo', previous: 'Previous photo', next: 'Next photo', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
		photoSoon: 'Team photo coming soon', logoSoon: 'Your logo here', allNews: 'All news',
		primaryNav: 'Primary navigation', notFound: 'Page not found', backHome: 'Back to the home page',
		nav: { home: 'Home', team: 'Team', robots: 'Robots', outreach: 'Outreach', sponsors: 'Sponsors', news: 'News', join: 'Join' },
		location: 'Salinas, California',
		footer: {
			tagline: 'Student-led FIRST Robotics Team',
			explore: 'Explore', contact: 'Contact', follow: 'Follow us', comingSoon: 'coming soon',
			/* Words shown before the school name in the footer. Leave empty for none, but keep the line. */
			affiliation: '',
			 contactNote: [
    '2026frc6410@gmail.com',
    'Reach us at the school office'
],
			social: ['Instagram', 'YouTube', 'Facebook'],
			legal: 'FIRST®, FRC®, and FIRST Robotics Competition® are trademarks of For Inspiration and Recognition of Science and Technology.'
		}
	},
	es: {
		language: 'English', skip: 'Saltar al contenido', support: 'Apóyanos', menu: 'Menú', close: 'Cerrar', viewPhoto: 'Ver foto', previous: 'Foto anterior', next: 'Foto siguiente', zoomIn: 'Acercar', zoomOut: 'Alejar',
		photoSoon: 'Foto del equipo próximamente', logoSoon: 'Tu logotipo aquí', allNews: 'Todas las noticias',
		primaryNav: 'Navegación principal', notFound: 'Página no encontrada', backHome: 'Volver al inicio',
		nav: { home: 'Inicio', team: 'Equipo', robots: 'Robots', outreach: 'Comunidad', sponsors: 'Patrocinadores', news: 'Noticias', join: 'Únete' },
		location: 'Salinas, California',
		footer: {
			tagline: 'Equipo de FIRST Robotics dirigido por estudiantes',
			explore: 'Explorar', contact: 'Contacto', follow: 'Síguenos', comingSoon: 'próximamente',
			affiliation: '',
			contactNote: ['2026frc6410@gmail.com', 'Contáctanos en la oficina de la escuela'],
			social: ['Instagram', 'YouTube', 'Facebook'],
			legal: 'FIRST®, FRC® y FIRST Robotics Competition® son marcas registradas de For Inspiration and Recognition of Science and Technology.'
		}
	}
} as const;
