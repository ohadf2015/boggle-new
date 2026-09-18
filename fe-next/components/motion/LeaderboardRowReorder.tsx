'use client';

/**
 * LeaderboardRowReorder — Layout-animated leaderboard row reordering
 *
 * When rows change position (e.g., a player's rank updates), animates the
 * position change smoothly over ~300ms. On reduced-motion, the animation
 * is instant (handled by Framer Motion's MotionConfig).
 *
 * Uses AdaptiveMotion.li for each row to respect reduced-motion and low-end devices.
 *
 * @example
 * ```tsx
 * <LeaderboardRowReorder
 *   rows={players}
 *   renderRow={(player) => <div>{player.displayName}</div>}
 *   duration={300}
 * />
 * ```
 */

import React, { useMemo } from 'react';
import { AdaptiveMotion } from './AdaptiveMotion';

interface LeaderboardRowReorderProps<T extends { id: string }> {
  /** Array of rows to render */
  rows: T[];
  /** Render function for each row */
  renderRow: (row: T, index: number) => React.ReactNode;
  /** Animation duration in ms (default 300) */
  duration?: number;
}

export function LeaderboardRowReorder<T extends { id: string }>({
  rows,
  renderRow,
  duration = 300,
}: LeaderboardRowReorderProps<T>) {
  // Memoize the animation config to ensure stable references
  const transitionConfig = useMemo(
    () => ({
      layout: { type: 'spring' as const, damping: 20, stiffness: 300, mass: 1 },
      duration: duration / 1000, // Convert ms to seconds for spring
    }),
    [duration]
  );

  return (
    <ul
      className="flex flex-col gap-0"
      data-testid="leaderboard-reorder"
      style={{ listStyle: 'none', padding: 0, margin: 0 }}
    >
      {rows.map((row, index) => (
        <AdaptiveMotion.li
          key={row.id}
          layout
          transition={transitionConfig.layout}
          className="w-full"
        >
          {renderRow(row, index)}
        </AdaptiveMotion.li>
      ))}
    </ul>
  );
}

export default LeaderboardRowReorder;
