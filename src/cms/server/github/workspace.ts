/**
 * Production workspace: `main` is the live site, `cms-drafts` is the draft branch.
 * The draft branch is kept as "main plus pending edits" so its diff against main is exactly the pending list.
 */
import { type FileStatus, type Workspace } from '../types';
import type { GitHubClient } from './app';
import { GitHubStore } from './store';

export interface GitHubWorkspaceConfig { mainBranch: string; draftBranch: string; previewBaseUrl?: string }

interface CompareFile { filename: string; status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged'; sha: string; previous_filename?: string }
interface Compare { status: 'ahead' | 'behind' | 'diverged' | 'identical'; behind_by: number; files: CompareFile[] }

export class GitHubWorkspace implements Workspace {
  readonly draft: GitHubStore;
  private published: GitHubStore;
  private ready?: Promise<void>;

  constructor(private gh: GitHubClient, private config: GitHubWorkspaceConfig) {
    this.published = new GitHubStore(gh, config.mainBranch);
    this.draft = new GitHubStore(gh, config.draftBranch);
    const inner = this.draft;
    // Every draft operation first makes sure the draft branch exists and is on top of main.
    for (const m of ['read', 'readMany', 'write', 'remove', 'list'] as const) {
      const original = (inner[m] as (...a: unknown[]) => Promise<unknown>).bind(inner);
      (inner as unknown as Record<string, unknown>)[m] = async (...args: unknown[]) => { await this.prepare(); return original(...args); };
    }
  }

  private prepare(): Promise<void> {
    if (!this.ready) this.ready = this.syncDraftBranch().finally(() => setTimeout(() => (this.ready = undefined), 5_000));
    return this.ready;
  }

  private async compare(): Promise<Compare> {
    return this.gh.rest<Compare>(`/compare/${encodeURIComponent(this.config.mainBranch)}...${encodeURIComponent(this.config.draftBranch)}?per_page=250`);
  }

  /** Create cms-drafts from main when missing; rebuild it on top of main when main moved (a developer pushed). */
  private async syncDraftBranch(): Promise<void> {
    const mainSha = await this.published.headSha();
    if (!mainSha) throw new Error(`Branch ${this.config.mainBranch} not found.`);
    const draftSha = await this.draft.headSha();
    if (!draftSha) {
      await this.gh.rest('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${this.config.draftBranch}`, sha: mainSha }) });
      this.draft.invalidate();
      return;
    }
    const cmp = await this.compare();
    if (cmp.status === 'identical' || cmp.status === 'ahead') return;
    // main moved: replay pending draft files onto the new main head, then move the draft branch there.
    const pending = cmp.files.filter((f) => f.status !== 'unchanged');
    await this.commitOnto(mainSha, this.config.draftBranch, pending.map((f) => ({ path: f.filename, sha: f.status === 'removed' ? null : f.sha })), 'Refresh drafts on top of the live site', true);
  }

  private async commitOnto(baseSha: string, branch: string, entries: { path: string; sha: string | null }[], message: string, force: boolean): Promise<void> {
    const base = await this.gh.rest<{ tree: { sha: string } }>(`/git/commits/${baseSha}`);
    const tree = await this.gh.rest<{ sha: string }>('/git/trees', {
      method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree: entries.map((e) => ({ path: e.path, mode: '100644', type: 'blob', sha: e.sha })) }),
    });
    const commit = await this.gh.rest<{ sha: string }>('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [baseSha] }) });
    await this.gh.rest(`/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force }) });
    this.published.invalidate(); this.draft.invalidate();
  }

  async status(): Promise<Map<string, FileStatus>> {
    await this.prepare();
    const cmp = await this.compare();
    const out = new Map<string, FileStatus>();
    for (const f of cmp.files) {
      if (f.status === 'added') out.set(f.filename, 'new');
      else if (f.status === 'removed') out.set(f.filename, 'deleted');
      else if (f.status === 'renamed') { out.set(f.filename, 'new'); if (f.previous_filename) out.set(f.previous_filename, 'deleted'); }
      else if (f.status !== 'unchanged') out.set(f.filename, 'changed');
    }
    return out;
  }

  async publish(paths: string[], message: string): Promise<void> {
    await this.prepare();
    const cmp = await this.compare();
    const wanted = new Set(paths);
    const entries = cmp.files.filter((f) => wanted.has(f.filename)).map((f) => ({ path: f.filename, sha: f.status === 'removed' ? null : f.sha }));
    if (!entries.length) return;
    const mainSha = (await this.published.headSha())!;
    await this.commitOnto(mainSha, this.config.mainBranch, entries, message, false);
    // Keep the draft branch on top of the new main head with whatever is still pending.
    const remaining = cmp.files.filter((f) => !wanted.has(f.filename) && f.status !== 'unchanged').map((f) => ({ path: f.filename, sha: f.status === 'removed' ? null : f.sha }));
    const newMain = (await this.published.headSha())!;
    if (remaining.length) await this.commitOnto(newMain, this.config.draftBranch, remaining, 'Refresh drafts after publishing', true);
    else await this.gh.rest(`/git/refs/heads/${encodeURIComponent(this.config.draftBranch)}`, { method: 'PATCH', body: JSON.stringify({ sha: newMain, force: true }) });
    this.draft.invalidate();
  }

  async discard(paths: string[]): Promise<void> {
    await this.prepare();
    const cmp = await this.compare();
    const wanted = new Set(paths);
    const remaining = cmp.files.filter((f) => !wanted.has(f.filename) && f.status !== 'unchanged').map((f) => ({ path: f.filename, sha: f.status === 'removed' ? null : f.sha }));
    const mainSha = (await this.published.headSha())!;
    if (remaining.length) await this.commitOnto(mainSha, this.config.draftBranch, remaining, 'Discard some drafts', true);
    else await this.gh.rest(`/git/refs/heads/${encodeURIComponent(this.config.draftBranch)}`, { method: 'PATCH', body: JSON.stringify({ sha: mainSha, force: true }) });
    this.draft.invalidate();
  }

  async previewUrl(pagePath: string): Promise<{ url: string; note?: string }> {
    if (!this.config.previewBaseUrl) return { url: pagePath, note: 'Preview is not set up yet. Ask the website developer to set PREVIEW_BASE_URL.' };
    return { url: `${this.config.previewBaseUrl.replace(/\/$/, '')}${pagePath}`, note: 'The preview site rebuilds after each save. Give it about a minute, then refresh.' };
  }
}
