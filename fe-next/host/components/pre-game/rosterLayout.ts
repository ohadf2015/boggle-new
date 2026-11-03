import { useEffect, useState, type RefObject } from 'react';
import { LOBBY_SEATS } from '@/components/multiplayer/lobby/lobbySeats';

/** Tiles a TV wall draws at most: 10 columns x 3 rows (up to 18 seats fit 9 x 2). */
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
    return { dense: true, cols: 'min-[720px]:grid-cols-9', seat: '[--seat:clamp(48px,7vh,110px)]', shown: seated };
  }
  return {
    dense: true,
    cols: 'min-[720px]:grid-cols-10',
    seat: '[--seat:clamp(40px,6vh,84px)]',
    shown: seated > TV_WALL_TILES ? TV_WALL_TILES - 1 : seated,
  };
}

export interface DeskWall {
  dense: boolean;
  grid: string;
  seat: string;
}

const DESK_SEAT = '[--seat:calc(56px*var(--mp-u,1))] tall:[--seat:calc(64px*var(--mp-u,1))]';
/** The mode picker and its card need ~33rem under the header; the roster scrolls inside what is left. */
const DESK_CAP = 'min-[720px]:max-h-[max(10rem,calc(100dvh-33rem))] min-[720px]:overflow-y-auto min-[720px]:overscroll-contain min-[720px]:pt-4';

/** ≥720px host/guest roster: past 8 seats, smaller seats fill the column's width instead of adding 4-wide rows. */
export function deskWall(seated: number): DeskWall {
  if (seated <= LOBBY_SEATS) {
    return {
      dense: false,
      grid: `min-[720px]:grid-cols-4 ${DESK_CAP}`,
      seat: `${DESK_SEAT} min-[720px]:[--seat:min(calc(84px*var(--mp-u,1)),9vh)] desktop-tall:[--seat:min(calc(96px*var(--mp-u,1)),11vh)]`,
    };
  }
  return {
    dense: true,
    grid: `min-[720px]:grid-cols-[repeat(auto-fill,minmax(calc(var(--seat)+20px),1fr))] ${DESK_CAP}`,
    seat: `${DESK_SEAT} min-[720px]:[--seat:min(calc(64px*var(--mp-u,1)),7vh)]`,
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

/** Player seats (`[data-player]`) in `ref`'s own scroll box whose centre sits below its fold; re-measured on scroll and resize. */
export function useHiddenBelow(ref: RefObject<HTMLElement | null>, itemCount: number): number {
  const [hidden, setHidden] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const fold = el.getBoundingClientRect().bottom;
      let below = 0;
      el.querySelectorAll('[data-player]').forEach((seat) => {
        const r = seat.getBoundingClientRect();
        if (r.height > 0 && r.top + r.height / 2 > fold) below += 1;
      });
      setHidden(below);
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, [ref, itemCount]);
  return hidden;
}
