/**
 * Local drafts: the repo folder is the published site; `.local/drafts/` holds edited files
 * layered on top (plus a list of files marked for deletion). `.local/preview/` mirrors the
 * merged result so a second dev server can render it as the preview site.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { UPLOADS_DIR, collections } from '../../collections';
import { AdminError, type FileStatus, type Store, type Workspace } from '../types';
import { FsStore } from './fs-store';
import { ensurePreviewServer } from './preview';

export const LOCAL_DIR = '.local';
export const DRAFTS_DIR = `${LOCAL_DIR}/drafts`;
export const PREVIEW_DIR = `${LOCAL_DIR}/preview`;

const equal = (a: Uint8Array, b: Uint8Array) => a.byteLength === b.byteLength && a.every((v, i) => v === b[i]);

class Tombstones {
  private file: string;
  constructor(root: string) { this.file = join(root, DRAFTS_DIR, 'deleted.json'); }
  async all(): Promise<Set<string>> {
    try { return new Set(JSON.parse(await readFile(this.file, 'utf8')) as string[]); } catch { return new Set(); }
  }
  async set(paths: Set<string>): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify([...paths].sort(), null, 2));
  }
  async add(path: string) { const s = await this.all(); s.add(path); await this.set(s); }
  async delete(path: string) { const s = await this.all(); if (s.delete(path)) await this.set(s); }
}

class DraftStore implements Store {
  constructor(private base: FsStore, private overlay: FsStore, private deleted: Tombstones, private onChange: (path: string) => Promise<void>) {}
  async read(path: string): Promise<Uint8Array | null> {
    if ((await this.deleted.all()).has(path)) return null;
    return (await this.overlay.read(path)) ?? this.base.read(path);
  }
  async write(path: string, data: Uint8Array): Promise<void> {
    const published = await this.base.read(path);
    if (published && equal(published, data)) await this.overlay.remove(path); // back to the published version: nothing pending
    else await this.overlay.write(path, data);
    await this.deleted.delete(path);
    await this.onChange(path);
  }
  async remove(path: string): Promise<void> {
    await this.overlay.remove(path);
    if (await this.base.exists(path)) await this.deleted.add(path);
    await this.onChange(path);
  }
  async list(prefix: string): Promise<string[]> {
    const deleted = await this.deleted.all();
    const set = new Set([...(await this.base.list(prefix)), ...(await this.overlay.list(prefix))]);
    return [...set].filter((p) => !deleted.has(p)).sort();
  }
}

export class LocalWorkspace implements Workspace {
  readonly draft: Store;
  private published: FsStore;
  private overlay: FsStore;
  private preview: FsStore;
  private deleted: Tombstones;
  private previewPort: number;

  constructor(readonly root: string, options: { previewPort?: number } = {}) {
    this.previewPort = options.previewPort ?? 4322;
    this.published = new FsStore(root);
    this.overlay = new FsStore(resolve(root, DRAFTS_DIR, 'files'));
    this.preview = new FsStore(resolve(root, PREVIEW_DIR));
    this.deleted = new Tombstones(root);
    this.draft = new DraftStore(this.published, this.overlay, this.deleted, (p) => this.syncPreviewFile(p));
  }

  async status(): Promise<Map<string, FileStatus>> {
    const out = new Map<string, FileStatus>();
    for (const p of await this.deleted.all()) out.set(p, 'deleted');
    for (const p of await this.overlay.list('')) {
      if (p === 'deleted.json') continue;
      out.set(p, (await this.published.exists(p)) ? 'changed' : 'new');
    }
    return out;
  }

  async publish(paths: string[]): Promise<void> {
    const deleted = await this.deleted.all();
    for (const p of paths) {
      if (deleted.has(p)) { await this.published.remove(p); deleted.delete(p); continue; }
      const bytes = await this.overlay.read(p);
      if (!bytes) continue;
      await this.published.write(p, bytes);
      await this.overlay.remove(p);
    }
    await this.deleted.set(deleted);
  }

  async discard(paths: string[]): Promise<void> {
    const deleted = await this.deleted.all();
    for (const p of paths) { await this.overlay.remove(p); deleted.delete(p); }
    await this.deleted.set(deleted);
    for (const p of paths) await this.syncPreviewFile(p);
  }

  async previewUrl(pagePath: string): Promise<{ url: string; note?: string }> {
    await this.syncPreviewAll();
    const port = await ensurePreviewServer(this.root, this.previewPort);
    if (!port) throw new AdminError(503, 'The preview could not start. Check the terminal where the site is running.');
    return { url: `http://localhost:${port}${pagePath}`, note: 'Preview shows your saved drafts. Changes appear a few seconds after saving.' };
  }

  /** Merged view of one path written into .local/preview (published + drafts, minus deletions). */
  private async syncPreviewFile(path: string): Promise<void> {
    const merged = await this.draft.read(path);
    if (merged) await this.preview.write(path, merged);
    else await this.preview.remove(path);
  }

  /** Rebuild the whole preview mirror: content folders plus the public folder. */
  async syncPreviewAll(): Promise<void> {
    const previewRoot = resolve(this.root, PREVIEW_DIR);
    await rm(join(previewRoot, 'src'), { recursive: true, force: true });
    await rm(join(previewRoot, 'public'), { recursive: true, force: true });
    await mkdir(previewRoot, { recursive: true });
    await cp(resolve(this.root, 'public'), join(previewRoot, 'public'), { recursive: true });
    for (const c of Object.values(collections)) await cp(resolve(this.root, c.dir), join(previewRoot, c.dir), { recursive: true }).catch(() => {});
    const status = await this.status();
    for (const p of status.keys()) await this.syncPreviewFile(p);
    void UPLOADS_DIR;
  }
}
