<script lang="ts">
	import Media from "../Media.svelte";
	import type { Settings } from "#lib/schema.ts";
	import type { ViewOf } from "#lib/server/pages.ts";
	import { routeFor, ui, type Locale } from "#lib/site.ts";

	interface Props {
		view: ViewOf<"team">;
		locale: Locale;
		settings: Settings;
	}
	let { view, locale, settings }: Props = $props();
	const c = $derived(view.c);
	const t = $derived(ui[locale]);
	/** Spanish text when it exists, otherwise the English text. */
	const pick = (en: string, es?: string | null) =>
		locale === "es" && es ? es : en;
</script>

<section class="section section-tight" aria-label={t.nav.team}>
	<div class="container">
		<div class="prose">
			{#each c.body as paragraph}<p>{paragraph}</p>{/each}
		</div>
		<Media
			photo={c.photo}
			label={t.photoSoon}
			ratio="21 / 9"
			tone="navy"
			class="wide-media"
		/>
	</div>
</section>

<section class="section band-gray" aria-labelledby="subteams-title">
	<div class="container">
		<div class="section-title">
			<h2 id="subteams-title">{c.subteams.title}</h2>
			<p>
				{c.subteams.intro}
				<a
					class="text-link"
					href="https://docs.google.com/forms/d/e/1FAIpQLScn_vRWJvyA4tG4gzb4vIXEHAoMFEfc4v3b-8PucwuYm8j9Lw/viewform?usp=dialog"
					target="_blank"
					rel="noopener"
				>
					{locale === "es"
						? "¿Qué roles te interesan?"
						: "Which roles interest you?"}
				</a>
			</p>
		</div>
		<ul class="cards cards-3">
			{#each view.subteams as team (team.nameEn)}
				<li class="card">
					<Media
						photo={team.photo}
						label={t.photoSoon}
						ratio="3 / 2"
						tone="gray"
						title={pick(team.nameEn, team.nameEs)}
						text={pick(team.summaryEn, team.summaryEs)}
					/>
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
		<Media
			photo={c.mentors.photo}
			label={t.photoSoon}
			ratio="4 / 3"
			tone="navy"
		/>
	</div>
</section>

<section class="section band-navy support" aria-labelledby="team-cta-title">
	<div class="container support-inner">
		<h2 id="team-cta-title">{c.cta.title}</h2>
		<p>{c.cta.body}</p>
		<a
			class="button button-gold"
			href={settings.joinFormUrl || routeFor(locale, "join")}
			>{c.cta.actionLabel}</a
		>
	</div>
</section>
