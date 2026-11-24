<script lang="ts">
	/** Logo grid: real sponsor logos first, then "Your logo here" cells up to `cells`. */
	import type { Sponsor } from '#lib/server/content.ts';
	import { ui, type Locale } from '#lib/site.ts';

	interface Props { sponsors: Sponsor[]; locale: Locale; label: string; cells: number }
	let { sponsors, locale, label, cells }: Props = $props();
	const shown = $derived(sponsors.slice(0, cells));
	const empty = $derived(Math.max(0, cells - shown.length));
</script>

<ul class="logo-grid" aria-label={label}>
	{#each shown as sponsor (sponsor.name)}
		<li class="logo-cell logo-cell-real">
			{#if sponsor.website}
				<a href={sponsor.website} title={sponsor.name} target = "_blank" rel="noopener" ><img src={sponsor.logo.src} alt={sponsor.logo.alt || sponsor.name} loading="lazy" decoding="async" /></a>
			{:else}
				<img src={sponsor.logo.src} alt={sponsor.logo.alt || sponsor.name} loading="lazy" decoding="async" />
			{/if}
		</li>
	{/each}
	{#each { length: empty } as _}
		<li class="logo-cell">{ui[locale].logoSoon}</li>
	{/each}
</ul>
