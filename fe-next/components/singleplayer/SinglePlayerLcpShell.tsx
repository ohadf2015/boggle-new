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
          __html: 'html[data-sp-ready] #sp-lcp-paint{display:none}html[data-sp-ready] #sp-tap-hint{display:none}',
        }}
      />
      <div
        id="sp-lcp-paint"
        data-testid="sp-lcp-paint"
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-neo-navy"
      >
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
