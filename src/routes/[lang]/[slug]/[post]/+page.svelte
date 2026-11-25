<script lang="ts">
	import Media from '#lib/components/Media.svelte';
	import { openPicture } from '#lib/lightbox.svelte.ts';
	import { routeFor, ui } from '#lib/site.ts';

	let { data } = $props();
	const post = $derived(data.post);
</script>

<article class="inner-page page-news story">
	<header class="page-header">
		<div class="container">
			<p class="post-meta"><span>{post.categoryLabel}</span>{#if post.dateLabel} · {post.dateLabel}{/if}</p>
			<h1>{post.title}</h1>
			<p>{post.summary}</p>
		</div>
	</header>
	<section class="section section-tight">
		<div class="container">
			{#if post.photo?.src}<Media photo={post.photo} label="" ratio="16 / 9" class="wide-media" />{/if}
			<!-- Story text comes from the team's own Markdown files in src/content/news/. -->
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div class="prose story-body" onclick={(event) => event.target instanceof HTMLImageElement && openPicture(event.target)}>{@html post.html}</div>
			<p class="center-link"><a class="text-link" href={routeFor(data.locale, 'news')}>{ui[data.locale].allNews}</a></p>
		</div>
	</section>
</article>
