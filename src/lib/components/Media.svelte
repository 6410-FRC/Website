<script lang="ts">
	/**
	 * A picture area. Shows the real picture when the content file names one (with an optional caption
	 * and photo credit); otherwise a quiet navy or gray block with a short note such as "Team photo coming soon".
	 */
	import type { Image } from '#lib/schema.ts';

	interface Props { photo?: Image; label: string; ratio?: string; tone?: 'navy' | 'gray'; class?: string }
	let { photo, label, ratio = '4 / 3', tone = 'navy', class: className = '' }: Props = $props();
</script>

{#if photo?.src}
	{#if photo.caption || photo.credit}
		<figure class={['media-figure', className]}>
			<img class="media" src={photo.src} alt={photo.alt ?? ''} loading="lazy" decoding="async" style:--ratio={ratio} />
			<figcaption>{photo.caption}{#if photo.credit}<span class="media-credit">{photo.credit}</span>{/if}</figcaption>
		</figure>
	{:else}
		<img class={['media', className]} src={photo.src} alt={photo.alt ?? ''} loading="lazy" decoding="async" style:--ratio={ratio} />
	{/if}
{:else}
	<div class={['media', `media-${tone}`, className]} role="img" aria-label={label} style:--ratio={ratio}>
		<span>{label}</span>
	</div>
{/if}
