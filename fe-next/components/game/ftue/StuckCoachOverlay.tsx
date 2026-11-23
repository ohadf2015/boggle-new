'use client';

/**
 * The one mount point for the stuck-player coach, in every word mode.
 *
 * Without an anchor it goes in the MP phone tray (or the screen's foot). With
 * anchors, it takes the first band of the mode's own layout that holds no
 * letters or controls and has room for it: `over` an empty words list (within
 * its width), or `below` the board. The wrapper is pointer-events-none so the
 * board stays playable while it is up.
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { MPStuckCoachCard } from '@/components/game/ftue/MPStuckCoachCard';
import { MpTrayNudge } from '@/components/multiplayer/round/MpRoundTray';
import type { StuckCoach } from '@/hooks/useStuckCoach';

export interface StuckCoachAnchor {
  selector: string;
  edge: 'over' | 'below';
}

type Box = { top: number; left?: number; width?: number };

const GAP_PX = 8;

function placeAgainst(anchors: StuckCoachAnchor[], height: number): Box | null {
  let fallback: Box | null = null;
  for (const anchor of anchors) {
    const r = document.querySelector(anchor.selector)?.getBoundingClientRect();
    if (!r || (!r.width && !r.height)) continue;
    const wanted = anchor.edge === 'over' ? r.top : r.bottom + GAP_PX;
    const top = Math.max(GAP_PX, Math.min(wanted, window.innerHeight - height - GAP_PX));
    // Over a band: stay inside it. Below a board: the whole width under it is free.
    const box = anchor.edge === 'over' ? { top, left: r.left, width: r.width } : { top };
    if (top === wanted) return box;
    fallback ??= box;
  }
  return fallback;
}

const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width);

function AnchoredSlot({ anchors, children }: { anchors: StuckCoachAnchor[]; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const anchorsRef = useRef(anchors);
  anchorsRef.current = anchors;
  const key = anchors.map((a) => `${a.edge}:${a.selector}`).join('|');

  useLayoutEffect(() => {
    const place = () => {
      const next = placeAgainst(anchorsRef.current, ref.current?.offsetHeight ?? 0);
      setBox((prev) => (sameBox(prev, next) ? prev : next));
    };
    place();
    // The card's height depends on the width it is given, so re-place once it settles.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    if (ref.current) observer?.observe(ref.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [key]);

  return (
    <div
      ref={ref}
      data-testid="stuck-coach-overlay"
      style={box ?? undefined}
      className={
        !box
          ? 'pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-3'
          : box.width === undefined
            ? 'pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-3'
            : 'pointer-events-none fixed z-[60] flex justify-center'
      }
    >
      {children}
    </div>
  );
}

export function StuckCoachOverlay({
  coach,
  anchor,
}: {
  coach: StuckCoach;
  /** One band, or several to try in order. */
  anchor?: StuckCoachAnchor | readonly StuckCoachAnchor[];
}) {
  if (!coach.visible) return null;
  const card = (
    <MPStuckCoachCard stage={coach.stage} mode={coach.mode} exampleWord={coach.exampleWord} onDismiss={coach.dismiss} />
  );
  if (!anchor) return <MpTrayNudge>{card}</MpTrayNudge>;
  const anchors: StuckCoachAnchor[] = 'selector' in anchor ? [anchor] : [...anchor];
  return <AnchoredSlot anchors={anchors}>{card}</AnchoredSlot>;
}

export default StuckCoachOverlay;
