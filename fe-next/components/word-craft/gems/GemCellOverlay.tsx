'use client';

import { memo, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { GemCell } from '@/lib/word-craft/gems/types';
import { GemIcon } from './GemIcon';

export interface GemCellOverlayProps {
  gemCells: GemCell[];
}

/**
 * Renders gem icons absolutely-positioned on top of the WordCraft board cells.
 * Reads the live data-board-cell DOM nodes so its layout follows the grid
 * even on container-query resize.
 */
function GemCellOverlayImpl({ gemCells }: GemCellOverlayProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // Twinkle: tween a faint rotate/scale on each gem icon to draw the eye.
  useEffect(() => {
    if (!wrapRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to('[data-gem-cell]', {
        rotation: '+=8',
        scale: 1.05,
        duration: 1.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.18, repeat: -1, yoyo: true },
        transformOrigin: 'center',
      });
    }, wrapRef);
    return () => ctx.revert();
  }, [gemCells.length]);

  return (
    <div ref={wrapRef} aria-hidden className="pointer-events-none absolute inset-0">
      {gemCells.map((gem) => (
        <GemAnchor key={gem.id} gem={gem} />
      ))}
    </div>
  );
}

interface GemAnchorProps {
  gem: GemCell;
}

function GemAnchor({ gem }: GemAnchorProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Read the cell's bounding rect each frame is overkill; React re-renders on
  // resize via parent container queries. We compute style inline once per
  // render and trust the cell IDs stay stable per gem.
  useEffect(() => {
    const reposition = () => {
      const target = document.querySelector<HTMLElement>(`[data-board-cell="${gem.row},${gem.col}"]`);
      const overlay = ref.current;
      if (!target || !overlay) return;
      const parent = overlay.parentElement!;
      const targetRect = target.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      overlay.style.left = `${targetRect.left - parentRect.left}px`;
      overlay.style.top = `${targetRect.top - parentRect.top}px`;
      overlay.style.width = `${targetRect.width}px`;
      overlay.style.height = `${targetRect.height}px`;
    };
    reposition();
    const ro = new ResizeObserver(reposition);
    const parent = ref.current?.parentElement;
    if (parent) ro.observe(parent);
    window.addEventListener('resize', reposition);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', reposition);
    };
  }, [gem.row, gem.col]);

  return (
    <div
      ref={ref}
      data-gem-cell={gem.id}
      className="absolute flex items-center justify-center"
      style={{ left: 0, top: 0 }}
    >
      <GemIcon color={gem.color} rarity={gem.rarity} withRing dataGemId={gem.id} />
    </div>
  );
}

export const GemCellOverlay = memo(GemCellOverlayImpl);
