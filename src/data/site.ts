/* Routes and fixed interface strings. Everything else is edited in /admin/ and lives in src/content/. */
export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export type PageKey = 'team' | 'robots' | 'outreach' | 'sponsors' | 'news' | 'join';

export const routes: Record<Locale, Record<PageKey, string>> = {
  en: { team: 'team', robots: 'robots', outreach: 'outreach', sponsors: 'sponsors', news: 'news', join: 'join' },
  es: { team: 'equipo', robots: 'robots', outreach: 'comunidad', sponsors: 'patrocinadores', news: 'noticias', join: 'unete' },
};

export const routeFor = (locale: Locale, page?: PageKey) =>
  page ? `/${locale}/${routes[locale][page]}/` : `/${locale}/`;

export const pageFromSlug = (locale: Locale, slug: string): PageKey | undefined =>
  (Object.entries(routes[locale]).find(([, value]) => value === slug)?.[0] as PageKey | undefined);

/* Shared UI strings: header, footer, placeholders. */
export const ui = {
  en: {
    language: 'Español', skip: 'Skip to content', support: 'Support us', menu: 'Menu', close: 'Close',
    photoSoon: 'Team photo coming soon', logoSoon: 'Your logo here', allNews: 'All news',
    nav: { home: 'Home', team: 'Team', robots: 'Robots', outreach: 'Outreach', sponsors: 'Sponsors', news: 'News', join: 'Join' },
    location: 'Salinas, California', program: 'FIRST Robotics Competition', school: 'Everett Alvarez High School', team: 'Team 6410',
    footer: {
      tagline: 'A student FIRST Robotics Competition team from Salinas, California.',
      explore: 'Explore', contact: 'Contact', follow: 'Follow us', comingSoon: 'coming soon',
      affiliation: 'A student team at', contactNote: 'Reach the team through the school office or the Join page.',
      social: ['Instagram', 'YouTube', 'Facebook'],
      legal: 'FIRST®, FRC®, and FIRST Robotics Competition® are trademarks of For Inspiration and Recognition of Science and Technology.',
    },
  },
  es: {
    language: 'English', skip: 'Saltar al contenido', support: 'Apóyanos', menu: 'Menú', close: 'Cerrar',
    photoSoon: 'Foto del equipo próximamente', logoSoon: 'Tu logotipo aquí', allNews: 'Todas las noticias',
    nav: { home: 'Inicio', team: 'Equipo', robots: 'Robots', outreach: 'Comunidad', sponsors: 'Patrocinadores', news: 'Noticias', join: 'Únete' },
    location: 'Salinas, California', program: 'FIRST Robotics Competition', school: 'Everett Alvarez High School', team: 'Equipo 6410',
    footer: {
      tagline: 'Un equipo estudiantil de FIRST Robotics Competition en Salinas, California.',
      explore: 'Explorar', contact: 'Contacto', follow: 'Síguenos', comingSoon: 'próximamente',
      affiliation: 'Equipo estudiantil de', contactNote: 'Comunícate con el equipo a través de la escuela o la página Únete.',
      social: ['Instagram', 'YouTube', 'Facebook'],
      legal: 'FIRST®, FRC® y FIRST Robotics Competition® son marcas registradas de For Inspiration and Recognition of Science and Technology.',
    },
  },
} as const;
