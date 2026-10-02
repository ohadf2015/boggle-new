'use client';

import type { ReactNode } from 'react';
import { m } from 'framer-motion';

/** Phone: one scroller between the join bar and the docked teacher strip, so no row ends up under the controls. */
export default function TvBodyScroller({ children }: { children: ReactNode }) {
  return (
    <m.div
      layoutScroll
      data-testid="tv-classroom-body"
      className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain md:overflow-hidden"
    >
      {children}
    </m.div>
  );
}
