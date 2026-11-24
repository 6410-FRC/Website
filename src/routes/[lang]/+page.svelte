<script lang="ts">
	import Media from '#lib/components/Media.svelte';
	import NewsCard from '#lib/components/NewsCard.svelte';
	import SponsorGrid from '#lib/components/SponsorGrid.svelte';
	import { routeFor, splitTeamName, ui } from '#lib/site.ts';

	let { data } = $props();
	const { locale, settings } = $derived(data);
	const c = $derived(data.c);
	const t = $derived(ui[locale]);
	const brand = $derived(splitTeamName(settings.teamName));
</script>

<!-- Hero -->
<section class="hero" aria-labelledby="hero-title">
	<div class="container hero-grid">
		<div class="hero-copy">
			<p class="kicker">{c.hero.kicker}</p>
			<h1 id="hero-title">{brand[0]} {#if brand[1]}<span>{brand[1]}</span>{/if}</h1>
			<p class="hero-tagline">{c.hero.tagline}</p>
			<p class="hero-lead">{c.hero.lead}</p>
			<div class="button-row">
				<a class="button" href={settings.joinFormUrl || routeFor(locale, 'join')}>{c.hero.joinLabel}</a>
				<a class="button button-outline" href={routeFor(locale, 'sponsors')}>{c.hero.sponsorLabel}</a>
			</div>
		</div>
		<Media photo={c.hero.photo} label={t.photoSoon} ratio="4 / 3" tone="navy" class="hero-media" />
	</div>
</section>

<!-- About -->
<section class="section" aria-labelledby="about-title">
	<div class="container split">
		<div>
			<h2 id="about-title">{c.about.title}</h2>
			{#each c.about.body as paragraph}<p>{paragraph}</p>{/each}
			<a class="button button-outline" href={routeFor(locale, 'team')}>{c.about.actionLabel}</a>
		</div>
		<Media photo={c.about.photo} label={t.photoSoon} ratio="4 / 3" tone="gray" />
	</div>
</section>

<!-- Robot -->
<section class="section band-navy" aria-labelledby="robot-title">
	<div class="container split split-reverse">
		<div>
			<p class="kicker">{c.robot.label}</p>
			<h2 id="robot-title">{c.robot.title}</h2>
			<p>{c.robot.body}</p>
			<a class="button button-gold" href={routeFor(locale, 'robots')}>{c.robot.actionLabel}</a>
		</div>
		<Media photo={c.robot.photo} label={t.photoSoon} ratio="4 / 3" tone="navy" />
	</div>
</section>

<!-- Team life -->
<section class="section" aria-labelledby="life-title">
	<div class="container">
		<div class="section-title">
			<h2 id="life-title">{c.life.title}</h2>
			<p>{c.life.intro}</p>
		</div>
		<ul class="cards cards-3">
			{#each c.life.cards as card}
				<li class="card">
					<Media photo={card.photo} label={t.photoSoon} ratio="4 / 3" tone="gray" />
					<div class="card-body">
						<h3>{card.title}</h3>
						<p>{card.caption}</p>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</section>

<!-- Latest updates -->
<section class="section band-gray" aria-labelledby="news-title">
	<div class="container">
		<div class="section-title row">
			<h2 id="news-title">{c.news.title}</h2>
			<a class="text-link" href={routeFor(locale, 'news')}>{c.news.actionLabel}</a>
		</div>
		{#if data.posts.length}
			<ul class="cards cards-3">
				{#each data.posts as post (post.slug)}
					<NewsCard {post} {locale} categories={data.news.categories} soonLabel={data.news.soonLabel} />
				{/each}
			</ul>
		{:else}
			<p class="note">{data.news.note}</p>
		{/if}
	</div>
</section>

<!-- Sponsors -->
<section class="section" aria-labelledby="sponsors-title">
	<div class="container">
		<div class="section-title center">
			<h2 id="sponsors-title">{c.sponsors.title}</h2>
			<p>{c.sponsors.body}</p>
		</div>
		<SponsorGrid sponsors={data.sponsors} {locale} label={c.sponsors.title} cells={8} />
		<p class="center-link"><a class="text-link" href={routeFor(locale, 'sponsors')}>{c.sponsors.actionLabel}</a></p>
	</div>
</section>

<!-- Support -->
<section class="section band-navy support" aria-labelledby="support-title">
	<div class="container support-inner">
		<h2 id="support-title">{c.support.title}</h2>
		<p>{c.support.body}</p>
		<div class="button-row">
			<a class="button button-gold" href={settings.sponsorFormUrl || routeFor(locale, 'sponsors')}>{c.support.actionLabel}</a>
			<a class="button button-outline" href={settings.joinFormUrl || routeFor(locale, 'join')}>{c.support.secondaryLabel}</a>
		</div>
	</div>
</section>
