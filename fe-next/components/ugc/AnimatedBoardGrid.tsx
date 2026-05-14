'use client';

import { useMemo } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedBoardGridProps {
  grid: string[][] | null;
  gridSize: number;
  /** Increment to re-trigger the entrance animation */
  revision: number;
  isGenerating?: boolean;
  className?: string;
}

// ── Stagger order: center-outward BFS ───────────────────────────────────────

function centerOutwardOrder(size: number): Array<[number, number]> {
  const center = Math.floor(size / 2);
  const result: Array<[number, number]> = [];
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [[center, center]];
  visited.add(`${center},${center}`);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    result.push([r, c]);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
      const nr = r + dr, nc = c + dc, key = `${nr},${nc}`;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(key)) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return result;
}

// ── Tile sizes ──────────────────────────────────────────────────────────────

const TILE_SIZES: Record<number, string> = {
  4: 'w-14 h-14 text-lg sm:w-16 sm:h-16 sm:text-xl',
  5: 'w-11 h-11 text-base sm:w-13 sm:h-13 sm:text-lg',
  6: 'w-9 h-9 text-sm sm:w-11 sm:h-11 sm:text-base',
};

const STAGGER = 0.035; // seconds between tiles

/**
 * AnimatedBoardGrid — Fun staggered drop-in grid with bouncy springs.
 *
 * Tiles drop from above with elastic overshoot, staggered from center outward.
 * Each tile gets a tiny random rotation for playfulness.
 * Empty state shows dashed ghost tiles.
 * Respects prefers-reduced-motion.
 */
export function AnimatedBoardGrid({
  grid,
  gridSize,
  revision,
  isGenerating,
  className,
}: AnimatedBoardGridProps) {
  const prefersReduced = useReducedMotion();

  // Pre-compute delay for each cell based on center-outward order
  const delayMap = useMemo(() => {
    const order = centerOutwardOrder(gridSize);
    const map: number[][] = Array.from({ length: gridSize }, () => new Array(gridSize).fill(0));
    order.forEach(([r, c], i) => { map[r][c] = i * STAGGER; });
    return map;
  }, [gridSize]);

  // Stable random rotations per revision (so they don't change on re-render)
  const wobbles = useMemo(() => {
    const w: number[][] = [];
    for (let r = 0; r < gridSize; r++) {
      w[r] = [];
      for (let c = 0; c < gridSize; c++) {
        // seeded-ish wobble from position + revision
        w[r][c] = ((r * 7 + c * 13 + revision * 3) % 11 - 5) * 0.8; // range: -4 to +4 degrees
      }
    }
    return w;
  }, [gridSize, revision]);

  const tileClass = TILE_SIZES[gridSize] ?? TILE_SIZES[4];

  return (
    <div
      data-testid="animated-board-grid"
      className={cn('inline-flex flex-col gap-1.5', className)}
      aria-label="Board preview"
    >
      {Array.from({ length: gridSize }, (_, r) => (
        <div key={r} className="flex gap-1.5">
          {Array.from({ length: gridSize }, (_, c) => {
            const letter = grid?.[r]?.[c];
            const hasLetter = letter != null && letter !== '';
            const delay = delayMap[r][c];
            const wobble = wobbles[r][c];

            return (
              <AnimatePresence mode="wait" key={`cell-${r}-${c}`}>
                <m.div
                  key={`${revision}-${r}-${c}`}
                  // ── Entry: drop from above with bounce ──
                  initial={prefersReduced
                    ? { opacity: 0 }
                    : { y: -60, scale: 0.3, opacity: 0, rotate: wobble * 2 }
                  }
                  animate={prefersReduced
                    ? { opacity: 1 }
                    : {
                        y: 0,
                        scale: 1,
                        opacity: 1,
                        rotate: hasLetter ? wobble : 0,
                      }
                  }
                  // ── Exit: pop out ──
                  exit={prefersReduced
                    ? { opacity: 0 }
                    : { scale: 0, opacity: 0, transition: { duration: 0.15 } }
                  }
                  transition={prefersReduced
                    ? { duration: 0.15, delay: delay * 0.3 }
                    : {
                        type: 'spring',
                        stiffness: 420,
                        damping: 12,
                        mass: 0.7,
                        delay,
                      }
                  }
                  // ── Hover juice ──
                  whileHover={!prefersReduced && hasLetter ? {
                    scale: 1.12,
                    rotate: 0,
                    transition: { type: 'spring', stiffness: 500, damping: 15 },
                  } : undefined}
                  whileTap={!prefersReduced && hasLetter ? {
                    scale: 0.9,
                    transition: { type: 'spring', stiffness: 600, damping: 20 },
                  } : undefined}
                  className={cn(
                    tileClass,
                    'flex items-center justify-center cursor-default',
                    'border-neo border-black rounded-neo',
                    'font-neo-display font-bold uppercase select-none',
                    hasLetter
                      ? 'bg-neo-navy-light text-neo-white shadow-hard'
                      : 'bg-neo-navy/30 text-transparent border-dashed border-neo-white/10 shadow-none',
                    isGenerating && !hasLetter && 'animate-pulse',
                  )}
                >
                  {hasLetter ? letter : '\u00A0'}
                </m.div>
              </AnimatePresence>
            );
          })}
        </div>
      ))}

      {/* Generating shimmer */}
      <AnimatePresence>
        {isGenerating && (
          <m.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center mt-2 font-neo-body text-xs text-neo-cyan/80 animate-pulse"
          >
            ✦ generating...
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}
