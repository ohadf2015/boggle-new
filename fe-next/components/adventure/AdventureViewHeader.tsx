'use client';

import React from 'react';
import { ArrowLeft, Star, Sparkles, Map, Zap, Coins, Hammer } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import MusicControls from '@/components/MusicControls';

interface AdventureViewHeaderProps {
  viewState: 'worldMap' | 'levelGrid';
  isRTL: boolean;
  totalStars: number;
  playerLevel: number;
  gold: number;
  onBack: () => void;
  onOpenShop: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Current world name for breadcrumb (only shown on levelGrid) */
  worldName?: string;
  /** Whether the player came from the hub (returning player) — affects worldMap back target */
  hasHub?: boolean;
}

export default function AdventureViewHeader({
  viewState,
  isRTL,
  totalStars,
  playerLevel,
  gold,
  onBack,
  onOpenShop,
  t,
  worldName,
  hasHub,
}: AdventureViewHeaderProps): React.JSX.Element {
  // On worldMap: returning players (hasHub) go back to hub via onBack;
  // new players go to home page via Link
  const worldMapUsesHistoryBack = viewState === 'worldMap' && hasHub;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 px-4 py-3 sm:px-6 lg:px-8 bg-neo-navy border-b border-neo-white/10 flex-shrink-0" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Back button */}
        {(viewState !== 'worldMap' || worldMapUsesHistoryBack) ? (
          <button
            onClick={onBack}
            className={cn(
              'flex items-center gap-2 px-4 py-2 whitespace-nowrap',
              'bg-neo-navy border-2 border-neo-white/20 rounded-neo',
              'text-neo-white font-bold hover:bg-neo-navy-light',
              'transition-colors shadow-hard-sm'
            )}
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            <span className="hidden sm:inline">
              {t('common.back')}
            </span>
          </button>
        ) : (
          <Link
            href="/"
            className={cn(
              'flex items-center gap-2 px-4 py-2 whitespace-nowrap',
              'bg-neo-navy border-2 border-neo-white/20 rounded-neo',
              'text-neo-white font-bold hover:bg-neo-navy-light',
              'transition-colors shadow-hard-sm'
            )}
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </Link>
        )}

        {/* Title + Breadcrumb */}
        <div className="hidden sm:flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Map className="w-6 h-6 text-neo-lime" />
            <h1 className="text-xl font-black text-neo-white uppercase tracking-tight">
              {t('adventure.title')}
            </h1>
            <Sparkles className="w-6 h-6 text-neo-yellow" />
          </div>
          {viewState === 'levelGrid' && worldName && (
            <p className="text-xs text-neo-white/50 font-bold mt-0.5">
              {t('adventure.worldMap')} › {worldName}
            </p>
          )}
        </div>

        {/* Player Stats and Controls */}
        <div className="flex items-center gap-3">
          {/* Total Stars */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-yellow/20 border-2 border-neo-yellow rounded-neo">
            <Star className="w-4 h-4 text-neo-yellow fill-neo-yellow" />
            <span className="font-bold text-neo-yellow text-sm">
              {totalStars}
            </span>
          </div>

          {/* Player Level */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-purple/20 border-2 border-neo-purple rounded-neo">
            <Zap className="w-4 h-4 text-neo-purple" />
            <span className="font-bold text-neo-purple text-sm">
              {t('adventure.levelWithNumber', { level: playerLevel })}
            </span>
          </div>

          {/* Gold + Word Forge Shop */}
          <button
            onClick={onOpenShop}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5',
              'bg-neo-orange/20 border-2 border-neo-orange rounded-neo',
              'hover:bg-neo-orange/30 transition-colors',
              'font-bold text-neo-orange text-sm'
            )}
            aria-label={t('adventure.shop.open')}
          >
            <Coins className="w-4 h-4" />
            <span>{gold}</span>
            <Hammer className="w-3.5 h-3.5 ms-1 opacity-70" />
          </button>

          {/* Sound Controller */}
          <MusicControls />
        </div>
      </div>
    </header>
  );
}
