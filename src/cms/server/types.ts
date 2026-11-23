/** Runtime-agnostic contracts used by the admin API. Implemented for local files (dev) and GitHub (production). */

export type FileStatus = 'changed' | 'new' | 'deleted';

/** A tree of files at one "level": the published site or the draft view. Paths are repo-relative, forward slashes. */
export interface Store {
  read(path: string): Promise<Uint8Array | null>;
  /** Batch read; implementations may override for fewer round trips. */
  readMany?(paths: string[]): Promise<Map<string, Uint8Array | null>>;
  write(path: string, data: Uint8Array): Promise<void>;
  remove(path: string): Promise<void>;
  /** All file paths under a folder prefix (recursive). */
  list(prefix: string): Promise<string[]>;
}

export interface Workspace {
  /** Draft view: published content with pending edits layered on top. All editing goes here. */
  draft: Store;
  /** Files that differ between the draft view and the published site. */
  status(): Promise<Map<string, FileStatus>>;
  /** Copy the draft version of these files to the published site (or delete them there). */
  publish(paths: string[], message: string): Promise<void>;
  /** Throw away the draft version of these files. */
  discard(paths: string[]): Promise<void>;
  /** Where an editor can look at the draft version of a public page. */
  previewUrl(pagePath: string): Promise<{ url: string; note?: string }>;
}

export interface AdminUser { name: string; email?: string }

export interface AuthContext { user: AdminUser; csrfToken: string }

export interface AuthProvider {
  mode: 'local' | 'cloudflare';
  /** Identify the caller, or null when they are not signed in. */
  authenticate(request: Request): Promise<AuthContext | null>;
  /** Local mode only: username/password sign in. Returns the response to send (sets the session cookie). */
  login?(request: Request, body: { username?: string; password?: string }): Promise<Response>;
  logout?(request: Request): Promise<Response>;
}

export class AdminError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}
