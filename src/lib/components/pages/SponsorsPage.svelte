<script lang="ts">
	import SponsorGrid from '../SponsorGrid.svelte';
	import type { Settings } from '#lib/schema.ts';
	import type { ViewOf } from '#lib/server/pages.ts';
	import { routeFor, type Locale } from '#lib/site.ts';

	interface Props { view: ViewOf<'sponsors'>; locale: Locale; settings: Settings }
	let { view, locale, settings }: Props = $props();
	const c = $derived(view.c);
</script>

<section class="section section-tight" aria-labelledby="why-title">
	<div class="container">
		<div class="prose" style="text-align: center;">
			{#each c.body as paragraph}<p>{paragraph}</p>{/each}
		</div>
		<h2 id="why-title" class="section-heading">{c.why.title}</h2>
		<ul class="features">
			{#each c.why.items as item}
				<li>
					<h3>{item.title}</h3>
					<p>{item.body}</p>
				</li>
			{/each}
		</ul>
	</div>
</section>

<section class="section band-gray" aria-labelledby="tiers-title">
	<div class="container">
		<div class="section-title">
			<h2 id="tiers-title">{c.tiers.title}</h2>
			<p>{c.tiers.intro}</p>
		</div>
		<ul class="cards cards-4">
			{#each c.tiers.items as tier (tier.name)}
				<li class="card tier">
					<div class="card-body">
						<h3>{tier.name}</h3>
						<ul class="check-list">
							{#each tier.benefits as benefit}<li>{benefit}</li>{/each}
						</ul>
					</div>
				</li>
			{/each}
		</ul>
		{#if view.packets.length}
			<div class="button-row downloads">
				{#each view.packets as packet (packet.file)}<a class="button button-outline" href={packet.file}  target = "_blank" rel="noopener" download>{packet.title}</a>{/each}
			</div>
		{:else}
			<p class="note">{c.tiers.packetNote}</p>
		{/if}
	</div>
</section>

<section class="section" aria-labelledby="grid-title">
	<div class="container">
		<div class="section-title center">
			<h2 id="grid-title">{c.grid.title}</h2>
			<p>{c.grid.body}</p>
		</div>
		<SponsorGrid sponsors={view.sponsors} {locale} label={c.grid.title} cells={8} />
	</div>
</section>

<section class="section band-navy support" aria-labelledby="sponsors-cta-title">
	<div class="container support-inner">
		<h2 id="sponsors-cta-title">{c.cta.title}</h2>
		<p>{c.cta.body}</p>
		<a class="button button-gold" href={settings.sponsorFormUrl || settings.contactFormUrl || routeFor(locale, 'join')} target = "_blank" rel="noopener" >{c.cta.actionLabel}</a>
	</div>
</section>
