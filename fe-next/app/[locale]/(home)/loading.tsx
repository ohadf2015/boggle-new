import { STYLE_KEYS } from '@/lib/playerStyle/styles';
import { LoadingDancer } from '@/components/ui/LoadingDancer';

/**
 * Homepage loading state — a single random dancing mascot on the dark canvas.
 *
 * Replaces the old page-shaped skeleton (season strip + hero + cubes bento): a
 * busy skeleton that then swaps to the real landing read as its own flash, and
 * "skeleton + moving mascot" felt off. One calm dancing cube greets the player
 * while the landing streams in behind it.
 *
 * The `/[locale]` route is dynamic (server-rendered per request), so this Server
 * Component fallback re-runs each request — a fresh random pose bops on every
 * visit ("random mascot every time") with zero client JS and no hydration risk.
 */

// Genre styles only (`default` has no /mascots/styles PNG; `k_pop.png` is a
// 320KB outlier vs the ≤94KB rest — excluded to keep the loader featherweight).
const DANCERS = STYLE_KEYS.filter((k) => k !== 'default' && k !== 'k_pop');

export default function Loading() {
  // Impure-in-render is intentional: this is a per-request dynamic Server
  // Component fallback (rendered once, never re-rendered), so picking fresh each
  // request IS the feature, not a re-render instability.
  // eslint-disable-next-line react-hooks/purity
  const styleKey = DANCERS[Math.floor(Math.random() * DANCERS.length)];
  return (
    // In-flow viewport-tall loader (min-h-[100svh]): `h-full` collapsed to
    // content height on mobile Chromium (short loader → CLS), and the later
    // `fixed inset-0` version took the loader OUT of flow entirely — leaving an
    // empty page where the footer sat visible under the header, so the content
    // swap shoved it on-screen (the CLS 1.0 footer shift). In-flow + viewport
    // height keeps the footer below the fold during load, so the swap happens
    // off-screen and counts ~zero CLS.
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-6 bg-neo-navy">
      <LoadingDancer
        styleKey={styleKey}
        className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44"
      />
      {/* Three bouncing dots — a lightweight "loading" affordance under the cube. */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-neo-lime animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
