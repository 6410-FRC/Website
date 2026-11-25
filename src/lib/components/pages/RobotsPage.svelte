<script lang="ts">
	import Media from '../Media.svelte';
	import type { ViewOf } from '#lib/server/pages.ts';
	import { routeFor, ui, type Locale } from '#lib/site.ts';

	interface Props { view: ViewOf<'robots'>; locale: Locale }
	let { view, locale }: Props = $props();
	const c = $derived(view.c);
	const t = $derived(ui[locale]);
	/* Seasons marked `public: true`: the newest is featured, the rest fill the archive. */
	const featured = $derived(view.seasons[0]);
	const archive = $derived(view.seasons.slice(1));
	const pick = (en: string, es?: string | null) => (locale === 'es' && es ? es : en);
</script>

<section class="section section-tight" style="margin-bottom:0cm" aria-labelledby="current-title">
	<div class="container">
		<div class="section-title">
			<h2 id="current-title">{c.current.title}</h2>
		</div>
		<div class="season-card">
			<Media photo={featured ? featured.photo : c.current.photo} label={t.photoSoon} ratio="4 / 3" tone="navy" />
			<div class="season-card-body">
				<p class="kicker">{featured ? [featured.year, featured.gameName].filter(Boolean).join(' · ') : c.current.label}</p>
				<h3>{featured ? featured.robotName || featured.year : c.current.heading}</h3>
				<p>{featured ? pick(featured.summaryEn ?? '', featured.summaryEs) : c.current.body}</p>
				{#if featured?.blueAllianceUrl}<p><a class="text-link" href={featured.blueAllianceUrl}>The Blue Alliance</a></p>{/if}
			</div>
		</div>
	</div>
</section>

<!-- <section class="section band-gray" aria-labelledby="archive-title">
	<div class="container">
		<div class="section-title">
			<h2 id="archive-title">{c.archive.title}</h2>
			<p>{c.archive.body}</p>
		</div>
		<ul class="cards cards-3">
			{#each archive as season (season.year)}
				<li class="card">
					<Media photo={season.photo} label={t.photoSoon} ratio="4 / 3" tone="gray" title={[season.year, season.robotName].filter(Boolean).join(' · ')} />
					<div class="card-body">
						<h3>{[season.year, season.robotName].filter(Boolean).join(' · ')}</h3>
						<p>{season.gameName || pick(season.summaryEn ?? '', season.summaryEs)}</p>
						{#if season.blueAllianceUrl}<a class="text-link" href={season.blueAllianceUrl}>The Blue Alliance</a>{/if}
					</div>
				</li>
			{:else}
				{#each { length: 3 } as _}
					<li class="card">
						<Media label={t.photoSoon} ratio="4 / 3" tone="gray" />
						<div class="card-body">
							<h3>{c.archive.placeholderTitle}</h3>
							<p>{c.archive.placeholderCaption}</p>
						</div>
					</li>
				{/each}
			{/each}
		</ul>
	</div>
</section> -->

<section class="section section-tight" aria-labelledby="process-title">
	<div class="container">
		<div class="section-title" style= " text-align: center; justify-content: center;">
			<h2 id="process-title">{c.process.title}</h2>
		</div>
		<ol class="features features-numbered">
			{#each c.process.items as item}
				<li>
					<h3>{item.title}</h3>
					<p>{item.body}</p>
				</li>
			{/each}
		</ol>
	</div>
</section>

<section class="section band-navy support" aria-labelledby="robots-cta-title">
	<div class="container support-inner">
		<h2 id="robots-cta-title">{c.cta.title}</h2>
		<p>{c.cta.body}</p>
		<a class="button button-gold" href={routeFor(locale, 'news')}>{c.cta.actionLabel}</a>
	</div>
</section>
