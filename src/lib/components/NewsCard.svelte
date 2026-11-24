<script lang="ts">
	import Media from './Media.svelte';
	import type { NewsCardData } from '#lib/server/content.ts';
	import { ui, type Locale } from '#lib/site.ts';

	interface Props { post: NewsCardData; locale: Locale; categories: Record<NewsCardData['category'], string>; soonLabel: string }
	let { post, locale, categories, soonLabel }: Props = $props();
</script>

<li class="card post"> 
	{#if post.url}
		<a href={post.url} 	tabindex="-1" aria-hidden="true" target = "_blank" rel="noopener">
			<Media photo={post.photo} label={ui[locale].photoSoon} ratio="16 / 10" tone="navy" /> 
		</a>
	{:else}
		<Media photo={post.photo} label={ui[locale].photoSoon} ratio="16 / 10" tone="navy" />
	{/if}
	<div class="card-body">
		<p class="post-meta"><span>{categories[post.category]}</span> · {post.dateLabel ?? soonLabel}</p>
		<h3>{#if post.url}<a href={post.url} target = "_blank" rel="noopener" >{post.title}</a>{:else}{post.title}{/if}</h3>
		<p>{post.summary}</p>
	</div>
</li>
