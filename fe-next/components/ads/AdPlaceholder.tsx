/**
 * AdPlaceholder Component
 *
 * Marks safe zones where advertisements can be placed according to AdSense policies.
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
import { useTheme } from '@/utils/ThemeContext';

type AdZoneType =
  | 'lobby' // Game lobby before starting
  | 'between-rounds' // Between game rounds
  | 'content-page' // Static content pages (About, Contact, Legal, etc.)
  | 'post-game' // After game completion
  | 'menu'; // Main menu or settings

interface AdPlaceholderProps {
  /**
   * The type of safe zone where the ad will be placed.
   * Each zone type has specific AdSense compliance considerations.
   */
  zone: AdZoneType;

  /**
   * Optional CSS class name for custom styling
   */
  className?: string;

  /**
   * Whether to show a visual placeholder (useful during development)
   * @default false in production
   */
  showPlaceholder?: boolean;
}

/**
 * AdPlaceholder Component
 *
 * This component identifies safe zones for ad placement that comply with
 * Google AdSense policies for gaming websites.
 *
 * In production, this would integrate with Google AdSense.
 * For now, it serves as a placeholder to mark compliant ad zones.
 */
export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({
  zone,
  className,
  showPlaceholder = process.env.NODE_ENV === 'development',
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Zone-specific labels for development
  const zoneLabels: Record<AdZoneType, string> = {
    'lobby': 'Safe Zone: Game Lobby',
    'between-rounds': 'Safe Zone: Between Rounds',
    'content-page': 'Safe Zone: Content Page',
    'post-game': 'Safe Zone: Post-Game',
    'menu': 'Safe Zone: Menu',
  };

  // In production without placeholder, render nothing (ads would be injected here)
  if (!showPlaceholder) {
    return (
      <div
        data-ad-zone={zone}
        data-adsense-placeholder="true"
        className={cn('ad-zone', className)}
        aria-label={`Advertisement zone: ${zone}`}
      >
        {/* AdSense ad code would go here in production */}
      </div>
    );
  }

  // Development placeholder to visualize ad zones
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
        {zoneLabels[zone]}
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
 *
 * References:
 * - AdSense Gaming Policies: https://support.google.com/adsense/answer/9335567
 * - Ad Placement Policies: https://support.google.com/adsense/answer/1346295
 */

export default AdPlaceholder;
