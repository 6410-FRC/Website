<script lang="ts">
	/**
	 * The sponsor wall: one textured, animated band per tier (Diamond first, and it reacts to the pointer), logos shrinking tier by tier,
	 * then the Supporter band (names) and Special Thanks. A metal tier with no sponsor yet shows an invitation.
	 * Text comes from the `wall` block of the sponsors page file; sponsors come from src/content/sponsors/.
	 */
	import type { PageContent } from '#lib/schema.ts';
	import type { Sponsor } from '#lib/server/content.ts';

	interface Props { sponsors: Sponsor[]; c: PageContent<'sponsors'>['wall']; contactHref: string; teamName: string }
	let { sponsors, c, contactHref, teamName }: Props = $props();

	const tiers = ['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze'] as const;
	const groups = $derived(tiers.map((tier) => ({ tier, key: tier.toLowerCase(), name: c.tierNames[tier], sponsors: sponsors.filter((s) => s.tier === tier) })));

	/* Decorations: where each sparkle, speck of gold dust and ember sits and how it moves. */
	const sparks = ['top:14%;left:8%', 'top:22%;left:88%;animation-delay:1.1s;width:34px;height:34px', 'top:74%;left:4%;animation-delay:2.2s;width:20px;height:20px', 'top:82%;left:93%;animation-delay:.5s', 'top:8%;left:60%;animation-delay:2.8s;width:18px;height:18px'];
	const motes = {
		gold: ['--x:6%;--s:5px;--d:8s;--w:0s;--drift:30px', '--x:17%;--s:7px;--d:10s;--w:2.5s;--drift:-20px', '--x:29%;--s:4px;--d:7s;--w:4s;--drift:18px', '--x:41%;--s:6px;--d:9s;--w:1.2s;--drift:-26px', '--x:58%;--s:5px;--d:8.5s;--w:5.5s;--drift:22px', '--x:70%;--s:7px;--d:11s;--w:3.2s;--drift:-16px', '--x:83%;--s:4px;--d:7.5s;--w:.6s;--drift:28px', '--x:94%;--s:6px;--d:9.5s;--w:6.4s;--drift:-22px'],
		bronze: ['--x:9%;--s:4px;--d:5s;--w:0s;--drift:40px', '--x:22%;--s:5px;--d:6.5s;--w:1.8s;--drift:-30px', '--x:36%;--s:3px;--d:4.5s;--w:3s;--drift:26px', '--x:49%;--s:5px;--d:6s;--w:.8s;--drift:-44px', '--x:63%;--s:4px;--d:5.5s;--w:2.4s;--drift:34px', '--x:77%;--s:3px;--d:4.8s;--w:3.8s;--drift:-24px', '--x:90%;--s:5px;--d:6.8s;--w:1.3s;--drift:30px']
	} as Record<string, string[]>;

	/* The vine: leaves as [x, y, turn, dark?, small?], tendrils as path data, buds as [x, y]. */
	const leaf = 'M0 0C8-13 26-13 34 0C26 13 8 13 0 0z';
	const smallLeaf = 'M0 0C7-11 22-11 28 0C22 11 7 11 0 0z';
	const leaves: [number, number, number, boolean, boolean][] = [
		[75, 29, -58, false, false], [225, 51, 52, true, false], [300, 40, -64, false, true], [375, 18, 46, true, false],
		[525, 18, -50, false, false], [600, 40, 60, true, true], [675, 62, -48, false, false], [825, 62, 54, true, false],
		[900, 40, -62, false, true], [975, 18, 48, true, false], [1125, 18, -52, false, false]
	];
	const tendrils = ['M150 40c10 22 34 22 34 6s-18-12-14 2', 'M450 12c8-20 32-16 28 0s-18 8-12-4', 'M750 70c12 20 36 14 30-2s-20-8-12 4', 'M1050 12c8-20 32-16 28 0s-18 8-12-4'];
	const buds: [number, number][] = [[150, 40], [450, 10], [750, 70], [1050, 10]];

	/**
	 * A row of names wraps onto several lines when there are many. The separator belongs between two names
	 * on the same line, so the name that starts each line is marked and loses the separator in front of it.
	 */
	function lineStarts(list: HTMLElement) {
		const mark = () => {
			const items = [...list.children] as HTMLElement[];
			/* A name starts a line when it sits wholly below the name before it. */
			const starts = () => items.map((item, i) => i === 0 || item.getBoundingClientRect().top >= items[i - 1]!.getBoundingClientRect().bottom - 1);
			for (const item of items) item.classList.remove('line-start');
			const first = starts();
			items.forEach((item, i) => item.classList.toggle('line-start', first[i]!));
			/* Removing a separator frees a little room, which can pull a name up a line: give that name its separator back. */
			const second = starts();
			items.forEach((item, i) => { if (!second[i]) item.classList.remove('line-start'); });
		};
		mark();
		const watcher = new ResizeObserver(mark);
		watcher.observe(list);
		document.fonts?.ready.then(mark);
		return { destroy: () => watcher.disconnect() };
	}

	/** Diamond follows the pointer: tell the band where it is (--mx/--my in percent, --nx/--ny from -1 to 1). */
	function track(event: PointerEvent) {
		const band = event.currentTarget as HTMLElement;
		const box = band.getBoundingClientRect();
		const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
		const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
		band.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
		band.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
		band.style.setProperty('--nx', (x * 2 - 1).toFixed(3));
		band.style.setProperty('--ny', (y * 2 - 1).toFixed(3));
	}
</script>

{#snippet vine(flipped: boolean)}
	<svg class={['wall-vine', { flipped }]} aria-hidden="true" viewBox="0 -16 1200 128" preserveAspectRatio="xMidYMid slice">
		<path class="wall-stem" d="M-20 40C100 0 200 80 300 40S500 0 600 40S800 80 900 40S1100 0 1220 40" />
		{#each tendrils as d, i}<path class="wall-tendril" {d} style:animation-delay={`${((i * 1.3 + (flipped ? 0.9 : 0.4)) % 3).toFixed(1)}s`} />{/each}
		{#each leaves as [x, y, turn, dark, small], i}
			<g transform={`translate(${x} ${y}) rotate(${turn})`}><path class={['wall-leaf', { dark: dark !== flipped }]} d={small ? smallLeaf : leaf} style:animation-delay={`${((i * 0.7 + (flipped ? 1.1 : 0)) % 2.1).toFixed(1)}s`} /></g>
		{/each}
		{#each buds as [cx, cy], i}<circle class="wall-bud" {cx} {cy} r="6" style:animation-delay={`${((i * 1.1 + (flipped ? 0.5 : 0)) % 2.6).toFixed(1)}s`} />{/each}
	</svg>
{/snippet}

{#each groups as group (group.tier)}
	<section class={['wall-tier', `wall-${group.key}`, { 'wall-sheen': group.key !== 'bronze' }]} aria-labelledby={`tier-${group.key}`} onpointermove={group.key === 'diamond' ? track : undefined}>
		{#if group.key === 'diamond'}
			{#each ['glare', 'foil', 'foil-2'] as layer}<div class={['wall-light', `wall-${layer}`]}></div>{/each}
			{#each sparks as style}<svg class="wall-spark" aria-hidden="true" viewBox="0 0 24 24" {style}><path fill="currentColor" d="M12 0l2 10 10 2-10 2-2 10-2-10-10-2 10-2z" /></svg>{/each}
		{/if}
		{#each motes[group.key] ?? [] as style}<span class="wall-mote" aria-hidden="true" {style}></span>{/each}
		<div class="wall-inner">
			<div class="wall-head">
				<span class="wall-rule"></span>
				<h2 id={`tier-${group.key}`} class="wall-name">{group.name}</h2>
				<span class="wall-rule"></span>
			</div>
			{#if group.sponsors.length}
				<ul class="wall-logos">
					{#each group.sponsors as sponsor (sponsor.name)}
						<li>
							{#if sponsor.website}
								<a class="wall-logo" href={sponsor.website} title={sponsor.name} target="_blank" rel="noopener"><img src={sponsor.logo.src} alt={sponsor.logo.alt || sponsor.name} loading="lazy" decoding="async" /></a>
							{:else}
								<span class="wall-logo"><img src={sponsor.logo.src} alt={sponsor.logo.alt || sponsor.name} loading="lazy" decoding="async" /></span>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<a class="wall-invite wall-invite-box" href={contactHref} target="_blank" rel="noopener">
					<strong>{c.emptyTitle}</strong>
					<span>{c.emptyBody.replace('{tier}', group.name)}</span>
				</a>
			{/if}
		</div>
	</section>
{/each}

<section class="wall-tier wall-supporter" aria-labelledby="tier-supporter">
	{@render vine(false)}
	{@render vine(true)}
	<div class="wall-inner">
		<div class="wall-head">
			<span class="wall-rule"></span>
			<h2 id="tier-supporter" class="wall-name">{c.tierNames.Supporter}</h2>
			<span class="wall-rule"></span>
		</div>
		<p class="wall-note">{c.supporterBody}</p>
		{#if c.supporters.length}
			<ul class="wall-names" use:lineStarts>{#each c.supporters as name, i}<li style:--delay={`-${((i * 0.37) % 1.4).toFixed(2)}s`}>{name}</li>{/each}</ul>
		{/if}
		<a class="wall-invite" href={contactHref} target="_blank" rel="noopener">{c.supporterInvite}</a>
	</div>
</section>

{#if c.thanks.length}
	<section class="wall-thanks" aria-labelledby="thanks-title">
		<div class="container">
			<h2 id="thanks-title">{c.thanksTitle}</h2>
			<svg class="wall-flourish" aria-hidden="true" viewBox="0 0 220 16"><path d="M4 10C40 2 70 14 110 8S180 2 216 9" /></svg>
			<!-- The team logo beside each name shows that person is part of the program. -->
			<ul class="wall-names" use:lineStarts>
				{#each c.thanks as name}<li><img class="wall-thanks-logo" src="/images/2026/Logos/eagle2.svg" alt={teamName} />{name}</li>{/each}
			</ul>
		</div>
	</section>
{/if}
