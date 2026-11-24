<script lang="ts">
	import NewsCard from '../NewsCard.svelte';
	import type { ViewOf } from '#lib/server/pages.ts';
	import { ui, type Locale } from '#lib/site.ts';

	interface Props { view: ViewOf<'news'>; locale: Locale }
	let { view, locale }: Props = $props();
	const c = $derived(view.c);
</script>

<section class="section section-tight" aria-label={ui[locale].nav.news}>
	<div class="container">
		<div class="prose" style="text-align: center;">
			{#each c.body as paragraph}<p>{paragraph}</p>{/each}
		</div>
		<ul class="category-list" aria-label={locale === 'es' ? 'Categorías' : 'Categories'}>
			{#each [c.allLabel, ...Object.values(c.categories)] as category, i}<li class={{ active: i === 0 }}>{category}</li>{/each}
		</ul>
		{#if view.posts.length}
			<ul class="cards cards-3">
				{#each view.posts as post (post.slug)}
					<NewsCard {post} {locale} categories={c.categories} soonLabel={c.soonLabel} />
				{/each}
			</ul>
		{/if}
		<p class="note">{c.note}</p>
	</div>
</section>
