/** Store backed by one branch of the GitHub repository. */
import { assertSafePath, base64url } from '../security';
import type { Store } from '../types';
import type { GitHubClient } from './app';

interface TreeEntry { path: string; type: 'blob' | 'tree'; sha: string }

export class GitHubStore implements Store {
  private treeCache?: { at: number; entries: TreeEntry[] };
  constructor(private gh: GitHubClient, readonly branch: string) {}

  invalidate() { this.treeCache = undefined; }

  async tree(): Promise<TreeEntry[]> {
    if (this.treeCache && Date.now() - this.treeCache.at < 5_000) return this.treeCache.entries;
    const data = await this.gh.rest<{ tree: TreeEntry[] } | null>(`/git/trees/${encodeURIComponent(this.branch)}?recursive=1`, { allow404: true });
    const entries = data?.tree ?? [];
    this.treeCache = { at: Date.now(), entries };
    return entries;
  }

  async headSha(): Promise<string | null> {
    const ref = await this.gh.rest<{ object: { sha: string } } | null>(`/git/ref/heads/${encodeURIComponent(this.branch)}`, { allow404: true });
    return ref?.object.sha ?? null;
  }

  async list(prefix: string): Promise<string[]> {
    assertSafePath(prefix);
    return (await this.tree()).filter((e) => e.type === 'blob' && e.path.startsWith(prefix + '/') && !e.path.split('/').some((s) => s.startsWith('.'))).map((e) => e.path).sort();
  }

  async read(path: string): Promise<Uint8Array | null> {
    assertSafePath(path);
    const entry = (await this.tree()).find((e) => e.path === path && e.type === 'blob');
    if (!entry) return null;
    const blob = await this.gh.rest<{ content: string; encoding: string }>(`/git/blobs/${entry.sha}`);
    return base64url.decode(blob.content.replace(/\s+/g, '').replace(/\+/g, '-').replace(/\//g, '_'));
  }

  /** Text files in one GraphQL round trip (binary files fall back to blob reads). */
  async readMany(paths: string[]): Promise<Map<string, Uint8Array | null>> {
    const out = new Map<string, Uint8Array | null>();
    const chunks: string[][] = [];
    for (let i = 0; i < paths.length; i += 60) chunks.push(paths.slice(i, i + 60));
    for (const chunk of chunks) {
      const fields = chunk.map((p, i) => `f${i}: object(expression: ${JSON.stringify(`${this.branch}:${assertSafePath(p)}`)}) { ... on Blob { text isBinary } }`).join('\n');
      const data = await this.gh.graphql<{ repository: Record<string, { text: string | null; isBinary: boolean } | null> }>(
        `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields} } }`, { owner: this.gh.owner, name: this.gh.name });
      await Promise.all(chunk.map(async (p, i) => {
        const blob = data.repository[`f${i}`];
        if (!blob) out.set(p, null);
        else if (blob.isBinary || blob.text === null) out.set(p, await this.read(p));
        else out.set(p, new TextEncoder().encode(blob.text));
      }));
    }
    return out;
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    assertSafePath(path);
    const existing = (await this.tree()).find((e) => e.path === path);
    await this.gh.rest(`/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'PUT', body: JSON.stringify({ message: `Save draft: ${path}`, content: toBase64(data), branch: this.branch, ...(existing ? { sha: existing.sha } : {}) }),
    });
    this.invalidate();
  }

  async remove(path: string): Promise<void> {
    assertSafePath(path);
    const existing = (await this.tree()).find((e) => e.path === path);
    if (!existing) return;
    await this.gh.rest(`/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'DELETE', body: JSON.stringify({ message: `Remove: ${path}`, sha: existing.sha, branch: this.branch }),
    });
    this.invalidate();
  }
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
