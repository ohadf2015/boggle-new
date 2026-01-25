/**
 * LevelPreviewCard Component
 *
 * Displays level information before starting a level.
 * Shows objectives, timer, special tiles, and best attempt stats.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Target,
  Sparkles,
  Play,
  ArrowLeft,
  Crown,
  Gem,
  Snowflake,
  Bomb,
  Rainbow,
  Link,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { OBJECTIVE_TRANSLATION_KEYS } from '@/lib/adventure/constants';
import type { LevelConfig, LevelAttempt, TileType, ObjectiveType } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface LevelPreviewCardProps {
  /** Level configuration */
  levelConfig: LevelConfig;
  /** World number */
  worldNumber: number;
  /** Level number */
  levelNumber: number;
  /** Callback when Start is clicked */
  onStart: () => void;
  /** Callback when Back is clicked */
  onBack: () => void;
  /** Best attempt data for this level */
  bestAttempt?: LevelAttempt | null;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Map tile types to icons and translation keys */
const TILE_TYPE_INFO: Record<Exclude<TileType, 'standard'>, { icon: React.ComponentType<{ className?: string }>; key: string; color: string }> = {
  gold: { icon: Gem, key: 'adventure.tiles.gold', color: 'text-neo-yellow' },
  ice: { icon: Snowflake, key: 'adventure.tiles.ice', color: 'text-neo-cyan' },
  bomb: { icon: Bomb, key: 'adventure.tiles.bomb', color: 'text-neo-red' },
  rainbow: { icon: Rainbow, key: 'adventure.tiles.rainbow', color: 'text-neo-pink' },
  chain: { icon: Link, key: 'adventure.tiles.chain', color: 'text-neo-orange' },
  time: { icon: Timer, key: 'adventure.tiles.time', color: 'text-neo-lime' },
};

// ==============================================
// ANIMATION VARIANTS
// ==============================================

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
    },
  },
};

// ==============================================
// COMPONENT
// ==============================================

const LevelPreviewCard = memo<LevelPreviewCardProps>(
  ({ levelConfig, worldNumber, levelNumber, onStart, onBack, bestAttempt }) => {
    const { t } = useLanguage();

    // Extract unique special tile types
    const uniqueSpecialTiles = useMemo(() => {
      const tileTypes = new Set<TileType>();
      for (const tile of levelConfig.specialTiles) {
        if (tile.type !== 'standard') {
          tileTypes.add(tile.type);
        }
      }
      return Array.from(tileTypes) as Exclude<TileType, 'standard'>[];
    }, [levelConfig.specialTiles]);

    return (
      <motion.div
        data-testid="level-preview-card"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          'w-full max-w-md mx-auto',
          'bg-neo-navy border-3 border-neo-black rounded-neo',
          'shadow-hard-lg',
          'overflow-hidden'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'p-6 text-center',
            'bg-gradient-to-br from-neo-cyan/20 to-neo-lime/20',
            'border-b-3 border-neo-black/30'
          )}
        >
          {/* Boss Indicator */}
          {levelConfig.isBossLevel && (
            <div
              data-testid="boss-indicator"
              className={cn(
                'inline-flex items-center gap-2 mb-3',
                'px-3 py-1 rounded-full',
                'bg-neo-orange/20 border border-neo-orange/50',
                'text-neo-orange text-sm font-bold'
              )}
            >
              <Crown className="w-4 h-4" />
              {t('adventure.boss')}
            </div>
          )}

          <p className="text-sm text-neo-white/60 uppercase tracking-wide">
            {t('adventure.worldLabel')} {worldNumber}
          </p>
          <h2 className="text-3xl font-black text-neo-white">
            {t('adventure.level')} {levelNumber}
          </h2>
        </div>

        {/* Timer */}
        <div
          className={cn(
            'flex items-center justify-center gap-3 py-4',
            'bg-neo-black/30 border-b-2 border-neo-black/20'
          )}
        >
          <Clock className="w-6 h-6 text-neo-cyan" />
          <div className="text-center">
            <span className="text-2xl font-black text-neo-white">
              {levelConfig.timerSeconds}
            </span>
            <span className="text-sm text-neo-white/60 ml-2">
              {t('adventure.preview.seconds')}
            </span>
          </div>
        </div>

        {/* Objectives */}
        <div className="p-4 border-b-2 border-neo-black/20">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neo-white/70 uppercase tracking-wide mb-3">
            <Target className="w-4 h-4" />
            {t('adventure.preview.objectives')}
          </h3>
          <div className="space-y-2">
            {levelConfig.objectives.map((objective, index) => (
              <div
                key={`${objective.type}-${index}`}
                className={cn(
                  'flex items-center justify-between',
                  'p-2 rounded-neo',
                  'bg-neo-black/20',
                  objective.isPrimary && 'border-l-4 border-neo-lime'
                )}
              >
                <span className="text-neo-white/80">
                  {t(OBJECTIVE_TRANSLATION_KEYS[objective.type])}
                </span>
                <span className="font-black text-neo-lime">
                  {objective.target}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Special Tiles */}
        <div className="p-4 border-b-2 border-neo-black/20">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neo-white/70 uppercase tracking-wide mb-3">
            <Sparkles className="w-4 h-4" />
            {t('adventure.preview.specialTiles')}
          </h3>
          {uniqueSpecialTiles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {uniqueSpecialTiles.map((tileType) => {
                const tileKey = tileType as keyof typeof TILE_TYPE_INFO;
                const info = TILE_TYPE_INFO[tileKey];
                const Icon = info.icon;
                const colorClass = info.color;
                const translationKey = info.key;
                return (
                  <div
                    key={tileType}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-neo',
                      'bg-neo-black/30 border border-neo-white/10'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', colorClass)} />
                    <span className="text-sm text-neo-white/80">
                      {t(translationKey)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-neo-white/50 text-sm italic">
              {t('adventure.preview.noSpecialTiles')}
            </p>
          )}
        </div>

        {/* Best Attempt */}
        <div className="p-4 border-b-2 border-neo-black/20">
          <h3 className="text-sm font-bold text-neo-white/70 uppercase tracking-wide mb-3">
            {t('adventure.preview.bestAttempt')}
          </h3>
          {bestAttempt ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded-neo bg-neo-black/20 text-center">
                <p className="text-xl font-black text-neo-cyan">{bestAttempt.bestWords}</p>
                <p className="text-xs text-neo-white/60">{t('common.wordsFound')}</p>
              </div>
              <div className="p-2 rounded-neo bg-neo-black/20 text-center">
                <p className="text-xl font-black text-neo-lime">{bestAttempt.bestScore}</p>
                <p className="text-xs text-neo-white/60">{t('common.score')}</p>
              </div>
            </div>
          ) : (
            <p className="text-neo-white/50 text-sm italic">
              {t('adventure.preview.notAttempted')}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-3">
          <button
            onClick={onStart}
            className={cn(
              'w-full py-3 px-4',
              'flex items-center justify-center gap-3',
              'bg-neo-lime text-neo-black',
              'font-black text-lg',
              'border-3 border-neo-black rounded-neo',
              'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
              'active:translate-y-0.5 active:shadow-hard-pressed',
              'transition-all duration-200'
            )}
          >
            <Play className="w-5 h-5" />
            {t('adventure.preview.start')}
          </button>

          <button
            onClick={onBack}
            className={cn(
              'w-full py-2 px-4',
              'flex items-center justify-center gap-2',
              'bg-transparent text-neo-white/60',
              'font-medium text-sm',
              'border border-neo-white/20 rounded-neo',
              'hover:text-neo-white hover:border-neo-white/40',
              'transition-all duration-200'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('adventure.preview.back')}
          </button>
        </div>
      </motion.div>
    );
  }
);

LevelPreviewCard.displayName = 'LevelPreviewCard';

export default LevelPreviewCard;
