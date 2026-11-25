<script lang="ts">
	import Media from './Media.svelte';
	import { openPicture } from '#lib/lightbox.svelte.ts';
	import type { NewsCardData } from '#lib/server/content.ts';
	import { ui, type Locale } from '#lib/site.ts';

	interface Props { post: NewsCardData; locale: Locale; categories: Record<NewsCardData['category'], string>; soonLabel: string }
	let { post, locale, categories, soonLabel }: Props = $props();
</script>

<li class="card post"> 
	{#if post.url}
		<!-- A card with a link: the picture goes to the link, and the corner button opens the picture full-screen. -->
		<div class="post-media">
			<a href={post.url} tabindex="-1" aria-hidden="true" target="_blank" rel="noopener">
				<Media photo={post.photo} label={ui[locale].photoSoon} ratio="16 / 10" tone="navy" expand={false} />
			</a>
			{#if post.photo?.src}
				<button
					class="media-zoom" type="button" aria-label={`${ui[locale].viewPhoto}: ${post.title}`}
					data-zoom={post.photo.src} data-alt={post.photo.alt ?? ''} data-title={post.title}
					onclick={(event) => openPicture(event.currentTarget)}
				>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
				</button>
			{/if}
		</div>
	{:else}
		<div class="post-media">
			<Media photo={post.photo} label={ui[locale].photoSoon} ratio="16 / 10" tone="navy" title={post.title} />
		</div>
	{/if}
	<div class="card-body">
		<p class="post-meta"><span>{categories[post.category]}</span> · {post.dateLabel ?? soonLabel}</p>
		<h3>{#if post.url}<a href={post.url} target = "_blank" rel="noopener" >{post.title}</a>{:else}{post.title}{/if}</h3>
		<p>{post.summary}</p>
	</div>
</li>
