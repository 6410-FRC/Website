<script lang="ts">
	import Lightbox from '../Lightbox.svelte';
	import Media from '../Media.svelte';
	import type { Settings } from '#lib/schema.ts';
	import type { ViewOf } from '#lib/server/pages.ts';
	import { routeFor, ui, type Locale } from '#lib/site.ts';

	interface Props { view: ViewOf<'team'>; locale: Locale; settings: Settings }
	let { view, locale, settings }: Props = $props();
	const c = $derived(view.c);
	const t = $derived(ui[locale]);
	/** Spanish text when it exists, otherwise the English text. */
	const pick = (en: string, es?: string | null) => (locale === 'es' && es ? es : en);
	/* Subteams that have a picture: clicking one opens it in the full-screen viewer. */
	const gallery = $derived(view.subteams.filter((team) => team.photo?.src));
	const slides = $derived(gallery.map((team) => ({
		src: team.photo?.src ?? '', alt: team.photo?.alt ?? '',
		title: pick(team.nameEn, team.nameEs), text: pick(team.summaryEn, team.summaryEs)
	})));
	let open = $state<number | null>(null);
</script>

<section class="section section-tight " aria-label={t.nav.team}>
	<div class="container">
		<div class="prose">
			{#each c.body as paragraph}<p>{paragraph}</p>{/each}
		</div>
		<Media photo={c.photo} label={t.photoSoon} ratio="21 / 9" tone="navy" class="wide-media" />
	</div>
</section>

<section class="section band-gray" aria-labelledby="subteams-title">
	<div class="container">
		<div class="section-title">
			<h2 id="subteams-title">{c.subteams.title}</h2>
			<p>{c.subteams.intro}</p>
		</div>
		<ul class="cards cards-3">
			{#each view.subteams as team (team.nameEn)}
				<li class="card">
					{#if team.photo?.src}
						<button class="media-button" type="button" aria-label={`${t.viewPhoto}: ${pick(team.nameEn, team.nameEs)}`} onclick={() => (open = gallery.indexOf(team))}>
							<Media photo={team.photo} label={t.photoSoon} ratio="3 / 2" tone="gray" />
							<span class="media-zoom" aria-hidden="true">
								<svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
							</span>
						</button>
					{:else}
						<Media photo={team.photo} label={t.photoSoon} ratio="3 / 2" tone="gray" />
					{/if}
					<div class="card-body">
						<h3>{pick(team.nameEn, team.nameEs)}</h3>
						<p>{pick(team.summaryEn, team.summaryEs)}</p>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</section>

<section class="section" aria-labelledby="values-title">
	<div class="container">
		<div class="section-title">
			<h2 id="values-title">{c.values.title}</h2>
		</div>
		<ul class="features">
			{#each c.values.items as item}
				<li>
					<h3>{item.title}</h3>
					<p>{item.body}</p>
				</li>
			{/each}
		</ul>
	</div>
</section>

<section class="section band-gray" aria-labelledby="mentors-title">
	<div class="container split">
		<div>
			<h2 id="mentors-title">{c.mentors.title}</h2>
			<p>{c.mentors.body}</p>
		</div>
		<Media photo={c.mentors.photo} label={t.photoSoon} ratio="4 / 3" tone="navy" />
	</div>
</section>

<section class="section band-navy support" aria-labelledby="team-cta-title">
	<div class="container support-inner">
		<h2 id="team-cta-title">{c.cta.title}</h2>
		<p>{c.cta.body}</p>
		<a class="button button-gold" href={settings.joinFormUrl || routeFor(locale, 'join')}>{c.cta.actionLabel}</a>
	</div>
</section>

<Lightbox {slides} bind:index={open} labels={{ close: t.close, previous: t.previous, next: t.next }} />
