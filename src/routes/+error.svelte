<script lang="ts">
	import { page } from '$app/state';
	import { ui } from '#lib/site.ts';

	const locale = $derived(page.url.pathname.startsWith('/es') ? 'es' : 'en');
	const t = $derived(ui[locale]);
</script>

<svelte:head><title>{t.notFound} | WingNuts 6410</title></svelte:head>

<main id="main" class="inner-page">
	<header class="page-header">
		<div class="container">
			<h1>{page.status === 404 ? t.notFound : page.status}</h1>
			<p><a class="text-link" href={`/${locale}/`}>{t.backHome}</a></p>
		</div>
	</header>
</main>
