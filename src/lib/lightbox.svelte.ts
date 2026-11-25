/**
 * The full-screen photo viewer's shared state. Any picture on the page can open the viewer
 * (see Media.svelte); the viewer itself is Lightbox.svelte, placed once in the page layout.
 */
export interface Slide { src: string; alt: string; title?: string; text?: string }

/** `index` is the picture being shown; `null` means the viewer is closed. */
export const viewer = $state<{ slides: Slide[]; index: number | null }>({ slides: [], index: null });

/** Every picture that can be opened: Media pictures, and pictures inside a news story's text. */
const pictures = '[data-zoom], .story-body img';

/** Open the viewer on `element`, with all the page's pictures in order so the arrows walk through them. */
export function openPicture(element: Element) {
	const all = [...document.querySelectorAll<HTMLElement>(pictures)];
	viewer.slides = all.map((el) =>
		el instanceof HTMLImageElement
			? { src: el.currentSrc || el.src, alt: el.alt }
			: { src: el.dataset.zoom ?? '', alt: el.dataset.alt ?? '', title: el.dataset.title || undefined, text: el.dataset.text || undefined }
	);
	viewer.index = Math.max(0, all.indexOf(element as HTMLElement));
}
