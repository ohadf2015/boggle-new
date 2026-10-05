'use client';

/**
 * Crawler-facing copy below the lobby — in the HTML, never in the layout.
 *
 * This route server-renders GamePageSeoContent + a for-schools CTA BELOW the
 * client tree so a HowTo JSON-LD is not describing three unseen steps (crawler
 * previously saw 17 words here). The block is ~740px tall.
 *
 * Toggling it out of flow after lobby mount (`hidden` or a class swap) is the
 * classroom-game CLS (p75 0.57 / 230 loads): first paint includes 740px, then
 * the lobby hides it. Keep the node in the DOM for crawlers, but clip it out
 * of layout on the FIRST paint — no isInGame toggle.
 */

import type { ReactNode } from 'react';

const CLIP =
  'pointer-events-none absolute h-0 w-0 overflow-hidden';

export function LobbySeoTail({ children }: { children: ReactNode }) {
  return <div className={CLIP}>{children}</div>;
}

export default LobbySeoTail;
