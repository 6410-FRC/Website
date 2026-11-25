<script lang="ts">
    import { routeFor } from '#lib/site.ts';
    let { data } = $props();
    const es = $derived(data.locale === 'es');
</script>

<article class="inner-page page-gallery-videos">
    <header class="page-header">
        <div class="container" style="text-align: center;">
            <h1>{es ? 'Galería de videos' : 'Video Gallery'}</h1>
        </div>
    </header>
    <section class="section section-tight">
        <div class="container">
            <p class="video-intro">{data.meta.description}</p>
            <div class="video-grid">
                {#each data.videos as video (video.youtubeId)}
                    {@const title = es ? video.titleEs || video.title : video.title}
                    <article class="card">
                        <iframe
                            src={`https://www.youtube.com/embed/${video.youtubeId}`}
                            {title} loading="lazy" allowfullscreen
                            allow="encrypted-media; picture-in-picture; fullscreen"
                            referrerpolicy="strict-origin-when-cross-origin"
                        ></iframe>
                        <div class="card-body"><h2>{title}</h2></div>
                    </article>
                {:else}
                    <p class="video-empty">{es ? 'Videos próximamente.' : 'Videos coming soon.'}</p>
                {/each}
            </div>
            <p class="video-back"><a class="button button-gold" href={routeFor(data.locale, 'gallery')}>{es ? 'Volver a la galería' : 'Back to Gallery'}</a></p>
        </div>
    </section>
</article>

<style>
    .video-intro { font-size: 1.25rem; text-align: center; color: var(--navy); margin-bottom: 2rem; }
    .video-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.75rem; }
    .video-grid iframe { display: block; width: 100%; aspect-ratio: 16 / 9; min-height: 200px; border: 0; background: var(--navy); }
    .video-grid h2 { font-size: 1.35rem; margin: 0; }
    .video-empty { grid-column: 1 / -1; text-align: center; color: var(--slate); padding: 2rem; }
    .video-back { display: flex; justify-content: flex-end; margin-top: 2rem; }
    @media (max-width: 760px) { .video-grid { grid-template-columns: 1fr; } }
</style>
