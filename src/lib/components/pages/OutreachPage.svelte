<script lang="ts">
	import Media from '../Media.svelte';
	import type { Settings } from '#lib/schema.ts';
	import type { ViewOf } from '#lib/server/pages.ts';
	import { routeFor, ui, type Locale } from '#lib/site.ts';

	interface Props { view: ViewOf<'outreach'>; locale: Locale; settings: Settings }
	let { view, locale, settings }: Props = $props();
	const c = $derived(view.c);
	const t = $derived(ui[locale]);
	const pick = (en: string, es?: string | null) => (locale === 'es' && es ? es : en);
</script>

<section class="section section-tight" aria-labelledby="programs-title">
	<div class="container">
		<div class="prose">
			{#each c.body as paragraph}<p>{paragraph}</p>{/each}
		</div>
		<h2 id="programs-title" class="section-heading" style="text-align: left;" >{c.programsTitle}</h2>
		<div class="program-list">
			{#each view.programs as program, i (program.titleEn)}
				<div class={['split', { 'split-reverse': i % 2 === 1 }]}>
					<div>
						<h3>{pick(program.titleEn, program.titleEs)}</h3>
						<p>{pick(program.bodyEn, program.bodyEs)}</p>
					</div>
					<Media photo={program.photo} label={t.photoSoon} ratio="4 / 3" tone={i % 2 === 1 ? 'navy' : 'gray'} title={pick(program.titleEn, program.titleEs)} />
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="section band-gray" aria-labelledby="invite-title">
	<div class="container split">
		<div>
			<h2 id="invite-title">{c.invite.title}</h2>
			<p>{c.invite.body}</p>
			<a class="button" href={settings.contactFormUrl || routeFor(locale, 'join')}>{c.invite.actionLabel}</a>
		</div>
		<div class="panel">
			<ul class="check-list">
				{#each c.invite.items as item}<li>{item}</li>{/each}
			</ul>
		</div>
	</div>
</section>
