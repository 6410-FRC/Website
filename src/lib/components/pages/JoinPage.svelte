<script lang="ts">
	import type { Settings } from '#lib/schema.ts';
	import type { ViewOf } from '#lib/server/pages.ts';
	import { routeFor, type Locale } from '#lib/site.ts';

	interface Props { view: ViewOf<'join'>; locale: Locale; settings: Settings }
	let { view, locale, settings }: Props = $props();
	const c = $derived(view.c);
	/* Button links for Students, Mentors and Sponsors when a path has no `url` of its own. */
	const defaults = $derived([
		settings.joinFormUrl || routeFor(locale, 'team'),
		settings.contactFormUrl || settings.joinFormUrl || routeFor(locale, 'team'),
		routeFor(locale, 'sponsors')
	]);
</script>

<section class="section section-tight" aria-label={locale === 'es' ? 'Caminos para unirse' : 'Ways to join'}>
	<div class="container" style="text-align: center;">
		<div class="prose" style="white-space: nowrap; font-size: 1rem; text-align: center;">
			{#each c.body as paragraph}<p>{paragraph}</p>{/each}
		</div>
		<ul class="cards cards-3">
			{#each c.paths as path, i (path.title)}
				<li class="card path">
					<div class="card-body">
						<h2>{path.title}</h2>
						<p>{path.body}</p>
						<!-- <ol class="step-list">
							{#each path.steps as step}<li>{step}</li>{/each}
						</ol> -->
						<a class="button button-outline" href={path.url || defaults[i] || routeFor(locale, 'join')} style="align-self: center;">{path.actionLabel}</a>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</section>

<section class="section band-gray" aria-labelledby="meeting-title">
	<div class="container split contact-split">
		<div>
			<h2 id="meeting-title">{c.meeting.title}</h2>
			<p>{c.meeting.body}</p>
		</div>
		<div class="panel">
			<h2>{c.contact.title}</h2>
			<p>
   <p>
    {#each c.contact.body.split(/(Email|Phone)/) as part}
        {#if part === 'Phone'}
            <br />
            <strong>{part}</strong>
        {:else if part === 'Email'}
            <strong>{part}</strong>
        {:else}
            {part}
        {/if}
    {/each}
</p>
			{#if view.files.length}
				<ul class="check-list downloads">
					{#each view.files as file (file.file)}<li><a href={file.file} download>{file.title}</a></li>{/each}
				</ul>
			{/if}
		</div>
	</div>
</section>
