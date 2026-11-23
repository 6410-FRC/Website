<script lang="ts">
	import { page } from '$app/state';
	import Footer from '#lib/components/Footer.svelte';
	import Header from '#lib/components/Header.svelte';
	import { SITE_URL, routeFor } from '#lib/site.ts';

	let { data, children } = $props();

	const meta = $derived(page.data.meta);
	const siteName = $derived(data.settings.teamName);
	const canonical = $derived(SITE_URL + (meta?.path ?? routeFor(data.locale, meta?.page)));
	/* A news story exists in one language only, so it has no "other language" link. */
	const alternates = $derived(meta?.path ? undefined : { en: SITE_URL + routeFor('en', meta?.page), es: SITE_URL + routeFor('es', meta?.page) });
	const shareImage = $derived(meta?.image || data.settings.seo?.shareImage?.src);
</script>

<svelte:head>
	{#if meta}
		<title>{meta.title} | {siteName}</title>
		<meta name="description" content={meta.description} />
		<link rel="canonical" href={canonical} />
		{#if alternates}
			<link rel="alternate" hreflang="en" href={alternates.en} />
			<link rel="alternate" hreflang="es" href={alternates.es} />
			<link rel="alternate" hreflang="x-default" href={alternates.en} />
		{/if}
		<meta property="og:title" content={`${meta.title} | ${siteName}`} />
		<meta property="og:description" content={meta.description} />
		<meta property="og:type" content="website" />
		<meta property="og:url" content={canonical} />
		{#if shareImage}<meta property="og:image" content={new URL(shareImage, SITE_URL).href} />{/if}
	{/if}
</svelte:head>

<Header locale={data.locale} page={meta?.page} settings={data.settings} />
<main id="main">{@render children()}</main>
<Footer locale={data.locale} settings={data.settings} />
