<script lang="ts">
	/**
	 * Wingnuts rain down the screen when the home page loads and pile up along the bottom. Then they vanish one
	 * at a time in a random order, each fading slowly, and the pile keeps settling under gravity as they go.
	 * They sit on top of the page but never block clicks. Skipped for visitors who have turned animations off.
	 *
	 * To change the picture: replace static/images/wingnut.png with another transparent PNG of the same name
	 * (about 220px wide is plenty), or point IMAGE at a different file. Any shape works.
	 */
	import { onDestroy, onMount, tick as rendered } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	const IMAGE = '/images/wingnut.png';
	/** How many fall on a wide screen; narrower screens get fewer. */
	const COUNT = 70;
	/** How long the whole pile stays once it has settled, in milliseconds, before wingnuts start to vanish. */
	const LINGER = 2500;
	/** The wingnuts vanish at random moments spread over this long, in milliseconds. */
	const VANISH = 6000;
	/** How long one wingnut takes to fade out, in milliseconds. */
	const FADE = 1100;

	let pieces = $state<number[]>([]);
	let layer = $state<HTMLElement>();

	let frame = 0;
	/** Counts the showers started, so an older one stops as soon as a newer one begins. */
	let shower = 0;
	let lastStart = -Infinity;

	/** Start the rain from the top, replacing any shower already on screen. */
	async function start() {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (performance.now() - lastStart < 400) return;
		lastStart = performance.now();
		const mine = ++shower;
		cancelAnimationFrame(frame);
		pieces = [];
		const picture = new Image();
		picture.src = IMAGE;
		try { await picture.decode(); } catch { return; }
		await rendered();
		if (mine !== shower) return;
		const shape = picture.naturalHeight / picture.naturalWidth;
		const wide = window.innerWidth;
		pieces = Array.from({ length: Math.round(Math.min(COUNT, Math.max(22, wide / 18))) }, (_, i) => i);
		await rendered();
		frame = requestAnimationFrame(() => run(shape, wide < 640, mine));
	}

	/* It rains whenever the home page is arrived at: a fresh load, coming from another page, switching language,
	   and also a click on a link to the home page while already on it (the logo in the top left). */
	afterNavigate(() => { start(); });
	onMount(() => {
		const onclick = (event: MouseEvent) => {
			const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
			if (link && !link.target && link.origin === location.origin && link.pathname === location.pathname && !link.hash) start();
		};
		document.addEventListener('click', onclick);
		return () => document.removeEventListener('click', onclick);
	});
	onDestroy(() => { shower++; if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame); });

	function run(shape: number, small: boolean, mine: number) {
		if (mine !== shower || !layer) return;
		const rand = (a: number, b: number) => a + Math.random() * (b - a);
		const nuts = [...layer.querySelectorAll<HTMLElement>('img')].map((el, i) => {
			const w = small ? rand(40, 62) : rand(58, 92);
			el.style.width = `${w}px`;
			return {
				el, w, h: w * shape, r: w * 0.3,
				x: rand(30, window.innerWidth - 30), y: -rand(60, 200),
				vx: rand(-60, 60), vy: rand(0, 120), a: rand(0, 6.28), va: rand(-4, 4),
				wait: i * rand(28, 46), on: false,
				/* When this one starts to fade (set once the pile settles), and whether it has gone. */
				leave: Infinity, fadingOut: false, gone: false
			};
		});
		const started = performance.now();
		/* The pile gets this long after the last wingnut drops, then counts as settled even if a few still wobble. */
		const deadline = Math.max(...nuts.map((n) => n.wait)) + 4000;
		let last = started;
		let quiet = 0;
		let settled = false;

		const tick = (now: number) => {
			if (mine !== shower) return;
			const width = window.innerWidth, height = window.innerHeight;
			const dt = Math.min(0.032, (now - last) / 1000) / 2;
			last = now;
			for (let pass = 0; pass < 2; pass++) {
				for (const n of nuts) {
					if (n.gone) continue;
					if (!n.on) {
						if (now - started < n.wait) continue;
						n.on = true;
						n.el.style.opacity = '1';
					}
					n.vy += 1900 * dt;
					n.x += n.vx * dt; n.y += n.vy * dt; n.a += n.va * dt;
					if (n.x < n.r) { n.x = n.r; n.vx = Math.abs(n.vx) * 0.4; }
					if (n.x > width - n.r) { n.x = width - n.r; n.vx = -Math.abs(n.vx) * 0.4; }
					if (n.y > height - n.r) {
						n.y = height - n.r;
						n.vy = -n.vy * 0.22; n.vx *= 0.82;
						n.va = n.va * 0.6 + (n.vx / n.r) * 0.4;
					}
				}
				/* Wingnuts push each other apart, treated as circles. */
				for (let round = 0; round < 3; round++) {
					for (let i = 0; i < nuts.length; i++) {
						const p = nuts[i]!;
						if (!p.on || p.gone) continue;
						for (let j = i + 1; j < nuts.length; j++) {
							const q = nuts[j]!;
							if (!q.on || q.gone) continue;
							const dx = q.x - p.x, dy = q.y - p.y, reach = p.r + q.r, gap = dx * dx + dy * dy;
							if (gap >= reach * reach || gap === 0) continue;
							const d = Math.sqrt(gap), nx = dx / d, ny = dy / d, push = (reach - d) / 2;
							p.x -= nx * push; p.y -= ny * push;
							q.x += nx * push; q.y += ny * push;
							const closing = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
							if (closing < 0) {
								const hit = closing * 0.56;
								p.vx += nx * hit; p.vy += ny * hit;
								q.vx -= nx * hit; q.vy -= ny * hit;
								p.va *= 0.9; q.va *= 0.9;
							}
						}
					}
				}
				for (const n of nuts) {
					if (!n.on || n.gone) continue;
					if (n.y > height - n.r) { n.y = height - n.r; if (n.vy > 0) n.vy = 0; }
					n.vx *= 0.992; n.va *= 0.985;
				}
			}
			let fastest = 0, waiting = false, left = 0;
			for (const n of nuts) {
				if (n.gone) continue;
				left++;
				if (!n.on) { waiting = true; continue; }
				n.el.style.transform = `translate(${(n.x - n.w / 2).toFixed(1)}px,${(n.y - n.h / 2).toFixed(1)}px) rotate(${n.a.toFixed(3)}rad)`;
				fastest = Math.max(fastest, Math.abs(n.vx) + Math.abs(n.vy));
				/* Its turn to go: fade slowly while still solid, then drop out so whatever rested on it falls. */
				if (!n.fadingOut && now >= n.leave) {
					n.fadingOut = true;
					n.el.style.transition = `opacity ${FADE}ms ease`;
					n.el.style.opacity = '0';
				} else if (n.fadingOut && now >= n.leave + FADE) {
					n.gone = true;
				}
			}
			if (!settled) {
				quiet = !waiting && fastest < 26 ? quiet + 1 : 0;
				if (quiet >= 60 || now - started >= deadline) {
					settled = true;
					for (const n of nuts) n.leave = now + LINGER + Math.random() * VANISH;
				}
			}
			if (left) frame = requestAnimationFrame(tick);
			else pieces = [];
		};
		frame = requestAnimationFrame(tick);
	}
</script>

{#if pieces.length}
	<div class="wingnut-rain" aria-hidden="true" bind:this={layer}>
		{#each pieces as piece (piece)}<img src={IMAGE} alt="" />{/each}
	</div>
{/if}
