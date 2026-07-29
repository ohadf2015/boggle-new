/**
 * TileBadge Component
 *
 * Renders badges/indicators for special adventure tiles (gold, bomb, time, frost)
 * Extracted from AdventureGrid.tsx to improve maintainability.
 */

import { Bomb, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TileType } from '@/types/adventure';

export interface TileBadgeProps {
  /** Type of tile to render badge for */
  type: TileType;
  /** Whether ice tile is frozen (shows frost overlay) */
  isFrozen?: boolean;
}

/**
 * Renders appropriate badge/overlay for special tile types
 *
 * Badge types:
 * - Gold: 3x multiplier badge
 * - Bomb: Bomb icon + row indicator
 * - Time: Clock icon + 5s
 * - Ice (frozen): Frost overlay
 * - Standard: No badge
 */
export function TileBadge({ type, isFrozen = false }: TileBadgeProps) {
  // Gold tile - 3x multiplier badge
  if (type === 'gold') {
    return (
      <span
        className={cn(
          'tile-gold-badge',
          'absolute -top-1.5 -inset-e-1.5 z-20',
          'min-w-6 h-6',
          'flex items-center justify-center',
          'bg-neo-black text-neo-yellow',
          'text-[11px] font-black',
          'rounded-full border-2 border-neo-yellow',
          'shadow-[0_0_10px_rgba(255,225,53,0.7)]'
        )}
      >
        3x
      </span>
    );
  }

  // Bomb tile - icon badge + row indicator
  if (type === 'bomb') {
    return (
      <>
        <div
          className={cn(
            'absolute -top-1 -inset-e-1 z-20',
            'w-6 h-6',
            'flex items-center justify-center',
            'bg-neo-black rounded-full',
            'border-2 border-orange-500',
            'shadow-[0_0_8px_rgba(255,100,0,0.6)]'
          )}
        >
          <Bomb className="w-3 h-3 text-neo-yellow" />
        </div>
        {/* Row indicator - shows bomb clears entire row */}
        <div className="tile-bomb-row-indicator">
          <span />
        </div>
      </>
    );
  }

  // Time tile - clock icon badge
  if (type === 'time') {
    return (
      <div
        className={cn(
          'absolute -top-1 -inset-e-1 z-20',
          'w-6 h-6',
          'flex items-center justify-center',
          'bg-neo-black rounded-full',
          'border-2 border-emerald-400',
          'shadow-[0_0_8px_rgba(16,185,129,0.6)]'
        )}
      >
        <Clock className="w-3 h-3 text-emerald-400" />
      </div>
    );
  }

  // Ice tile (frozen) - frost overlay
  if (type === 'ice' && isFrozen) {
    return (
      <div
        className={cn(
          'frost-overlay absolute inset-0 rounded-neo',
          'bg-linear-to-br from-white/50 via-cyan-100/40 to-blue-200/50',
          'pointer-events-none z-5'
        )}
      />
    );
  }

  // Standard tiles - no badge
  return null;
}
