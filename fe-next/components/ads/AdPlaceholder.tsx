'use client';

import React from 'react';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';

type AdZoneType =
  | 'lobby'
  | 'between-rounds'
  | 'content-page'
  | 'post-game'
  | 'menu';

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
  showPlaceholder?: boolean;
}

export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({
  zone,
  className,
  showPlaceholder = process.env.NODE_ENV === 'development',
}) => {
  if (Capacitor.isNativePlatform()) return null;
  if (showPlaceholder) return <DevPlaceholder zone={zone} className={className} />;
  // Production web: reserve a stable min-height so AdSense anchor/auto-ads
  // slots cannot collapse to zero and then expand, causing CLS. The spacer
  // is invisible and lightweight; the real ad overlays it when filled.
  return (
    <div
      data-ad-zone={zone}
      aria-hidden="true"
      className={cn('ad-placeholder min-h-[100px] w-full', className)}
    />
  );
};

const DevPlaceholder: React.FC<{ zone: AdZoneType; className?: string }> = ({ zone, className }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div
      data-ad-zone={zone}
      className={cn(
        'ad-placeholder',
        'min-h-[100px] p-4 rounded-neo border-3 border-dashed',
        'flex flex-col items-center justify-center gap-2',
        isDarkMode
          ? 'bg-neo-navy-light/50 border-slate-600 text-slate-400'
          : 'bg-gray-100 border-gray-300 text-gray-500',
        className
      )}
      aria-label={`Advertisement placeholder: ${zone}`}
    >
      <div className="text-xs font-black uppercase tracking-wider">
        {ZONE_LABELS[zone]}
      </div>
    </div>
  );
};

export default AdPlaceholder;
