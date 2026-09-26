'use client';

/**
 * The entry's lazy islands, declared at route level.
 *
 * EntryScreen is an SSR'd next/dynamic entry. Under Turbopack dev (Next 16.2.6)
 * any async loader inside its own chunk group gets a phantom chunk name in the
 * react-loadable-manifest. The server preloads that name, it 404s, and the
 * pre-hydration chunk guard (utils/chunkBootGuard.ts) hard-reloads the page.
 * entryChrome.ts, which the page imports, pulls this module into the route's
 * chunk group, so these loaders are already present when the entry chunk
 * arrives. Pinned by entry/__tests__/entryChunkGroup.test.ts.
 */
import dynamic from 'next/dynamic';

/** The help sheet's body: the full how-to-play, only fetched when the ? opens. */
export const LazyHowToPlay = dynamic(() => import('@/components/HowToPlay'), { ssr: false });

/** The avatar editor (a large SVG part library), only fetched when the pencil opens it. */
export const LazyEntryAvatarBuilder = dynamic(() => import('./EntryAvatarBuilder'), { ssr: false });
