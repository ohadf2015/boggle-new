/**
 * EloRankBadge Component
 *
 * Displays a player's ELO rating with their rank tier.
 * Neo-brutalist styled badge for use in lobby, leaderboard, profile.
 */

'use client';

import React from 'react';
import { m } from 'framer-motion';
import { getRankTier } from '@/shared/utils/eloRating';

export interface EloRankBadgeProps {
  rating: number;
  /** Rating change from last game (positive or negative) */
  ratingChange?: number;
  /** 'default' shows tier name + rating, 'compact' shows just rating */
  size?: 'default' | 'compact';
}

/**
 * ELO rank badge showing tier color, name, and rating number.
 * Optionally shows rating change with +/- indicator.
 */
export const EloRankBadge: React.FC<EloRankBadgeProps> = ({
  rating,
  ratingChange,
  size = 'default',
}) => {
  const tier = getRankTier(rating);
  const isCompact = size === 'compact';

  return (
    <m.div
      className={`inline-flex items-center ${isCompact ? 'gap-1' : 'gap-2'}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Tier color dot */}
      <m.div
        className={`rounded-full border-2 border-neo-black ${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`}
        style={{ backgroundColor: tier.color }}
      />

      {/* Tier name (default size only) */}
      {!isCompact && (
        <span
          className="font-black text-xs uppercase tracking-wide"
          style={{ color: tier.color }}
        >
          {tier.name}
        </span>
      )}

      {/* Rating number */}
      <span className={`font-black text-neo-white ${isCompact ? 'text-xs' : 'text-sm'}`}>
        {rating}
      </span>

      {/* Rating change indicator */}
      {ratingChange !== undefined && ratingChange !== 0 && (
        <m.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className={`text-xs font-bold ${
            ratingChange > 0 ? 'text-neo-lime' : 'text-neo-red'
          }`}
        >
          {ratingChange > 0 ? `+${ratingChange}` : `${ratingChange}`}
        </m.span>
      )}
    </m.div>
  );
};

export default EloRankBadge;
