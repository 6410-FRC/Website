/**
 * The shape every file in src/content/ must have. If a file is missing something or has a typo,
 * `npm run dev` and `npm run build` stop with a message naming the file and the field.
 */
import { z } from 'zod';

const opt = z.string().nullish();
const url = z.string().trim().max(2000).nullish();
const strings = z.array(z.string());
const titled = z.array(z.object({ title: z.string(), body: z.string() }));
const cta = z.object({ title: z.string(), body: z.string(), actionLabel: z.string() });
const order = z.number().int().default(100);
const lang = z.enum(['en', 'es']);

/** A picture: `src` is a path under static/ (for example /images/team.jpg). `alt` is required with a picture. */
export const imageSchema = z
	.object({ src: opt, alt: z.string().max(160).nullish(), altEs: z.string().max(160).nullish(), caption: z.string().max(240).nullish(), credit: z.string().max(120).nullish(),
		/** `expand: false` stops the picture opening full-screen (for placeholder pictures). */
		expand: z.boolean().nullish() })
	.nullish()
	.superRefine((v, ctx) => {
		if (v?.src && !v.alt?.trim()) ctx.addIssue({ code: 'custom', path: ['alt'], message: 'Add "alt": a few words describing the picture.' });
	});
export type Image = z.infer<typeof imageSchema>;

export const settingsSchema = z.object({
	teamName: z.string().min(1),
	schoolName: z.string().min(1),
	joinFormUrl: url, sponsorFormUrl: url, contactFormUrl: url,
	socialLinks: z.array(z.object({ label: z.string().min(1), url: z.string().min(1) })).nullish(),
	announcement: opt, announcementUrl: url,
	seo: z.object({ shareImage: imageSchema }).nullish()
});
export type Settings = z.infer<typeof settingsSchema>;

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
		support: z.object({ title: z.string(), body: z.string(), actionLabel: z.string(), secondaryLabel: z.string() })
	}),
	team: z.object({
		...pageShape, photo: imageSchema,
		subteams: z.object({ title: z.string(), intro: z.string() }),
		values: z.object({ title: z.string(), items: titled }),
		mentors: z.object({ title: z.string(), body: z.string(), photo: imageSchema }),
		cta
	}),
	robots: z.object({
		title: z.string().min(1), intro: z.string(),
		current: z.object({ title: z.string(), label: z.string(), heading: z.string(), body: z.string(), photo: imageSchema }),
		archive: z.object({ title: z.string(), body: z.string(), placeholderTitle: z.string(), placeholderCaption: z.string() }),
		process: z.object({ title: z.string(), items: titled }),
		cta
	}),
	outreach: z.object({
		...pageShape, programsTitle: z.string(),
		invite: z.object({ title: z.string(), body: z.string(), items: strings, actionLabel: z.string() })
	}),
	sponsors: z.object({
		...pageShape,
		why: z.object({ title: z.string(), items: titled }),
		tiers: z.object({ title: z.string(), intro: z.string(), items: z.array(z.object({ name: z.string(), benefits: strings })), packetNote: z.string() }),
		/** The sponsor wall: tier names, the invitation shown in an empty tier, supporter names and special thanks. */
		wall: z.object({
			tierNames: z.object({ Diamond: z.string(), Platinum: z.string(), Gold: z.string(), Silver: z.string(), Bronze: z.string(), Supporter: z.string() }),
			emptyTitle: z.string(), emptyBody: z.string(),
			supporterBody: z.string(), supporterInvite: z.string(), supporters: strings.nullish().transform((v) => v ?? []),
			thanksTitle: z.string(), thanks: strings.nullish().transform((v) => v ?? [])
		}),
		cta
	}),
	news: z.object({
		...pageShape, allLabel: z.string(),
		categories: z.object({ team: z.string(), build: z.string(), competition: z.string(), outreach: z.string() }),
		soonLabel: z.string(), note: z.string()
	}),
	join: z.object({
		...pageShape,
		paths: z.array(z.object({ title: z.string(), body: z.string(), steps: strings, actionLabel: z.string(), url })),
		meeting: z.object({ title: z.string(), body: z.string() }),
		contact: z.object({ title: z.string(), body: z.string() })
	})
};
export type ContentPage = keyof typeof pageSchemas;
export type PageContent<P extends ContentPage> = z.infer<(typeof pageSchemas)[P]>;

export const newsSchema = z.object({
	lang, title: z.string().min(1),
	/** Shown on the card exactly as typed, e.g. "2026 October". Leave out for a story that has not happened yet. */
	date: z.preprocess((v) => (v == null || v === '' ? undefined : String(v).trim()), z.string().max(60).optional()),
	/** ISO date for sorting when the displayed date is localized. */
	sortDate: z.iso.date().optional(),
	category: z.enum(['team', 'build', 'competition', 'outreach']).default('team'),
	summary: z.string(), photo: imageSchema, published: z.boolean().default(true),
	translationKey: opt, link: url
});
export const seasonSchema = z.object({
	year: z.number().int().min(1992).max(2100), public: z.boolean().default(false),
	robotName: opt, gameName: opt, summaryEn: opt, summaryEs: opt, photo: imageSchema, blueAllianceUrl: url
});
export const programSchema = z.object({ titleEn: z.string().min(1), titleEs: opt, bodyEn: z.string(), bodyEs: opt, photo: imageSchema, active: z.boolean().default(true), order });
export const subteamSchema = z.object({ nameEn: z.string().min(1), nameEs: opt, summaryEn: z.string(), summaryEs: opt, photo: imageSchema, order });
export const sponsorSchema = z.object({
	name: z.string().min(1), tier: z.enum(['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze']).default('Gold'),
	logo: z.object({ src: z.string().min(1), alt: opt }), website: url, active: z.boolean().default(true), order
});
export const downloadSchema = z.object({
	lang, title: z.string().min(1), kind: z.enum(['packet', 'handbook', 'other']).default('packet'),
	file: z.string().min(1), description: opt, published: z.boolean().default(false)
});
