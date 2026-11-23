/** Store backed by a folder on disk. Every path is confined to the root folder. */
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { assertSafePath } from '../security';
import { AdminError, type Store } from '../types';

export class FsStore implements Store {
  readonly root: string;
  constructor(root: string) { this.root = resolve(root); }

  /** Absolute path for a repo-relative path, or throw when it would escape the root. */
  abs(path: string): string {
    assertSafePath(path);
    const full = resolve(this.root, path);
    const rel = relative(this.root, full);
    if (rel.startsWith('..') || rel.includes(`..${sep}`) || resolve(this.root, rel) !== full) throw new AdminError(400, 'That location is not allowed.');
    return full;
  }

  async read(path: string): Promise<Uint8Array | null> {
    try { return new Uint8Array(await readFile(this.abs(path))); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
  }
  async write(path: string, data: Uint8Array): Promise<void> {
    const full = this.abs(path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  async remove(path: string): Promise<void> {
    await rm(this.abs(path), { force: true });
  }
  async exists(path: string): Promise<boolean> {
    try { await stat(this.abs(path)); return true; } catch { return false; }
  }
  async list(prefix: string): Promise<string[]> {
    // An empty prefix means “list this store from its root.” It is used only by
    // the workspace status scan; individual file operations still require a
    // validated repo-relative path.
    const dir = prefix === '' ? this.root : this.abs(prefix);
    const out: string[] = [];
    const walk = async (d: string) => {
      let entries;
      try { entries = await readdir(d, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const p = join(d, e.name);
        if (e.isDirectory()) await walk(p);
        else if (e.isFile()) out.push(relative(this.root, p).split(sep).join('/'));
      }
    };
    await walk(dir);
    return out.sort();
  }
}
