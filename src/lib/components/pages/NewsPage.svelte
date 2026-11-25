<script lang="ts">
	import NewsCard from '../NewsCard.svelte';
	import type { ViewOf } from '#lib/server/pages.ts';
	import { ui, type Locale } from '#lib/site.ts';

	interface Props { view: ViewOf<'news'>; locale: Locale }
	let { view, locale }: Props = $props();
	const c = $derived(view.c);
	type Category = keyof typeof c.categories;
	/* The filter buttons: 'all', or one category to show. */
	let selected = $state<'all' | Category>('all');
	const filters = $derived([['all', c.allLabel], ...Object.entries(c.categories)] as ['all' | Category, string][]);
	const shown = $derived(selected === 'all' ? view.posts : view.posts.filter((post) => post.category === selected));
</script>

<section class="section section-tight" aria-label={ui[locale].nav.news}>
	<div class="container">
		<div class="prose">
			{#each c.body as paragraph}<p>{paragraph}</p>{/each}
		</div>
		<ul class="category-list" aria-label={locale === 'es' ? 'Filtrar por categoría' : 'Filter by category'}>
			{#each filters as [key, label] (key)}
				<li><button type="button" class={{ active: selected === key }} aria-pressed={selected === key} onclick={() => (selected = key)}>{label}</button></li>
			{/each}
		</ul>
		{#if shown.length}
			<ul class="cards cards-3">
				{#each shown as post (post.slug)}
					<NewsCard {post} {locale} categories={c.categories} soonLabel={c.soonLabel} />
				{/each}
			</ul>
		{:else if view.posts.length}
			<p class="category-empty" aria-live="polite">{locale === 'es' ? 'Todavía no hay publicaciones en esta categoría.' : 'No posts in this category yet.'}</p>
		{/if}
		<p class="note">{c.note}</p>
	</div>
</section>
