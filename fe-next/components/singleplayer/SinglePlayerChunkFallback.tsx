/**
 * Shown while the singleplayer game chunk is still loading.
 *
 * No mascot. PageLoader's default happy variant is winner.webp at 112x112
 * with fetchpriority=high — the same painted area as #sp-lcp-paint. r7 PSI
 * slow runs took LCP from that client img (resourceLoadDelay matched its
 * rendererStartTime). The visible mascot is the SSR shell; SpLcpSrcSwap
 * animates it after LCP. This placeholder must stay an empty navy box.
 */
export function SinglePlayerChunkFallback() {
  return (
    <div
      className="fixed inset-0 z-[69] overflow-hidden bg-neo-navy"
      translate="no"
      aria-busy="true"
      aria-label="Loading single player"
      data-testid="sp-chunk-pending"
    />
  );
}
