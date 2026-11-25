<script lang="ts">
	/**
	 * Full-screen photo viewer, placed once in the page layout. Pictures open it through `openPicture`.
	 * Close: the X button, Esc, or a click outside the picture. Change picture: arrows, arrow keys, swipe.
	 * Zoom: click or double-tap the picture, the + and − buttons or keys, the mouse wheel, or a pinch. Drag to move around.
	 */
	import { viewer } from '#lib/lightbox.svelte.ts';
	import { ui, type Locale } from '#lib/site.ts';

	let { locale }: { locale: Locale } = $props();
	const t = $derived(ui[locale]);

	const MAX_ZOOM = 5;
	const CLICK_ZOOM = 2.5;

	let dialog: HTMLDialogElement;
	let image = $state<HTMLImageElement>();
	let scale = $state(1);
	let x = $state(0);
	let y = $state(0);
	let moving = $state(false);

	const slide = $derived(viewer.index === null ? undefined : viewer.slides[viewer.index]);
	const many = $derived(viewer.slides.length > 1);

	$effect(() => {
		if (viewer.index !== null && !dialog.open) dialog.showModal();
		else if (viewer.index === null && dialog.open) dialog.close();
	});
	/* Every picture starts at its normal size. */
	$effect(() => {
		void viewer.index;
		scale = 1; x = 0; y = 0;
	});
	/* The wheel zooms the picture rather than the page. */
	$effect(() => {
		const onwheel = (event: WheelEvent) => {
			event.preventDefault();
			zoomTo(scale * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002)), event.clientX, event.clientY);
		};
		dialog.addEventListener('wheel', onwheel, { passive: false });
		return () => dialog.removeEventListener('wheel', onwheel);
	});

	const close = () => (viewer.index = null);
	function step(by: number) {
		if (viewer.index !== null && many) viewer.index = (viewer.index + by + viewer.slides.length) % viewer.slides.length;
	}

	/** Zoom to `next`, keeping the point under (px, py) in place; without a point, zoom around the middle. */
	function zoomTo(next: number, px?: number, py?: number) {
		if (!image) return;
		next = Math.min(MAX_ZOOM, Math.max(1, next));
		const rect = image.getBoundingClientRect();
		const fromX = (px ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2) + x;
		const fromY = (py ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2) + y;
		const width = rect.width / scale, height = rect.height / scale;
		x = fromX - (next / scale) * (fromX - x);
		y = fromY - (next / scale) * (fromY - y);
		scale = next;
		keepInView(width, height);
	}
	/** Stop the picture being dragged off its own frame. */
	function keepInView(width: number, height: number) {
		const maxX = (width * (scale - 1)) / 2, maxY = (height * (scale - 1)) / 2;
		x = Math.min(maxX, Math.max(-maxX, x));
		y = Math.min(maxY, Math.max(-maxY, y));
	}

	/* Fingers or mouse on the picture: one drags (or swipes at normal size), two pinch. */
	const pointers = new Map<number, { x: number; y: number }>();
	let start = { x: 0, y: 0 };
	let dragged = false;
	let pinch = { distance: 0, scale: 1 };
	const spread = () => {
		const [a, b] = [...pointers.values()];
		return { distance: Math.hypot(a!.x - b!.x, a!.y - b!.y), x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
	};

	function onpointerdown(event: PointerEvent) {
		if (event.button !== 0) return;
		image?.setPointerCapture(event.pointerId);
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pointers.size === 1) { start = { x: event.clientX, y: event.clientY }; dragged = false; }
		else if (pointers.size === 2) { pinch = { distance: spread().distance, scale }; dragged = true; }
		moving = true;
	}
	function onpointermove(event: PointerEvent) {
		const last = pointers.get(event.pointerId);
		if (!last || !image) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pointers.size === 2) {
			const now = spread();
			if (pinch.distance) zoomTo((pinch.scale * now.distance) / pinch.distance, now.x, now.y);
		} else if (pointers.size === 1) {
			if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) dragged = true;
			if (scale > 1) {
				x += event.clientX - last.x;
				y += event.clientY - last.y;
				const rect = image.getBoundingClientRect();
				keepInView(rect.width / scale, rect.height / scale);
			}
		}
	}
	function onpointerup(event: PointerEvent) {
		if (!pointers.delete(event.pointerId) || pointers.size) return;
		moving = false;
		const swipe = event.clientX - start.x;
		if (event.type === 'pointercancel') return;
		if (!dragged) zoomTo(scale > 1 ? 1 : CLICK_ZOOM, event.clientX, event.clientY);
		else if (scale === 1 && Math.abs(swipe) > 50) step(swipe < 0 ? 1 : -1);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') step(-1);
		else if (event.key === 'ArrowRight') step(1);
		else if (event.key === '+' || event.key === '=') zoomTo(scale * 1.5);
		else if (event.key === '-') zoomTo(scale / 1.5);
		else if (event.key === '0') zoomTo(1);
	}
	function onclick(event: MouseEvent) {
		if (!(event.target as Element).closest('img, button, figcaption')) close();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	class={['lightbox', { zoomed: scale > 1 }]} aria-label={slide?.title || slide?.alt || t.viewPhoto}
	bind:this={dialog} onclose={close} {onclick} {onkeydown}
>
	<div class="lightbox-tools">
		<button class="lightbox-button" type="button" aria-label={t.zoomOut} disabled={scale <= 1} onclick={() => zoomTo(scale / 1.5)}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>
		</button>
		<button class="lightbox-button" type="button" aria-label={t.zoomIn} disabled={scale >= MAX_ZOOM} onclick={() => zoomTo(scale * 1.5)}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12" /></svg>
		</button>
		<button class="lightbox-button" type="button" aria-label={t.close} onclick={close}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
		</button>
	</div>
	{#if slide}
		{#if many}
			<button class="lightbox-button lightbox-prev" type="button" aria-label={t.previous} onclick={() => step(-1)}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
			</button>
		{/if}
		{#key viewer.index}
			<figure class="lightbox-figure">
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<img
					src={slide.src} alt={slide.alt} decoding="async" draggable="false" class={{ moving }} bind:this={image}
					style:transform={`translate(${x}px, ${y}px) scale(${scale})`}
					{onpointerdown} {onpointermove} {onpointerup} onpointercancel={onpointerup}
				/>
				<figcaption>
					{#if slide.title}<strong>{slide.title}</strong>{/if}
					{#if slide.text}<span>{slide.text}</span>{/if}
					{#if many}<span class="lightbox-count">{(viewer.index ?? 0) + 1} / {viewer.slides.length}</span>{/if}
				</figcaption>
			</figure>
		{/key}
		{#if many}
			<button class="lightbox-button lightbox-next" type="button" aria-label={t.next} onclick={() => step(1)}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
			</button>
		{/if}
	{/if}
</dialog>
