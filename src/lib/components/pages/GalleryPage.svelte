<script lang="ts">
    import type { ViewOf } from '#lib/server/pages.ts';
    import { routeFor, type Locale } from '#lib/site.ts';
    import { viewer } from '#lib/lightbox.svelte.ts';

    let { view, locale }: { view: ViewOf<'gallery'>; locale: Locale } = $props();
    const es = $derived(locale === 'es');
    type Album = ViewOf<'gallery'>['albums'][number];

    function albumTitle(album: Album) {
        return es ? album.titleEs || album.title : album.title;
    }

    function photoAlt(photo: Album['photos'][number]) {
        return es ? photo.altEs || photo.alt : photo.alt;
    }

    function openAlbum(album: Album) {
        // The existing site lightbox handles swipe, arrows, keyboard and zoom.
        viewer.slides = album.photos.map(photo => ({
            src: photo.src, alt: photoAlt(photo), title: albumTitle(album)
        }));
        viewer.index = 0;
    }
</script>

<section class="section section-tight" aria-label={view.c.title}>
    <div class="container">
        <p class="gallery-intro">{view.c.intro}</p>
        <div class="album-grid">
            {#each view.albums as album (album.title)}
                <button class="album" type="button" onclick={() => openAlbum(album)}
                    aria-label={`${albumTitle(album)} — ${album.photos.length} ${es ? 'fotos' : 'photos'}`}>
                    <span class="stack" class:single={album.photos.length === 1}>
                        <span class="cover">
                            <span class="cover-picture">
                                <img src={album.photos[0].src} alt={photoAlt(album.photos[0])} loading="lazy" decoding="async" />
                                <span class="photo-count">{album.photos.length} {es ? 'fotos' : 'photos'}</span>
                            </span>
                        </span>
                    </span>
                    <span class="album-name">{albumTitle(album)}</span>
                    {#if album.date}<span class="album-meta">{es ? album.dateEs || album.date : album.date}</span>{/if}
                </button>
            {:else}
                <p class="album-empty">{es ? 'Fotos próximamente.' : 'Photos coming soon.'}</p>
            {/each}
        </div>
        <div class="gallery-toolbar">
            <a class="button button-gold" href={`${routeFor(locale, 'gallery')}videos/`}>Videos</a>
        </div>
    </div>
</section>

<style>
    .gallery-intro { text-align: center; font-size: clamp(1.1rem, 2.1vw, 1.3rem); color: var(--navy); margin-bottom: 1.75rem; }
    .album-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2.25rem 1.875rem; }
    .album { display: block; width: 100%; min-width: 0; border: 0; background: transparent; color: var(--navy); font: inherit; text-align: center; padding: .75rem .875rem 0; cursor: pointer; }
    .stack { position: relative; display: block; isolation: isolate; margin: 0 .5rem .95rem; }
    .stack::before, .stack::after { content: ''; position: absolute; inset: 0; border: 1px solid #cdd4dd; border-radius: 7px; background: #e8edf3; box-shadow: 0 3px 9px #0b25451a; z-index: -1; transition: transform .25s; }
    .stack::before { transform: rotate(-6deg); }
    .stack::after { transform: rotate(5deg); background: #f5f6f7; }
    .stack.single::before, .stack.single::after { display: none; }
    .album:hover .stack::before, .album:focus-visible .stack::before { transform: rotate(-10deg) translate(-3px, -2px); }
    .album:hover .stack::after, .album:focus-visible .stack::after { transform: rotate(9deg) translate(4px, -2px); }
    .cover { display: block; background: #fff; padding: 9px 9px 12px; border: 1px solid #d8dde5; border-radius: 7px; box-shadow: 0 6px 14px #0b254520; transition: transform .25s; }
    .album:hover .cover, .album:focus-visible .cover { transform: translateY(-4px); }
    .cover-picture { display: block; position: relative; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 3px; background: var(--navy); }
    .cover-picture img { width: 100%; height: 100%; object-fit: cover; }
    .photo-count { position: absolute; bottom: 9px; right: 9px; background: #0b2545df; color: white; border-radius: 5px; padding: 4px 9px; font-size: .75rem; }
    .album-name { display: block; font-size: 1.35rem; font-weight: 700; line-height: 1.25; margin-bottom: .25rem; }
    .album-meta { display: block; color: var(--slate); font-size: .9rem; }
    .album-empty { grid-column: 1 / -1; text-align: center; color: var(--slate); }
    .gallery-toolbar { display: flex; justify-content: flex-end; margin-top: 2.25rem; }
    @media (max-width: 780px) { .album-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem .875rem; } .album { padding: .5rem .5rem 0; } .album-name { font-size: 1.15rem; } }
    @media (max-width: 480px) { .album-grid { gap: 1.375rem .5rem; } .stack { margin: 0 .2rem .625rem; } .cover { padding: 5px 5px 8px; } .album-name { font-size: 1.05rem; } .photo-count { font-size: .65rem; right: 5px; bottom: 5px; } }
    @media (prefers-reduced-motion: reduce) { .stack::before, .stack::after, .cover { transition: none; } }
</style>
