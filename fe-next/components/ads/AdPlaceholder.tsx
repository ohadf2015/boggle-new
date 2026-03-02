/**
 * AdPlaceholder Component
 *
 * Marks safe zones where advertisements can be placed according to AdSense policies.
 * In production, renders a real AdUnit. In development, shows a visual placeholder.
 *
 * CRITICAL AdSense Compliance Rules for Gaming Sites:
 * ✅ ALLOWED: Ads between game rounds, on content pages, in lobbies
 * ❌ PROHIBITED: Ads on active gameplay interfaces, during active game sessions
 *
 * Usage:
 * <AdPlaceholder zone="lobby" />
 * <AdPlaceholder zone="between-rounds" />
 * <AdPlaceholder zone="content-page" />
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AdUnit } from './AdUnit';

type AdZoneType =
  | 'lobby'
  | 'between-rounds'
  | 'content-page'
  | 'post-game'
  | 'menu';

/** Default ad sizes per zone — override with size prop */
const ZONE_SIZES: Record<AdZoneType, { width?: number; height?: number }> = {
  'content-page': {},                    // responsive (auto)
  'post-game':    { width: 300, height: 250 },
  'lobby':        { width: 300, height: 250 },
  'between-rounds': { width: 320, height: 100 },
  'menu':         {},                    // responsive (auto)
};

const ZONE_LABELS: Record<AdZoneType, string> = {
  'lobby': 'Safe Zone: Game Lobby',
  'between-rounds': 'Safe Zone: Between Rounds',
  'content-page': 'Safe Zone: Content Page',
  'post-game': 'Safe Zone: Post-Game',
  'menu': 'Safe Zone: Menu',
};

interface AdPlaceholderProps {
  zone: AdZoneType;
  className?: string;
  /** Show dev placeholder instead of real ad. Defaults to true in dev. */
  showPlaceholder?: boolean;
}

export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({
  zone,
  className,
  showPlaceholder = process.env.NODE_ENV === 'development',
}) => {
  // Production / test: render real AdSense unit (no theme dependency)
  if (!showPlaceholder) {
    const { width, height } = ZONE_SIZES[zone];
    return (
      <div data-ad-zone={zone} className={cn('ad-zone', className)}>
        <AdUnit
          adSlot="PENDING_APPROVAL"
          width={width}
          height={height}
        />
      </div>
    );
  }

  // Development: visual placeholder (lazy-import theme to avoid hook in production)
  return <DevPlaceholder zone={zone} className={className} />;
};

/** Dev-only placeholder that uses ThemeContext for styling */
const DevPlaceholder: React.FC<{ zone: AdZoneType; className?: string }> = ({ zone, className }) => {
  // useTheme is only called when showPlaceholder=true (dev mode)
  // Lazy-require avoids the hook call in production/test paths
  const { useTheme } = require('@/utils/ThemeContext');
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div
      data-ad-zone={zone}
      data-adsense-placeholder="true"
      className={cn(
        'ad-placeholder',
        'min-h-[100px] p-4 rounded-neo border-3 border-dashed',
        'flex flex-col items-center justify-center gap-2',
        isDarkMode
          ? 'bg-slate-800/50 border-slate-600 text-slate-400'
          : 'bg-gray-100 border-gray-300 text-gray-500',
        className
      )}
      aria-label={`Advertisement placeholder: ${zone}`}
    >
      <div className="text-xs font-black uppercase tracking-wider">
        {ZONE_LABELS[zone]}
      </div>
      <div className="text-[10px] opacity-70">
        AdSense Compliant Zone
      </div>
    </div>
  );
};

/**
 * Zone Compliance Documentation:
 *
 * SAFE ZONES (✅ Allowed by AdSense):
 * - lobby: Game lobby/waiting room before gameplay starts
 * - between-rounds: Shown after one round ends, before next begins
 * - content-page: Static pages like About, Contact, Legal, Rules
 * - post-game: After game completely ends, showing results
 * - menu: Main menu, settings, profile pages
 *
 * PROHIBITED ZONES (❌ NOT Allowed):
 * - active-game: During active gameplay (NEVER place ads here)
 * - game-board: On or near the active game board
 * - timer-active: While game timer is running
 */

export default AdPlaceholder;
