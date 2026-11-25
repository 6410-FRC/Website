<script lang="ts">
	/**
	 * A picture area. Shows the real picture when the content file names one (with an optional caption
	 * and photo credit); otherwise a quiet navy or gray block with a short note such as "Team photo coming soon".
	 * A real picture is a button that opens the full-screen viewer, where `title` and `text` show under it.
	 * Use `expand={false}` for a picture that sits inside a link; a content file can also say `expand: false` on a photo.
	 */
	import { page } from '$app/state';
	import { openPicture } from '#lib/lightbox.svelte.ts';
	import type { Image } from '#lib/schema.ts';
	import { isLocale, ui } from '#lib/site.ts';

	interface Props {
		photo?: Image; label: string; ratio?: string; tone?: 'navy' | 'gray'; class?: string;
		expand?: boolean; title?: string; text?: string;
	}
	let { photo, label, ratio = '4 / 3', tone = 'navy', class: className = '', expand = true, title, text }: Props = $props();
	const canExpand = $derived(expand && photo?.expand !== false);
	const lang = $derived(page.params.lang ?? '');
	const viewPhoto = $derived(ui[isLocale(lang) ? lang : 'en'].viewPhoto);
</script>

{#snippet picture(image: NonNullable<Image>, extra: string)}
	{@const alt = (lang === 'es' ? image.altEs?.trim() || image.alt : image.alt) ?? ''}
	{#if canExpand}
		<button
			class={['media-button', extra]} type="button" aria-label={`${viewPhoto}: ${title || alt}`}
			data-zoom={image.src} data-alt={alt} data-title={title ?? image.caption ?? ''} data-text={text ?? ''}
			onclick={(event) => openPicture(event.currentTarget)}
		>
			<img class="media" src={image.src} {alt} loading="lazy" decoding="async" style:--ratio={ratio} />
			<span class="media-zoom" aria-hidden="true">
				<svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
			</span>
		</button>
	{:else}
		<img class={['media', extra]} src={image.src} {alt} loading="lazy" decoding="async" style:--ratio={ratio} />
	{/if}
{/snippet}

{#if photo?.src}
	{#if photo.caption || photo.credit}
		<figure class={['media-figure', className]}>
			{@render picture(photo, '')}
			<figcaption>{photo.caption}{#if photo.credit}<span class="media-credit">{photo.credit}</span>{/if}</figcaption>
		</figure>
	{:else}
		{@render picture(photo, className)}
	{/if}
{:else}
	<div class={['media', `media-${tone}`, className]} role="img" aria-label={label} style:--ratio={ratio}>
		<span>{label}</span>
	</div>
{/if}
