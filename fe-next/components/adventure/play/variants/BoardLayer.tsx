'use client';

/**
 * Overlay that paints FOG clouds and BOMB fuses exactly over the board's tiles.
 * It measures the live tile rects (`[data-row][data-col]` in the sibling grid),
 * so it follows any board size/skin; pointer-events are off so drags reach tiles.
 */
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bomb as BombIcon } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { BombState } from './rules';
import type { BoardPop } from './useLevelVariant';
import './variants.css';

type Rects = Record<string, { x: number; y: number; w: number; h: number }>;

interface Props {
  fog: Set<string> | null;
  bombs: BombState | null;
  pops: BoardPop[];
  size: number;
}

function useTileRects(layer: React.RefObject<HTMLDivElement | null>, size: number): Rects {
  const [rects, setRects] = useState<Rects>({});
  useLayoutEffect(() => {
    const el = layer.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const out: Rects = {};
      host.querySelectorAll<HTMLElement>('[role="grid"] [data-row][data-col]').forEach((c) => {
        const k = `${c.dataset.row}-${c.dataset.col}`;
        if (out[k]) return;
        const r = c.getBoundingClientRect();
        out[k] = { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
      });
      setRects(out);
    };
    measure();
    // The board scales in on mount; settle after its entrance.
    const timers = [120, 450, 1000].map((ms) => setTimeout(measure, ms));
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    const grid = host.querySelector('[role="grid"]');
    if (ro) { ro.observe(host); if (grid) ro.observe(grid); }
    window.addEventListener('resize', measure);
    return () => { timers.forEach(clearTimeout); ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [layer, size]);
  return rects;
}

function BoardLayer({ fog, bombs, pops, size }: Props) {
  const { t } = useLanguageSafe();
  const ref = useRef<HTMLDivElement>(null);
  const rects = useTileRects(ref, size);
  const [shownPops, setShownPops] = useState<BoardPop[]>([]);
  useEffect(() => {
    setShownPops(pops);
    if (!pops.length) return;
    const id = setTimeout(() => setShownPops([]), 1200);
    return () => clearTimeout(id);
  }, [pops]);

  const keys = Object.keys(rects);
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-[15]" aria-hidden data-testid="variant-board-layer">
      {fog && keys.map((k) => {
        const r = rects[k];
        const [row, col] = k.split('-').map(Number);
        return (
          <span key={`fog-${k}`} className="fog-tile" data-clear={fog.has(k) ? 'true' : 'false'}
            style={{ left: r.x - 1, top: r.y - 1, width: r.w + 2, height: r.h + 2, ['--d' as string]: `${((row * 7 + col * 3) % 10) * -0.5}s` }} />
        );
      })}
      {bombs?.bombs.map((b) => {
        const r = rects[b.key];
        if (!r) return null;
        const frac = Math.max(0, b.leftMs / b.fuseMs);
        return (
          <span key={`bomb-${b.key}`} className={cn('bomb-tile', b.leftMs <= 5000 && 'bomb-hot')}
            style={{ left: r.x, top: r.y, width: r.w, height: r.h }} data-testid="bomb-tile">
            <span className="bomb-ring" />
            <span className="bomb-badge" style={{ ['--fuse' as string]: frac }}>
              <BombIcon strokeWidth={2.75} />
            </span>
          </span>
        );
      })}
      {shownPops.map((p) => {
        const r = rects[p.key];
        if (!r) return null;
        return (
          <span key={p.id} className="bomb-pop" style={{ left: r.x - 20, top: r.y, width: r.w + 40, height: r.h }}>
            <span className={p.kind === 'boom' ? 'bg-neo-red' : 'bg-neo-lime'}>
              {p.kind === 'boom' ? t('adventurePlay.variety.bombBoom', { seconds: p.seconds ?? 5 }) : t('adventurePlay.variety.bombDefused')}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default memo(BoardLayer);
