/** Document-level operations on top of a Workspace: load everything, validate, save, delete, uploads. */
import { UPLOADS_DIR, UPLOADS_URL, collections, docIdForPath, parseDocId, schemaFor, uploadsReferenced, type CollectionKey, type DocRef } from '../collections';
import { parseDocument, serializeDocument, textDecoder, textEncoder } from '../serialize';
import { FILE_TYPES, detectFileType, sanitizeFilename } from './security';
import { AdminError, type FileStatus, type Workspace } from './types';

export type DocStatus = 'published' | FileStatus;

export interface DocRecord {
  id: string;
  collection: CollectionKey;
  lang?: string;
  slug: string;
  data: Record<string, unknown>;
  status: DocStatus;
  /** Set when the file could not be read as content (kept so it is not lost, not editable). */
  error?: string;
}

export interface UploadRecord { name: string; url: string; type: string; status: DocStatus }

export interface ContentSnapshot { docs: DocRecord[]; uploads: UploadRecord[]; pending: string[] }

async function readAll(ws: Workspace, paths: string[]): Promise<Map<string, Uint8Array | null>> {
  if (ws.draft.readMany) return ws.draft.readMany(paths);
  const out = new Map<string, Uint8Array | null>();
  await Promise.all(paths.map(async (p) => out.set(p, await ws.draft.read(p))));
  return out;
}

export async function loadSnapshot(ws: Workspace): Promise<ContentSnapshot> {
  const [status, ...lists] = await Promise.all([ws.status(), ...Object.values(collections).map((c) => ws.draft.list(c.dir)), ws.draft.list(UPLOADS_DIR)]);
  const uploadPaths = lists.pop()!;
  const contentPaths = new Set(lists.flat());
  for (const [p, s] of status) if (s === 'deleted' && docIdForPath(p)) contentPaths.add(p);

  const refs = [...contentPaths].map((p) => ({ path: p, id: docIdForPath(p) })).filter((x): x is { path: string; id: string } => Boolean(x.id));
  const files = await readAll(ws, refs.filter((r) => status.get(r.path) !== 'deleted').map((r) => r.path));
  const docs: DocRecord[] = [];
  for (const { path, id } of refs) {
    const ref = parseDocId(id)!;
    const st: DocStatus = status.get(path) ?? 'published';
    if (st === 'deleted') { docs.push({ id, collection: ref.collection, lang: ref.lang, slug: ref.slug, data: {}, status: st }); continue; }
    const bytes = files.get(path);
    if (!bytes) continue;
    try {
      docs.push({ id, collection: ref.collection, lang: ref.lang, slug: ref.slug, data: parseDocument(collections[ref.collection].format, textDecoder.decode(bytes)), status: st });
    } catch (e) {
      docs.push({ id, collection: ref.collection, lang: ref.lang, slug: ref.slug, data: {}, status: st, error: (e as Error).message });
    }
  }

  const uploads: UploadRecord[] = [];
  const uploadNames = new Set(uploadPaths.map((p) => p.slice(UPLOADS_DIR.length + 1)));
  for (const [p, s] of status) if (s === 'deleted' && p.startsWith(UPLOADS_DIR + '/')) uploadNames.add(p.slice(UPLOADS_DIR.length + 1));
  for (const name of uploadNames) {
    if (name.startsWith('.') || name.includes('/')) continue;
    const ext = name.split('.').pop()!.toLowerCase();
    uploads.push({ name, url: `${UPLOADS_URL}/${name}`, type: FILE_TYPES[ext] ?? 'application/octet-stream', status: status.get(`${UPLOADS_DIR}/${name}`) ?? 'published' });
  }
  uploads.sort((a, b) => a.name.localeCompare(b.name));
  docs.sort((a, b) => a.id.localeCompare(b.id));
  const pending = [...status.keys()].map((p) => docIdForPath(p) ?? (p.startsWith(UPLOADS_DIR + '/') ? `uploads/${p.slice(UPLOADS_DIR.length + 1)}` : null)).filter((x): x is string => Boolean(x));
  return { docs, uploads, pending };
}

export function refOrThrow(id: string): DocRef {
  const ref = parseDocId(id);
  if (!ref) throw new AdminError(404, 'That item does not exist.');
  return ref;
}

export interface FieldIssue { path: string; message: string }

export function validateDoc(ref: DocRef, data: unknown): { ok: true; data: Record<string, unknown> } | { ok: false; issues: FieldIssue[] } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, issues: [{ path: '', message: 'Nothing to save.' }] };
  const result = schemaFor(ref).safeParse(data);
  if (!result.success) return { ok: false, issues: result.error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message })) };
  return { ok: true, data: data as Record<string, unknown> };
}

export async function saveDoc(ws: Workspace, id: string, data: unknown): Promise<DocRecord> {
  const ref = refOrThrow(id);
  const checked = validateDoc(ref, data);
  if (!checked.ok) throw new AdminError(422, 'Some fields need attention.', checked.issues);
  const text = serializeDocument(collections[ref.collection].format, checked.data);
  await ws.draft.write(ref.path, textEncoder.encode(text));
  const status = (await ws.status()).get(ref.path) ?? 'published';
  return { id, collection: ref.collection, lang: ref.lang, slug: ref.slug, data: parseDocument(collections[ref.collection].format, text), status };
}

export async function deleteDoc(ws: Workspace, id: string): Promise<void> {
  const ref = refOrThrow(id);
  if (ref.collection === 'settings' || ref.collection === 'pages') throw new AdminError(400, 'This item cannot be removed, only edited.');
  await ws.draft.remove(ref.path);
}

/** Map ids (documents and `uploads/<name>`) to repo paths, adding any uploads the documents reference. */
export async function pathsForIds(ws: Workspace, ids: string[]): Promise<string[]> {
  const status = await ws.status();
  const paths = new Set<string>();
  for (const id of ids) {
    if (id.startsWith('uploads/')) { paths.add(`${UPLOADS_DIR}/${sanitizeFilename(id.slice('uploads/'.length))}`); continue; }
    const ref = refOrThrow(id);
    paths.add(ref.path);
    if (status.get(ref.path) === 'deleted') continue;
    const bytes = await ws.draft.read(ref.path);
    if (!bytes) continue;
    for (const name of uploadsReferenced(parseDocument(collections[ref.collection].format, textDecoder.decode(bytes)))) {
      const p = `${UPLOADS_DIR}/${name}`;
      if (status.has(p)) paths.add(p);
    }
  }
  return [...paths].filter((p) => status.has(p));
}

export async function storeUpload(ws: Workspace, rawName: string, bytes: Uint8Array, replace = false): Promise<UploadRecord> {
  if (bytes.byteLength === 0) throw new AdminError(400, 'The file is empty.');
  let name = sanitizeFilename(rawName);
  const type = detectFileType(bytes, name);
  if (!replace) {
    const existing = new Set((await ws.draft.list(UPLOADS_DIR)).map((p) => p.slice(UPLOADS_DIR.length + 1)));
    const [stem, ext] = [name.slice(0, name.lastIndexOf('.')), name.slice(name.lastIndexOf('.'))];
    for (let i = 2; existing.has(name); i++) name = `${stem}-${i}${ext}`;
  }
  await ws.draft.write(`${UPLOADS_DIR}/${name}`, bytes);
  const status = (await ws.status()).get(`${UPLOADS_DIR}/${name}`) ?? 'published';
  return { name, url: `${UPLOADS_URL}/${name}`, type, status };
}

export async function readUpload(ws: Workspace, rawName: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  const name = sanitizeFilename(rawName);
  const bytes = await ws.draft.read(`${UPLOADS_DIR}/${name}`);
  return bytes ? { bytes, type: FILE_TYPES[name.split('.').pop()!] ?? 'application/octet-stream' } : null;
}

export async function deleteUpload(ws: Workspace, rawName: string): Promise<void> {
  await ws.draft.remove(`${UPLOADS_DIR}/${sanitizeFilename(rawName)}`);
}
