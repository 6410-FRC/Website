<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import BrandMark from './BrandMark.svelte';
	import type { Settings } from '#lib/schema.ts';
	import { routeFor, routes, splitTeamName, ui, type Locale, type PageKey } from '#lib/site.ts';

	interface Props { locale: Locale; page?: PageKey; settings: Settings }
	let { locale, page, settings }: Props = $props();

	const other = $derived<Locale>(locale === 'en' ? 'es' : 'en');
	const t = $derived(ui[locale]);
	const nav = $derived(Object.keys(routes[locale]) as PageKey[]);
	const brand = $derived(splitTeamName(settings.teamName));

	/* Mobile menu */
	let open = $state(false);
	let button = $state<HTMLButtonElement>();
	let menu = $state<HTMLElement>();
	afterNavigate(() => { open = false; });

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) { open = false; button?.focus(); }
	}
	function onclick(event: MouseEvent) {
		const target = event.target as Node;
		if (open && !menu?.contains(target) && !button?.contains(target)) open = false;
	}
</script>

<svelte:document {onkeydown} {onclick} />

<a class="skip-link" href="#main">{t.skip}</a>
{#if settings.announcement}
	<div class="announcement">
		<div class="container">
			{#if settings.announcementUrl}<a href={settings.announcementUrl}>{settings.announcement}</a>{:else}{settings.announcement}{/if}
		</div>
	</div>
{/if}
<header class="site-header">
	<div class="header-inner">
		<a class="brand" href={routeFor(locale)} aria-label={`${settings.teamName} — ${t.nav.home}`}>
			<BrandMark />
			<span class="brand-text">
				<span class="brand-name">{brand[0]} {#if brand[1]}<span class="brand-num">{brand[1]}</span>{/if}</span>
				<span class="brand-school">{settings.schoolName}</span>
			</span>
		</a>
		<nav id="site-nav" class={['site-nav', { open }]} aria-label={t.primaryNav} bind:this={menu}>
			{#each nav as key (key)}
				<a class={{ active: page === key }} href={routeFor(locale, key)} aria-current={page === key ? 'page' : undefined}>{t.nav[key]}</a>
			{/each}
			<a class="nav-lang" href={routeFor(other, page)} lang={other} hreflang={other}>{t.language}</a>
		</nav>
		<div class="header-actions">
			<a class="lang" href={routeFor(other, page)} lang={other} hreflang={other}>{t.language}</a>
			<a class="button button-gold button-small" href={settings.sponsorFormUrl || routeFor(locale, 'sponsors')}>{t.support}</a>
			<button class="menu-toggle" type="button" aria-expanded={open} aria-controls="site-nav" bind:this={button} onclick={() => (open = !open)}>
				<span>{open ? t.close : t.menu}</span><i aria-hidden="true"></i>
			</button>
		</div>
	</div>
</header>
