<script lang="ts">
	/**
	 * Full-screen photo viewer. The page sets `index` to the picture to show; `null` means closed.
	 * Close with the button, Esc, or a click outside the picture. Arrow keys and swipes change pictures.
	 */
	export interface Slide { src: string; alt: string; title: string; text?: string }

	interface Props { slides: Slide[]; index: number | null; labels: { close: string; previous: string; next: string } }
	let { slides, index = $bindable(), labels }: Props = $props();

	let dialog: HTMLDialogElement;
	let touchX = 0;
	const slide = $derived(index === null ? undefined : slides[index]);

	$effect(() => {
		if (index !== null && !dialog.open) dialog.showModal();
		else if (index === null && dialog.open) dialog.close();
	});

	function step(by: number) {
		if (index !== null && slides.length > 1) index = (index + by + slides.length) % slides.length;
	}
	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') step(-1);
		else if (event.key === 'ArrowRight') step(1);
	}
	function onclick(event: MouseEvent) {
		if (!(event.target as Element).closest('img, button, figcaption')) index = null;
	}
	function ontouchend(event: TouchEvent) {
		const moved = event.changedTouches[0].clientX - touchX;
		if (Math.abs(moved) > 50) step(moved < 0 ? 1 : -1);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	class="lightbox" aria-label={slide?.title} bind:this={dialog}
	onclose={() => (index = null)} {onclick} {onkeydown}
	ontouchstart={(event) => (touchX = event.touches[0].clientX)} {ontouchend}
>
	<button class="lightbox-button lightbox-close" type="button" aria-label={labels.close} onclick={() => (index = null)}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
	</button>
	{#if slide}
		{#if slides.length > 1}
			<button class="lightbox-button lightbox-prev" type="button" aria-label={labels.previous} onclick={() => step(-1)}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
			</button>
		{/if}
		{#key slide.src + slide.title}
			<figure class="lightbox-figure">
				<img src={slide.src} alt={slide.alt} decoding="async" />
				<figcaption>
					<strong>{slide.title}</strong>
					{#if slide.text}<span>{slide.text}</span>{/if}
					{#if slides.length > 1}<span class="lightbox-count">{(index ?? 0) + 1} / {slides.length}</span>{/if}
				</figcaption>
			</figure>
		{/key}
		{#if slides.length > 1}
			<button class="lightbox-button lightbox-next" type="button" aria-label={labels.next} onclick={() => step(1)}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
			</button>
		{/if}
	{/if}
</dialog>
