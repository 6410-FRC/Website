import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { fromRoot } from './cms/content-root';
import { collections as registry } from './cms/collections';
import { downloadSchema, newsSchema, pageSchemas, programSchema, seasonSchema, settingsSchema, sponsorSchema, subteamSchema } from './cms/schema';

/* Content is edited in /admin/ and stored under src/content/. The schemas live in src/cms/schema.ts
   so the admin validates exactly what the site expects. */
export const collections = {
  settings: defineCollection({ loader: glob({ pattern: 'site.yml', base: fromRoot(registry.settings.dir) }), schema: settingsSchema }),
  homePage: defineCollection({ loader: glob({ pattern: '*/home.yml', base: fromRoot(registry.pages.dir) }), schema: pageSchemas.home }),
  teamPage: defineCollection({ loader: glob({ pattern: '*/team.yml', base: fromRoot(registry.pages.dir) }), schema: pageSchemas.team }),
  robotsPage: defineCollection({ loader: glob({ pattern: '*/robots.yml', base: fromRoot(registry.pages.dir) }), schema: pageSchemas.robots }),
  outreachPage: defineCollection({ loader: glob({ pattern: '*/outreach.yml', base: fromRoot(registry.pages.dir) }), schema: pageSchemas.outreach }),
  sponsorsPage: defineCollection({ loader: glob({ pattern: '*/sponsors.yml', base: fromRoot(registry.pages.dir) }), schema: pageSchemas.sponsors }),
  newsPage: defineCollection({ loader: glob({ pattern: '*/news.yml', base: fromRoot(registry.pages.dir) }), schema: pageSchemas.news }),
  joinPage: defineCollection({ loader: glob({ pattern: '*/join.yml', base: fromRoot(registry.pages.dir) }), schema: pageSchemas.join }),
  news: defineCollection({ loader: glob({ pattern: '*/*.md', base: fromRoot(registry.news.dir) }), schema: newsSchema.omit({ body: true }) }),
  seasons: defineCollection({ loader: glob({ pattern: '*.yml', base: fromRoot(registry.seasons.dir) }), schema: seasonSchema }),
  programs: defineCollection({ loader: glob({ pattern: '*.yml', base: fromRoot(registry.programs.dir) }), schema: programSchema }),
  subteams: defineCollection({ loader: glob({ pattern: '*.yml', base: fromRoot(registry.subteams.dir) }), schema: subteamSchema }),
  sponsors: defineCollection({ loader: glob({ pattern: '*.yml', base: fromRoot(registry.sponsors.dir) }), schema: sponsorSchema }),
  downloads: defineCollection({ loader: glob({ pattern: '*.yml', base: fromRoot(registry.downloads.dir) }), schema: downloadSchema }),
};
