import type { PageKey } from '#lib/site.ts';

declare global {
	namespace App {
		interface PageData {
			/** Title, description and share details for the <head> of each page. */
			meta?: { title: string; description: string; page?: PageKey; path?: string; image?: string | null };
		}
	}
}

export {};
