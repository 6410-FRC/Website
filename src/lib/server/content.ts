/**
 * Reads the hand-edited files in src/content/ when the site is built.
 * YAML files hold page text and lists; news stories are Markdown files with a short header.
 */
import { marked } from 'marked';
import { parse } from 'yaml';
import type { z } from 'zod';
import {
	downloadSchema, newsSchema, pageSchemas, programSchema, seasonSchema, settingsSchema, sponsorSchema, subteamSchema,
	type ContentPage, type PageContent, type Settings
} from '#lib/schema.ts';
import { routeFor, type Locale } from '#lib/site.ts';

const files = import.meta.glob<string>('/src/content/**/*.{yml,md}', { query: '?raw', import: 'default', eager: true });

function check<S extends z.ZodType>(schema: S, value: unknown, file: string): z.infer<S> {
	const result = schema.safeParse(value);
	if (result.success) return result.data;
	const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.') || '(file)'}: ${issue.message}`).join('\n');
	throw new Error(`Problem in ${file.slice(1)}:\n${problems}`);
}

function readYaml(file: string): unknown {
	try { return parse(files[file]!) ?? {}; }
	catch (e) { throw new Error(`Could not read ${file.slice(1)}: ${(e as Error).message}`); }
}

/** Every file in one content folder, parsed and checked. `slug` is the file name without its ending. */
function folder<S extends z.ZodType>(dir: string, schema: S): { slug: string; data: z.infer<S> }[] {
	const prefix = `/src/content/${dir}/`;
	return Object.keys(files)
		.filter((file) => file.startsWith(prefix) && file.endsWith('.yml'))
		.sort()
		.map((file) => ({ slug: file.slice(prefix.length, -'.yml'.length), data: check(schema, readYaml(file), file) }));
}

export function getSettings(): Settings {
	return check(settingsSchema, readYaml('/src/content/settings/site.yml'), '/src/content/settings/site.yml');
}

export function getPage<P extends ContentPage>(page: P, locale: Locale): PageContent<P> {
	const file = `/src/content/pages/${locale}/${page}.yml`;
	if (!(file in files)) throw new Error(`Missing content file: ${file.slice(1)}`);
	return check(pageSchemas[page], readYaml(file), file) as PageContent<P>;
}

/** "Mar 27, 2026", or "March 2026" for a date written without a day (`date: 2026-03`). */
const formatDate = (date: Date, locale: Locale, monthOnly = false) =>
	date.toLocaleDateString(
		locale === 'es' ? 'es-MX' : 'en-US',
		monthOnly ? { year: 'numeric', month: 'long', timeZone: 'UTC' } : { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }
	);

export type NewsPost = ReturnType<typeof getNews>[number];

/** Published stories in one language, newest first. Stories without a date come last. */
export function getNews(locale: Locale) {
	const prefix = `/src/content/news/${locale}/`;
	const posts = Object.keys(files)
		.filter((file) => file.startsWith(prefix) && file.endsWith('.md'))
		.map((file) => {
			const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(files[file]!);
			if (!match) throw new Error(`${file.slice(1)} must start with a header between two --- lines.`);
			let header: unknown;
			try { header = parse(match[1]!) ?? {}; }
			catch (e) { throw new Error(`Could not read the header of ${file.slice(1)}: ${(e as Error).message}`); }
			const data = check(newsSchema, header, file);
			const monthOnly = /^\d{4}-\d{2}$/.test(String((header as { date?: unknown }).date ?? '').trim());
			const body = match[2]!.trim();
			const slug = file.slice(prefix.length, -'.md'.length);
			return {
				slug, ...data,
				time: data.date?.getTime(),
				dateLabel: data.date ? formatDate(data.date, locale, monthOnly) : undefined,
				/** Only stories with text get their own page. */
				url: data.link || ( body ? `${routeFor(locale, 'news')}${slug}/` : undefined),
				html: body ? (marked.parse(body, { async: false }) as string) : ''
			};
		})
		.filter((post) => post.lang === locale && post.published);
	return posts.sort((a, b) => {
		if (a.time && b.time) return b.time - a.time;
		if (a.time || b.time) return a.time ? -1 : 1;
		return a.slug.localeCompare(b.slug);
	});
}

/** What a news card needs (keeps the full story text out of list pages). */
export const newsCard = ({ slug, title, summary, category, photo, dateLabel, url }: NewsPost) => ({ slug, title, summary, category, photo, dateLabel, url });
export type NewsCardData = ReturnType<typeof newsCard>;

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export const getSeasons = () => folder('seasons', seasonSchema).map((s) => s.data).filter((s) => s.public).sort((a, b) => b.year - a.year);
export const getPrograms = () => folder('outreach', programSchema).filter((p) => p.data.active).sort(byOrder).map((p) => p.data);
export const getSubteams = () => folder('team', subteamSchema).sort(byOrder).map((t) => t.data);

const tierRank = { Platinum: 0, Gold: 1, Silver: 2, Bronze: 3 } as const;
export const getSponsors = () =>
	folder('sponsors', sponsorSchema).map((s) => s.data).filter((s) => s.active)
		.sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || a.order - b.order || a.name.localeCompare(b.name));
export type Sponsor = ReturnType<typeof getSponsors>[number];

/** Published files for one language: sponsor packets (packets = true) or everything else. */
export const getDownloads = (locale: Locale, packets: boolean) =>
	folder('downloads', downloadSchema).map((d) => d.data).filter((d) => d.published && d.lang === locale && (d.kind === 'packet') === packets);
