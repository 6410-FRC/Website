/**
 * Content schemas shared by the public site (content.config.ts), the admin API
 * (validation before anything is written) and the admin UI (inline validation).
 * Every content file under src/content/ must satisfy one of these.
 */
import { z } from 'zod';

export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const localeSchema = z.enum(locales);

const opt = z.string().nullish();
const url = z.string().trim().max(2000).nullish();
const strings = z.array(z.string());
const titled = z.array(z.object({ title: z.string(), body: z.string() }));
const cta = z.object({ title: z.string(), body: z.string(), actionLabel: z.string() });
const order = z.number().int().default(100);
const date = z.preprocess((v) => (v ? new Date(v as string) : undefined), z.date().optional());

/** A picture chosen in the admin. `alt` is required whenever a picture is set. */
export const imageSchema = z
  .object({ src: opt, alt: z.string().max(160).nullish(), caption: z.string().max(240).nullish(), credit: z.string().max(120).nullish() })
  .nullish()
  .superRefine((v, ctx) => {
    if (v?.src && !v.alt?.trim()) ctx.addIssue({ code: 'custom', path: ['alt'], message: 'Describe the picture in a few words.' });
  });
export type Image = z.infer<typeof imageSchema>;

/** Optional search/share overrides for a page. */
export const seoSchema = z.object({ title: opt, description: opt, image: imageSchema }).nullish();

/** Which sections a page shows and in what order. Sections missing from the list are shown last. */
export const sectionIds = {
  home: ['about', 'robot', 'life', 'news', 'sponsors', 'support'],
  team: ['intro', 'subteams', 'values', 'mentors', 'cta'],
  robots: ['current', 'archive', 'process', 'cta'],
  outreach: ['programs', 'invite'],
  sponsors: ['why', 'tiers', 'grid', 'cta'],
  news: [],
  join: ['paths', 'meeting'],
} as const;
export type PageKey = keyof typeof sectionIds;
export const pageKeys = Object.keys(sectionIds) as PageKey[];
export type SectionId<P extends PageKey> = (typeof sectionIds)[P][number];
export type SectionSetting = { id: string; visible: boolean };

const sections = (ids: readonly string[]) =>
  z.array(z.object({ id: z.string(), visible: z.boolean().default(true) })).default(ids.map((id) => ({ id, visible: true })));

/** Ordered list of section ids to render: the saved order first, then any new sections. */
export function orderedSections<P extends PageKey>(page: P, saved: SectionSetting[] | undefined): SectionId<P>[] {
  const all = sectionIds[page] as readonly string[];
  const list = (saved ?? []).filter((s) => all.includes(s.id));
  const missing = all.filter((id) => !list.some((s) => s.id === id));
  return [...list.filter((s) => s.visible).map((s) => s.id), ...missing] as SectionId<P>[];
}

export const settingsSchema = z.object({
  teamName: z.string().min(1),
  schoolName: z.string().min(1),
  joinFormUrl: url, sponsorFormUrl: url, contactFormUrl: url,
  socialLinks: z.array(z.object({ label: z.string().min(1), url: z.string().min(1) })).nullish(),
  announcement: opt, announcementUrl: url,
  seo: z.object({ shareImage: imageSchema }).nullish(),
});

const pageShape = { title: z.string().min(1), intro: z.string(), body: strings };

export const pageSchemas = {
  home: z.object({
    title: z.string().min(1), description: z.string(),
    hero: z.object({ kicker: z.string(), tagline: z.string(), lead: z.string(), joinLabel: z.string(), sponsorLabel: z.string(), photo: imageSchema }),
    about: z.object({ title: z.string(), body: strings, actionLabel: z.string(), photo: imageSchema }),
    robot: z.object({ label: z.string(), title: z.string(), body: z.string(), actionLabel: z.string(), photo: imageSchema }),
    life: z.object({ title: z.string(), intro: z.string(), cards: z.array(z.object({ title: z.string(), caption: z.string(), photo: imageSchema })) }),
    news: z.object({ title: z.string(), actionLabel: z.string() }),
    sponsors: z.object({ title: z.string(), body: z.string(), actionLabel: z.string() }),
    support: z.object({ title: z.string(), body: z.string(), actionLabel: z.string(), secondaryLabel: z.string() }),
    sections: sections(sectionIds.home), seo: seoSchema,
  }),
  team: z.object({
    ...pageShape, photo: imageSchema,
    subteams: z.object({ title: z.string(), intro: z.string() }),
    values: z.object({ title: z.string(), items: titled }),
    mentors: z.object({ title: z.string(), body: z.string(), photo: imageSchema }),
    cta, sections: sections(sectionIds.team), seo: seoSchema,
  }),
  robots: z.object({
    title: z.string().min(1), intro: z.string(),
    current: z.object({ title: z.string(), label: z.string(), heading: z.string(), body: z.string(), photo: imageSchema }),
    archive: z.object({ title: z.string(), body: z.string(), placeholderTitle: z.string(), placeholderCaption: z.string() }),
    process: z.object({ title: z.string(), items: titled }),
    cta, sections: sections(sectionIds.robots), seo: seoSchema,
  }),
  outreach: z.object({
    ...pageShape, programsTitle: z.string(),
    invite: z.object({ title: z.string(), body: z.string(), items: strings, actionLabel: z.string() }),
    sections: sections(sectionIds.outreach), seo: seoSchema,
  }),
  sponsors: z.object({
    ...pageShape,
    why: z.object({ title: z.string(), items: titled }),
    tiers: z.object({ title: z.string(), intro: z.string(), items: z.array(z.object({ name: z.string(), benefits: strings })), packetNote: z.string() }),
    grid: z.object({ title: z.string(), body: z.string() }),
    cta, sections: sections(sectionIds.sponsors), seo: seoSchema,
  }),
  news: z.object({
    ...pageShape, allLabel: z.string(),
    categories: z.object({ team: z.string(), build: z.string(), competition: z.string(), outreach: z.string() }),
    soonLabel: z.string(), note: z.string(),
    sections: sections(sectionIds.news), seo: seoSchema,
  }),
  join: z.object({
    ...pageShape,
    paths: z.array(z.object({ title: z.string(), body: z.string(), steps: strings, actionLabel: z.string(), url })),
    meeting: z.object({ title: z.string(), body: z.string() }),
    contact: z.object({ title: z.string(), body: z.string() }),
    sections: sections(sectionIds.join), seo: seoSchema,
  }),
};
export type PageData<P extends PageKey> = z.infer<(typeof pageSchemas)[P]>;

export const newsCategories = ['team', 'build', 'competition', 'outreach'] as const;
export const newsSchema = z.object({
  lang: localeSchema, title: z.string().min(1), date,
  category: z.enum(newsCategories).default('team'),
  summary: z.string(), photo: imageSchema, published: z.boolean().default(true),
  /** Shared key that links the English and Spanish versions of one story. */
  translationKey: opt,
  /** Story text (stored as Markdown; edited with the rich text editor). */
  body: z.string().optional(),
});

export const seasonSchema = z.object({
  year: z.number().int().min(1992).max(2100), public: z.boolean().default(false),
  robotName: opt, gameName: opt, summaryEn: opt, summaryEs: opt, photo: imageSchema, blueAllianceUrl: url,
});
export const programSchema = z.object({ titleEn: z.string().min(1), titleEs: opt, bodyEn: z.string(), bodyEs: opt, photo: imageSchema, active: z.boolean().default(true), order });
export const subteamSchema = z.object({ nameEn: z.string().min(1), nameEs: opt, summaryEn: z.string(), summaryEs: opt, photo: imageSchema, order });
export const sponsorTiers = ['Platinum', 'Gold', 'Silver', 'Bronze'] as const;
export const sponsorSchema = z.object({
  name: z.string().min(1), tier: z.enum(sponsorTiers).default('Gold'),
  logo: z.object({ src: z.string().min(1), alt: opt }), website: url, active: z.boolean().default(true), order,
});
export const downloadKinds = ['packet', 'handbook', 'other'] as const;
export const downloadSchema = z.object({
  lang: localeSchema, title: z.string().min(1), kind: z.enum(downloadKinds).default('packet'),
  file: z.string().min(1), description: opt, published: z.boolean().default(false),
});
