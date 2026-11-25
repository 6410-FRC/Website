<script lang="ts">
	import GalleryPage from '#lib/components/pages/GalleryPage.svelte';
	import JoinPage from '#lib/components/pages/JoinPage.svelte';
	import NewsPage from '#lib/components/pages/NewsPage.svelte';
	import OutreachPage from '#lib/components/pages/OutreachPage.svelte';
	import RobotsPage from '#lib/components/pages/RobotsPage.svelte';
	import SponsorsPage from '#lib/components/pages/SponsorsPage.svelte';
	import TeamPage from '#lib/components/pages/TeamPage.svelte';

	let { data } = $props();
	const { view, locale, settings } = $derived(data);
</script>

<article class={['inner-page', `page-${view.view}`]}>
	<header class="page-header">
		<div class="container" style= "text-align:center; justify-content: center;" >
			<h1>{view.c.title}</h1>
			{#if view.view !== 'gallery'}<p>{view.c.intro}</p>{/if}
		</div>
	</header>
	{#if view.view === 'team'}<TeamPage {view} {locale} {settings} />
	{:else if view.view === 'robots'}<RobotsPage {view} {locale} />
	{:else if view.view === 'outreach'}<OutreachPage {view} {locale} {settings} />
	{:else if view.view === 'sponsors'}<SponsorsPage {view} {locale} {settings} />
	{:else if view.view === 'news'}<NewsPage {view} {locale} />
	{:else if view.view === 'gallery'}<GalleryPage {view} {locale} />
	{:else if view.view === 'join'}<JoinPage {view} {locale} {settings} />
	{/if}
</article>
