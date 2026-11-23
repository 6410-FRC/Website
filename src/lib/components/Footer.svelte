<script lang="ts">
	import BrandMark from './BrandMark.svelte';
	import type { Settings } from '#lib/schema.ts';
	import { routeFor, routes, ui, type Locale, type PageKey } from '#lib/site.ts';

	interface Props { locale: Locale; settings: Settings }
	let { locale, settings }: Props = $props();

	const t = $derived(ui[locale]);
	const other = $derived<Locale>(locale === 'en' ? 'es' : 'en');
	const nav = $derived(Object.keys(routes[locale]) as PageKey[]);
	const social = $derived(settings.socialLinks ?? []);
	const year = new Date().getFullYear();
</script>

<footer class="site-footer">
	<div class="container">
		<div class="footer-grid">
			<div class="footer-brand">
				<a class="brand" href={routeFor(locale)}>
					<BrandMark />
					<span class="brand-text"><span class="brand-name">{settings.teamName}</span></span>
				</a>
				<p>{t.footer.tagline}</p>
				<p class="footer-affiliation">{t.footer.affiliation} {settings.schoolName}<br />{t.location}</p>
			</div>
			<div class="footer-col">
				<h2>{t.footer.explore}</h2>
				<ul>
					<li><a href={routeFor(locale)}>{t.nav.home}</a></li>
					{#each nav as key (key)}<li><a href={routeFor(locale, key)}>{t.nav[key]}</a></li>{/each}
				</ul>
			</div>
			<div class="footer-col">
				<h2>{t.footer.contact}</h2>
				<p>{t.footer.contactNote}</p>
				<ul>
					<li><a href={settings.contactFormUrl || routeFor(locale, 'join')}>{t.nav.join}</a></li>
					<li><a href={routeFor(other)} lang={other} hreflang={other}>{t.language}</a></li>
				</ul>
			</div>
			<div class="footer-col">
				<h2>{t.footer.follow}</h2>
				<ul class="footer-social">
					{#if social.length}
						{#each social as link (link.url)}<li><a href={link.url}>{link.label}</a></li>{/each}
					{:else}
						{#each t.footer.social as name (name)}<li>{name} <span>({t.footer.comingSoon})</span></li>{/each}
					{/if}
				</ul>
			</div>
		</div>
		<div class="footer-legal">
			<p>© {year} {settings.teamName} · {settings.schoolName}</p>
			<p>{t.footer.legal}</p>
		</div>
	</div>
</footer>
