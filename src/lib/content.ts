/* Build-time access to the content files edited in /admin/. */
import { readdirSync } from 'node:fs';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { fromRoot } from '../cms/content-root';
import { collections as registry } from '../cms/collections';
import type { Image } from '../cms/schema';
import { routeFor, type Locale, type PageKey } from '../data/site';

export type Settings = CollectionEntry<'settings'>['data'];
export type NewsPost = CollectionEntry<'news'>;
type PageCollection = `${PageKey | 'home'}Page`;

/** Props for MediaPlaceholder: a real image when one was chosen, otherwise nothing (placeholder). */
export const img = (photo: Image) =>
  photo?.src ? { src: photo.src, alt: photo.alt ?? '', caption: photo.caption ?? undefined, credit: photo.credit ?? undefined } : {};

/** Spanish text when it exists, otherwise the English text. */
export const pick = (locale: Locale, en: string, es?: string | null) => (locale === 'es' && es ? es : en);

export const formatDate = (date: Date, locale: Locale) =>
  date.toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

export async function getSettings(): Promise<Settings> {
  const entry = await getEntry('settings', 'site');
  return entry?.data ?? { teamName: 'WingNuts 6410', schoolName: 'Everett Alvarez High School' };
}

export async function getPage<C extends PageCollection>(collection: C, locale: Locale): Promise<CollectionEntry<C>['data']> {
  const key = collection.slice(0, -'Page'.length);
  const entry = (await getEntry(collection, `${locale}/${key}`)) as CollectionEntry<C> | undefined;
  if (!entry) throw new Error(`Missing content file: src/content/pages/${locale}/${key}.yml`);
  return entry.data;
}

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export async function getNews(locale: Locale): Promise<NewsPost[]> {
  const posts = await getCollection('news', (post) => post.data.lang === locale && post.data.published);
  const time = (post: NewsPost) => post.data.date?.getTime();
  return posts.sort((a, b) => {
    const ta = time(a), tb = time(b);
    if (ta && tb) return tb - ta;
    if (ta || tb) return ta ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}
export const hasStory = (post: NewsPost) => Boolean(post.body?.trim());
export const postSlug = (post: NewsPost) => post.id.split('/').pop() ?? post.id;
export const postUrl = (locale: Locale, post: NewsPost) => (hasStory(post) ? `${routeFor(locale, 'news')}${postSlug(post)}/` : undefined);

export const getSeasons = async () => (await getCollection('seasons', (s) => s.data.public)).sort((a, b) => b.data.year - a.data.year);
export const getPrograms = async () => (await getCollection('programs', (p) => p.data.active)).sort(byOrder);
export const getSubteams = async () => (await getCollection('subteams')).sort(byOrder);

/* These folders start empty; skip the lookup (and Astro's "empty collection" warning) until a file exists. */
const hasFiles = (dir: string) => { try { return readdirSync(fromRoot(dir)).some((f) => f.endsWith('.yml')); } catch { return false; } };

const tierRank = { Platinum: 0, Gold: 1, Silver: 2, Bronze: 3 } as const;
export const getSponsors = async () =>
  !hasFiles(registry.sponsors.dir) ? [] : (await getCollection('sponsors', (s) => s.data.active)).sort(
    (a, b) => tierRank[a.data.tier] - tierRank[b.data.tier] || a.data.order - b.data.order || a.data.name.localeCompare(b.data.name),
  );

export const getDownloads = async (locale: Locale, packets: boolean) =>
  !hasFiles(registry.downloads.dir) ? [] : getCollection('downloads', (d) => d.data.published && d.data.lang === locale && (d.data.kind === 'packet') === packets);
