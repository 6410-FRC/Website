/**
 * Where each kind of content lives and which schema validates it. Shared by the
 * public build, the admin API and the admin UI. Paths are relative to the repo root.
 */
import type { ZodType } from 'zod';
import {
  downloadSchema, localeSchema, newsSchema, pageKeys, pageSchemas, programSchema, seasonSchema, settingsSchema, sponsorSchema, subteamSchema,
  type Locale, type PageKey,
} from './schema';

export const CONTENT_DIR = 'src/content';
export const UPLOADS_DIR = 'public/uploads';
export const UPLOADS_URL = '/uploads';

export type Format = 'yaml' | 'markdown';
export type CollectionKey = 'settings' | 'pages' | 'news' | 'seasons' | 'programs' | 'subteams' | 'sponsors' | 'downloads';

export interface CollectionDef {
  key: CollectionKey;
  /** Folder under the repo root. */
  dir: string;
  format: Format;
  /** How many path segments follow the collection key in a document id. */
  depth: 1 | 2;
}

export const collections: Record<CollectionKey, CollectionDef> = {
  settings: { key: 'settings', dir: `${CONTENT_DIR}/settings`, format: 'yaml', depth: 1 },
  pages: { key: 'pages', dir: `${CONTENT_DIR}/pages`, format: 'yaml', depth: 2 },
  news: { key: 'news', dir: `${CONTENT_DIR}/news`, format: 'markdown', depth: 2 },
  seasons: { key: 'seasons', dir: `${CONTENT_DIR}/seasons`, format: 'yaml', depth: 1 },
  programs: { key: 'programs', dir: `${CONTENT_DIR}/outreach`, format: 'yaml', depth: 1 },
  subteams: { key: 'subteams', dir: `${CONTENT_DIR}/team`, format: 'yaml', depth: 1 },
  sponsors: { key: 'sponsors', dir: `${CONTENT_DIR}/sponsors`, format: 'yaml', depth: 1 },
  downloads: { key: 'downloads', dir: `${CONTENT_DIR}/downloads`, format: 'yaml', depth: 1 },
};

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
export const YEAR_RE = /^(19|20)\d{2}$/;

/** A parsed document id such as `pages/en/home`, `news/es/robot-reveal`, `seasons/2026` or `settings`. */
export interface DocRef { id: string; collection: CollectionKey; lang?: Locale; slug: string; path: string }

export function parseDocId(id: string): DocRef | null {
  if (id === 'settings') return { id, collection: 'settings', slug: 'site', path: `${collections.settings.dir}/site.yml` };
  const parts = id.split('/');
  const collection = collections[parts[0] as CollectionKey];
  if (!collection || collection.key === 'settings' || parts.length !== collection.depth + 1) return null;
  if (collection.depth === 2) {
    const lang = localeSchema.safeParse(parts[1]);
    if (!lang.success) return null;
    const slug = parts[2]!;
    if (collection.key === 'pages' ? !pageKeys.includes(slug as PageKey) : !SLUG_RE.test(slug)) return null;
    const ext = collection.format === 'markdown' ? 'md' : 'yml';
    return { id, collection: collection.key, lang: lang.data, slug, path: `${collection.dir}/${lang.data}/${slug}.${ext}` };
  }
  const slug = parts[1]!;
  if (collection.key === 'seasons' ? !YEAR_RE.test(slug) : !SLUG_RE.test(slug)) return null;
  return { id, collection: collection.key, slug, path: `${collection.dir}/${slug}.yml` };
}

/** Reverse of parseDocId: the document id for a content file path, or null for files the admin does not manage. */
export function docIdForPath(path: string): string | null {
  for (const c of Object.values(collections)) {
    if (!path.startsWith(c.dir + '/')) continue;
    const rest = path.slice(c.dir.length + 1).replace(/\.(yml|md)$/, '');
    const id = c.key === 'settings' ? (rest === 'site' ? 'settings' : null) : `${c.key}/${rest}`;
    return id && parseDocId(id)?.path === path ? id : null;
  }
  return null;
}

export function schemaFor(ref: DocRef): ZodType {
  switch (ref.collection) {
    case 'settings': return settingsSchema;
    case 'pages': return pageSchemas[ref.slug as PageKey];
    case 'news': return newsSchema;
    case 'seasons': return seasonSchema;
    case 'programs': return programSchema;
    case 'subteams': return subteamSchema;
    case 'sponsors': return sponsorSchema;
    case 'downloads': return downloadSchema;
  }
}

/** Collect every `/uploads/...` reference inside a document so uploads publish together with the text that uses them. */
export function uploadsReferenced(data: unknown, out = new Set<string>()): Set<string> {
  if (typeof data === 'string') {
    for (const m of data.matchAll(/\/uploads\/([A-Za-z0-9._-]+)/g)) out.add(m[1]!);
  } else if (Array.isArray(data)) data.forEach((v) => uploadsReferenced(v, out));
  else if (data && typeof data === 'object') Object.values(data).forEach((v) => uploadsReferenced(v, out));
  return out;
}
