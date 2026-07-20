'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WordTowerActionMenuProps {
  /** The action controls (upgrades / skin / leaderboard …) revealed on expand. */
  children: ReactNode;
  reducedMotion?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * One top-bar button that ANIMATES OPEN to reveal the tower's secondary actions
 * (upgrades, skin, leaderboard), instead of a permanent row of buttons crowding
 * — and overlapping — the header (founder ask 2026-07-17: "one button on top that
 * with animation grows to show all these options"). Collapsed by default so the
 * play area's top stays clean; the wallet + altitude readout live outside it and
 * stay visible.
 *
 * The revealed cluster grows/fades in from the button on the end side; a tap
 * outside (or the button again) collapses it. Under reduced motion it just
 * shows/hides with no grow tween.
 */
export function WordTowerActionMenu({ children, reducedMotion = false, t }: WordTowerActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Tap anywhere outside the menu to collapse it, so it never lingers open over
  // the tower once the player has picked (or decided against) an action.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div ref={rootRef} className="flex items-center gap-1.5">
      {/* Revealed action cluster — grows out of zero width on the start side of
          the toggle. `max-w` + opacity + scale animate the "grow"; when closed it
          is fully collapsed AND non-interactive so it can't catch stray taps. */}
      <div
        className={cn(
          'flex items-center gap-1 overflow-hidden',
          reducedMotion ? '' : 'transition-all duration-300 ease-out',
          open
            ? 'max-w-[260px] scale-100 opacity-100'
            : 'pointer-events-none max-w-0 scale-95 opacity-0',
        )}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t(open ? 'wordTower.hud.menuClose' : 'wordTower.hud.menuOpen')}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-neo-thick border-black bg-neo-navy-light text-neo-white shadow-hard backdrop-blur-sm',
          'hover:scale-105 hover:bg-neo-navy hover:text-neo-cyan hover:border-neo-cyan/50 hover:shadow-hard-lg',
          'active:scale-95 active:text-neo-cyan active:border-neo-cyan',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan',
          reducedMotion ? '' : 'transition-all duration-200',
        )}
      >
        {open ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-6 w-6" />}
      </button>
    </div>
  );
}
