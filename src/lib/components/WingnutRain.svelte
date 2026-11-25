<script lang="ts">
	/**
	 * Wingnuts rain down the screen when the home page loads and pile up along the bottom. Then they vanish one
	 * at a time in a random order, each fading slowly, and the pile keeps settling under gravity as they go.
	 * They spin freely in the air; hitting each other, the walls or the floor changes their spin and sets them rolling.
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
	/** Sound effects: soft thuds when wingnuts land. `false` turns them off. */
	const SOUND = true;
	/** How loud the sound effects are, from 0 (silent) to 1. */
	const VOLUME = 0.9;
	/**
	 * Which hits make a sound. 'floor': only wingnuts landing on the bottom of the screen thud.
	 * 'all': wingnuts landing on other wingnuts thud too, more quietly, so the pile building up is not silent.
	 */
	type Thuds = 'floor' | 'all';
	const THUDS: Thuds = 'all';

	let pieces = $state<number[]>([]);
	let layer = $state<HTMLElement>();

	/*
	 * Sound is made on the spot with the Web Audio API, so there are no audio files. Browsers keep a page silent
	 * until the visitor clicks, taps or presses a key on it, so the very first shower of a visit makes no sound;
	 * showers after any click do (for example clicking the logo to make it rain again).
	 */
	let audio: AudioContext | undefined;
	let out: GainNode | undefined;
	let noise: AudioBuffer | undefined;
	let lastThud = 0;

	/** Called on the visitor's first click, tap or key press: after this the page is allowed to make sound. */
	function wake() {
		if (!SOUND) return;
		if (!audio) {
			const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (!Ctx) return;
			audio = new Ctx();
			out = audio.createGain();
			out.gain.value = VOLUME;
			const squash = audio.createDynamicsCompressor();
			out.connect(squash);
			squash.connect(audio.destination);
			noise = audio.createBuffer(1, audio.sampleRate * 0.25, audio.sampleRate);
			const data = noise.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		}
		if (audio.state === 'suspended') audio.resume();
	}
	/** Where a sound comes from, left to right, so it matches where it happened on screen. */
	function placed(pan: number): AudioNode {
		if (!audio!.createStereoPanner) return out!;
		const side = audio!.createStereoPanner();
		side.pan.value = Math.max(-1, Math.min(1, pan));
		side.connect(out!);
		return side;
	}
	/** A landing: a low, short, muffled bump. `soft` is for a wingnut landing on other wingnuts rather than the floor. */
	function thud(strength: number, pan: number, soft = false) {
		if (!audio || !noise || audio.state !== 'running') return;
		const now = audio.currentTime;
		if (now - lastThud < 0.03) return;
		lastThud = now;
		const level = (0.3 + Math.min(1, strength) * 0.7) * (soft ? 0.32 : 0.7);
		const dest = placed(pan);
		const tone = audio.createOscillator();
		const amp = audio.createGain();
		/* Low, but not so low that laptop and phone speakers cannot reproduce it. */
		tone.frequency.setValueAtTime(190 + Math.random() * 40, now);
		tone.frequency.exponentialRampToValueAtTime(95, now + 0.11);
		amp.gain.setValueAtTime(level, now);
		amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
		tone.connect(amp); amp.connect(dest);
		tone.start(now); tone.stop(now + 0.16);
		const puff = audio.createBufferSource();
		const dull = audio.createBiquadFilter();
		const quiet = audio.createGain();
		puff.buffer = noise;
		dull.type = 'lowpass'; dull.frequency.value = 900;
		quiet.gain.setValueAtTime(level * 0.7, now);
		quiet.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
		puff.connect(dull); dull.connect(quiet); quiet.connect(dest);
		puff.start(now); puff.stop(now + 0.07);
	}

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
		/* Any of these counts as the visitor's first interaction; browsers differ on which ones unlock sound. */
		const unlock = ['pointerdown', 'mousedown', 'mouseup', 'touchend', 'click', 'keydown'];
		for (const type of unlock) document.addEventListener(type, wake, true);
		return () => {
			document.removeEventListener('click', onclick);
			for (const type of unlock) document.removeEventListener(type, wake, true);
		};
	});
	onDestroy(() => { shower++; if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame); audio?.close(); audio = undefined; });

	function run(shape: number, small: boolean, mine: number) {
		if (mine !== shower || !layer) return;
		const rand = (a: number, b: number) => a + Math.random() * (b - a);
		const nuts = [...layer.querySelectorAll<HTMLElement>('img')].map((el, i) => {
			const w = small ? rand(40, 62) : rand(58, 92);
			el.style.width = `${w}px`;
			return {
				el, w, h: w * shape, r: w * 0.3,
				x: rand(30, window.innerWidth - 30), y: -rand(60, 200),
				vx: rand(-60, 60), vy: rand(0, 120), a: rand(0, 6.28), va: rand(-9, 9),
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
					/* Touching a wall or the floor grips the wingnut: sliding turns into spin and spin into rolling. */
					if (n.x < n.r) { n.x = n.r; n.vx = Math.abs(n.vx) * 0.4; const slip = n.vy - n.va * n.r; n.vy -= slip * 0.2; n.va += (slip * 0.2) / n.r; }
					if (n.x > width - n.r) { n.x = width - n.r; n.vx = -Math.abs(n.vx) * 0.4; const slip = n.vy + n.va * n.r; n.vy -= slip * 0.2; n.va -= (slip * 0.2) / n.r; }
					if (n.y > height - n.r) {
						if (n.vy > 260) thud(n.vy / 1400, (n.x / width) * 2 - 1);
						n.y = height - n.r;
						n.vy = -n.vy * 0.22;
						const slip = n.vx - n.va * n.r;
						n.vx -= slip * 0.3; n.va += (slip * 0.3) / n.r;
						n.vx *= 0.94;
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
								if (THUDS === 'all' && closing < -320) thud(-closing / 1500, ((p.x + q.x) / width) - 1, true);
								const hit = closing * 0.56;
								p.vx += nx * hit; p.vy += ny * hit;
								q.vx -= nx * hit; q.vy -= ny * hit;
							}
							/* Where two wingnuts rub, friction passes spin between them: a glancing hit sets both turning. */
							const tx = -ny, ty = nx;
							const rub = ((q.vx - p.vx) * tx + (q.vy - p.vy) * ty - q.va * q.r - p.va * p.r) * 0.1;
							p.vx += tx * rub; p.vy += ty * rub;
							q.vx -= tx * rub; q.vy -= ty * rub;
							p.va += rub / p.r; q.va += rub / q.r;
						}
					}
				}
				for (const n of nuts) {
					if (!n.on || n.gone) continue;
					if (n.y > height - n.r) { n.y = height - n.r; if (n.vy > 0) n.vy = 0; }
					n.vx *= 0.992; n.va *= 0.999;
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
