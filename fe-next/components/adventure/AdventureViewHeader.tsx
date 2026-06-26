'use client';

import React from 'react';
import { ArrowLeft, Star, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import MusicControls from '@/components/MusicControls';

interface AdventureViewHeaderProps {
  viewState: 'worldMap' | 'levelGrid';
  totalStars: number;
  playerLevel: number;
  onBack: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Current world name for breadcrumb (only shown on levelGrid) */
  worldName?: string;
  /** Whether the player came from the hub (returning player) — affects worldMap back target */
  hasHub?: boolean;
}

export default function AdventureViewHeader({
  viewState,
  totalStars,
  playerLevel,
  onBack,
  t,
  worldName,
  hasHub,
}: AdventureViewHeaderProps): React.JSX.Element {
  const worldMapUsesHistoryBack = viewState === 'worldMap' && hasHub;

  const backClass = cn(
    'flex items-center justify-center w-10 h-10 rounded-neo',
    'text-neo-white hover:text-neo-white hover:bg-neo-white/10',
    'transition-colors'
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-30 px-4 py-2 sm:px-6 lg:px-8 bg-neo-navy/90 shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Back — ghost icon, no border */}
        {(viewState !== 'worldMap' || worldMapUsesHistoryBack) ? (
          <button type="button" onClick={onBack} aria-label={t('common.back')} className={backClass}>
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
        ) : (
          <Link href="/" aria-label={t('common.back')} className={backClass}>
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Link>
        )}

        {/* Breadcrumb — world name on levelGrid, section title on worldMap */}
        {viewState === 'levelGrid' && worldName ? (
          <p className="text-xs sm:text-sm font-bold text-neo-white truncate max-w-[40%] text-center">
            {worldName}
          </p>
        ) : (
          <p className="text-xs sm:text-sm font-bold text-neo-white truncate max-w-[40%] text-center">
            {t('adventure.title')}
          </p>
        )}

        {/* Stats + Music — compact cluster */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-neo-lime">
            <Star className="w-4 h-4 fill-neo-lime" />
            <span className="font-black text-sm tabular-nums">{totalStars}</span>
          </div>
          <span className="w-px h-4 bg-neo-white/15" />
          <div className="flex items-center gap-1 text-neo-purple-light">
            <Zap className="w-3.5 h-3.5" />
            <span className="font-bold text-xs tabular-nums">
              {t('adventure.levelWithNumber', { level: playerLevel })}
            </span>
          </div>
          <span className="w-px h-4 bg-neo-white/15" />
          <MusicControls />
        </div>
      </div>
    </header>
  );
}
