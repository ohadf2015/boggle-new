/**
 * Route-level loading boundary so /singleplayer does NOT inherit
 * app/[locale]/loading.tsx (PageLoader with priority=false). That generic
 * loader would fetch winner.webp as a competing low-priority image in
 * front of the layout LCP paint.
 *
 * Empty navy: the LCP <img> lives in layout.tsx (SinglePlayerLcpShell)
 * and must remain the only large image in the first HTML.
 */
export default function SinglePlayerLoading() {
  return <div className="fixed inset-0 z-[69] bg-neo-navy" aria-hidden />;
}
