import { useEffect, useState, type RefObject } from 'react';
import { LOBBY_SEATS } from '@/components/multiplayer/lobby/lobbySeats';

/** Tiles a TV wall draws at most: 10 columns x 3 rows. */
export const TV_WALL_TILES = 30;

export interface TvWall {
  dense: boolean;
  cols: string;
  seat: string;
  /** Seats drawn; the rest collapse into one "+N" tile. */
  shown: number;
}

/** A bigger room gets more, smaller tiles so the roster never pushes the mode card off a 720p projector. */
export function tvWall(seated: number): TvWall {
  if (seated <= LOBBY_SEATS) {
    return { dense: false, cols: 'min-[720px]:grid-cols-4', seat: '[--seat:clamp(80px,12vh,150px)]', shown: seated };
  }
  if (seated <= 18) {
    return { dense: true, cols: 'min-[720px]:grid-cols-6', seat: '[--seat:clamp(56px,9vh,110px)]', shown: seated };
  }
  return {
    dense: true,
    cols: 'min-[720px]:grid-cols-10',
    seat: '[--seat:clamp(44px,7vh,84px)]',
    shown: seated > TV_WALL_TILES ? TV_WALL_TILES - 1 : seated,
  };
}

/**
 * How many player seats (`[data-player]`) in `stripRef` sit past the scroller's
 * end edge (the left edge in RTL); empty chairs don't count. A seat is hidden
 * once its centre is outside.
 */
export function useHiddenAhead(stripRef: RefObject<HTMLElement | null>, itemCount: number): number {
  const [hidden, setHidden] = useState(0);
  useEffect(() => {
    const strip = stripRef.current;
    const root = strip?.parentElement;
    if (!strip || !root || typeof IntersectionObserver === 'undefined') return;
    const rtl = root.closest('[dir]')?.getAttribute('dir') === 'rtl';
    const ahead = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const edge = e.rootBounds;
        const mid = (e.boundingClientRect.left + e.boundingClientRect.right) / 2;
        const past = !!edge && (rtl ? mid < edge.left : mid > edge.right);
        if (past) ahead.add(e.target);
        else ahead.delete(e.target);
      }
      setHidden(ahead.size);
    }, { root, threshold: [0, 0.5, 1] });
    strip.querySelectorAll('[data-player]').forEach((seat) => io.observe(seat));
    return () => {
      io.disconnect();
      setHidden(0);
    };
  }, [stripRef, itemCount]);
  return hidden;
}
