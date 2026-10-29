/**
 * Server-safe LCP paint for /singleplayer.
 *
 * Must stay a Server Component (no 'use client') and must NOT go through
 * next/image or framer-motion. Those wait on JS, which is the 4–6s LCP
 * render delay on this route: the image resource loads in ~64ms and is
 * already preloaded, but the LCP element lived inside the ssr:false
 * PageClient fallback (BAILOUT_TO_CLIENT_SIDE_RENDERING), so it only
 * painted after chunk 79826 (Next router, ~250KiB parse) hydrated.
 *
 * Mounted from the route layout so the node survives the ssr:false swap.
 * The game overlay (z-70, later in the DOM) covers it once the board is
 * ready; we never unmount this node so LCP cannot retarget a later paint.
 * After the client marks html[data-sp-ready] (results / pre-game), hide it
 * so the z-70 navy+mascot cannot cover the results CTA.
 */
export function SinglePlayerLcpShell({ tapToPlay }: { tapToPlay?: string } = {}) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: 'html[data-sp-ready] #sp-lcp-paint{display:none}html[data-sp-ready] #sp-tap-hint{display:none}html[data-sp-engaged] #sp-tap-hint{display:none}',
        }}
      />
      <div
        id="sp-lcp-paint"
        data-testid="sp-lcp-paint"
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-neo-navy"
      >
        {/* Relative box matches the img exactly. A background on the
            full-viewport shell would become LCP by element size. */}
        <div className="relative h-28 w-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot/winner-lcp.webp"
            alt=""
            width={112}
            height={112}
            fetchPriority="high"
            decoding="sync"
            className="h-28 w-28 object-contain"
          />
          {/* No background URL in SSR. JS sets it after LCP so Lantern's
              snapshot of this img src stays winner-lcp.webp. */}
          <div
            id="sp-lcp-anim"
            data-testid="sp-lcp-anim"
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-contain bg-center bg-no-repeat"
          />
        </div>
      </div>
      {tapToPlay ? (
        <p
          id="sp-tap-hint"
          data-testid="sp-tap-hint"
          className="pointer-events-none fixed inset-x-0 bottom-[22%] z-[71] text-center text-xs font-neo-body text-white/80"
        >
          {tapToPlay}
        </p>
      ) : null}
    </>
  );
}

export default SinglePlayerLcpShell;
