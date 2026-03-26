/**
 * LevelCompleteContent — Rewards, objectives, loot, and action buttons
 * Extracted from LevelCompleteModal to keep files under 500 lines.
 */
'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Check, X, Trophy, RotateCcw, DoorOpen, Coins, Zap, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OBJECTIVE_TRANSLATION_KEYS } from '@/lib/adventure/constants';
import { RollingNumber } from './ui/RollingNumber';
import { RewardedAdButton } from '@/components/ads/RewardedAdButton';
import { getNearMissMessages } from '@/lib/adventure/nearMiss';
import type { LevelObjective, LevelAttempt } from '@/types/adventure';

const LOOT_DROP_IMAGES: Record<string, string> = {
  gold: '/images/adventure/loot/loot-gold-coins.webp',
  xp: '/images/adventure/loot/loot-xp-star.webp',
  bonusGold: '/images/adventure/loot/loot-bonus-gold.webp',
  bossTrophy: '/images/adventure/loot/loot-boss-trophy.webp',
  runeFragment: '/images/runes/rune-goldvein.webp',
  loreScroll: '/images/adventure/floating-scroll.webp',
};

export interface LevelCompleteContentProps {
  stars: number;
  score: number;
  objectives: LevelObjective[];
  worldNumber: number;
  levelNumber: number;
  isHighScore: boolean;
  isFailed: boolean;
  onContinue: () => void;
  onRetry: () => void;
  onExit: () => void;
  xpEarned?: number;
  goldEarned?: number;
  isLastLevelOfWorld: boolean;
  onNextWorld?: () => void;
  lootDrops: Array<{ type: string; rarity: string; label?: string }>;
  storyBeatText?: string;
  canRetryFree: boolean;
  nextLevelPreview?: { worldName: string; levelNumber: number; mechanic?: string } | null;
  bossDefeatShare?: { bossId: string; bossName: string; worldName: string; killingWord: string; playerName: string } | null;
  bestAttempt?: LevelAttempt | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LevelCompleteContent = memo<LevelCompleteContentProps>(({
  stars, score, objectives, worldNumber, isHighScore, isFailed,
  onContinue, onRetry, onExit, xpEarned, goldEarned,
  isLastLevelOfWorld, onNextWorld, lootDrops, storyBeatText,
  canRetryFree, nextLevelPreview, bossDefeatShare, bestAttempt, t,
}) => {
  const [goldDoubled, setGoldDoubled] = useState(false);
  const baseGold = goldEarned ?? (stars > 0 ? stars * 10 + (stars === 3 ? 50 : 0) : 0);
  const displayGold = goldDoubled ? baseGold * 2 : baseGold;
  const completedCount = objectives.filter((o) => o.isComplete).length;

  return (
    <>
      {/* Score & Rewards Grid */}
      <AdaptiveMotion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        {/* Score */}
        <div className="bg-neo-black/60 backdrop-blur-sm border-3 border-neo-white/20 rounded-neo p-3">
          <div className="text-neo-white/60 text-xs font-bold mb-1 uppercase">{t('common.score')}</div>
          <RollingNumber value={score} variant="white" className="text-xl md:text-2xl" />
        </div>
        {/* XP */}
        <div className="bg-neo-purple/20 backdrop-blur-sm border-3 border-neo-purple rounded-neo p-3">
          <div className="text-neo-purple text-xs font-bold mb-1 flex items-center gap-1 justify-center uppercase">
            <Zap className="w-3 h-3" />+{t('common.xp')}
          </div>
          <RollingNumber value={xpEarned ?? Math.floor(score / 100)} variant="default" className="text-xl md:text-2xl text-neo-purple" />
        </div>
        {/* Gold */}
        <div className={cn(
          'backdrop-blur-sm border-3 rounded-neo p-3',
          goldDoubled ? 'bg-neo-yellow/30 border-neo-yellow' : 'bg-neo-yellow/20 border-neo-yellow/60'
        )}>
          <div className="text-neo-yellow text-xs font-bold mb-1 flex items-center gap-1 justify-center uppercase">
            <Coins className="w-3 h-3" />+{t('common.gold')}
          </div>
          <RollingNumber value={displayGold} variant="default" className="text-xl md:text-2xl text-neo-yellow" />
          {goldDoubled && (
            <div className="text-neo-yellow text-[10px] font-bold uppercase mt-0.5">2x!</div>
          )}
        </div>
      </AdaptiveMotion.div>

      {/* High Score Badge */}
      {isHighScore && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring' }}
          className="flex justify-center mb-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neo-lime/20 border-2 border-neo-lime rounded-neo">
            <Trophy className="w-5 h-5 text-neo-lime" />
            <span className="text-neo-lime font-bold">{t('adventure.game.newHighScore')}</span>
          </div>
        </AdaptiveMotion.div>
      )}

      {/* Boss Defeat Share Button */}
      {bossDefeatShare && !isFailed && (
        <AdaptiveMotion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.85, type: 'spring' }}
          onClick={() => {
            const params = new URLSearchParams({
              world: String(worldNumber),
              boss: bossDefeatShare.bossId,
              word: bossDefeatShare.killingWord,
              player: bossDefeatShare.playerName,
              stars: String(stars),
            });
            const shareUrl = `${window.location.origin}/api/og/boss-defeat?${params}`;
            const shareText = t('adventure.share.bossDefeated', {
              boss: bossDefeatShare.bossName,
              world: bossDefeatShare.worldName,
            });
            if (navigator.share) {
              navigator.share({ title: 'LexiClash', text: shareText, url: shareUrl }).catch(() => {});
            } else {
              navigator.clipboard?.writeText(`${shareText}\n${shareUrl}`).catch(() => {});
            }
          }}
          className={cn(
            'w-full mb-4 py-2.5 px-4',
            'flex items-center justify-center gap-2',
            'bg-neo-pink/20 text-neo-pink',
            'font-bold text-sm',
            'border-2 border-neo-pink/40 rounded-neo',
            'hover:bg-neo-pink/30',
            'transition-all duration-150'
          )}
        >
          <Share2 className="w-4 h-4" />
          {t('adventure.share.shareCard')}
        </AdaptiveMotion.button>
      )}

      {/* Objectives Summary */}
      <div className="mb-6">
        <p className="text-neo-white/60 text-sm font-bold mb-2">
          {t('adventure.game.objectives')}: {completedCount}/{objectives.length}
        </p>
        <ul className="space-y-2">
          {objectives.map((objective) => (
            <li
              key={objective.type}
              data-testid={objective.isComplete ? 'objective-complete' : 'objective-incomplete'}
              className={cn(
                'flex items-center gap-2 text-sm font-bold',
                objective.isComplete ? 'text-neo-lime' : 'text-neo-white/50'
              )}
            >
              {objective.isComplete ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{t(OBJECTIVE_TRANSLATION_KEYS[objective.type], { target: objective.target })}</span>
              <span className="ms-auto font-mono">{objective.current}/{objective.target}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Loot Drops */}
      {lootDrops.length > 0 && !isFailed && (
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {lootDrops.map((drop, i) => {
            const imgSrc = LOOT_DROP_IMAGES[drop.type];
            return (
              <AdaptiveMotion.div
                key={`loot-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.1, type: 'spring', stiffness: 300 }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 text-xs font-bold',
                  drop.rarity === 'legendary' ? 'bg-neo-yellow/20 border-neo-yellow text-neo-yellow' :
                  drop.rarity === 'rare' ? 'bg-neo-purple/20 border-neo-purple text-neo-purple' :
                  'bg-neo-cyan/20 border-neo-cyan/50 text-neo-cyan'
                )}
              >
                {imgSrc && <Image src={imgSrc} alt={drop.label || drop.type} width={20} height={20} />}
                {drop.label || drop.type}
              </AdaptiveMotion.div>
            );
          })}
        </div>
      )}

      {/* Story Beat */}
      {storyBeatText && !isFailed && (
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mb-4 p-3 rounded-neo bg-neo-white/5 border border-neo-white/10"
        >
          <p className="text-xs text-neo-white/70 italic leading-relaxed">{storyBeatText}</p>
        </AdaptiveMotion.div>
      )}

      {/* Near-miss feedback — encouraging messages when close to passing */}
      {isFailed && (() => {
        const nearMisses = getNearMissMessages(objectives);
        if (nearMisses.length === 0) return null;
        return (
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 p-4 rounded-neo bg-neo-orange/10 border-2 border-neo-orange/30"
          >
            <p className="text-neo-orange font-bold text-sm uppercase tracking-wide mb-2">
              {t('adventure.nearMiss.almostThere')}
            </p>
            <div className="space-y-1.5">
              {nearMisses.map((msg, i) => (
                <div key={i} className="text-sm text-neo-white/80 font-bold">
                  {t(msg.translationKey, msg.params)}
                </div>
              ))}
            </div>
          </AdaptiveMotion.div>
        );
      })()}

      {/* Partial Progress (failed attempts) */}
      {isFailed && bestAttempt && bestAttempt.attemptCount > 1 && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 p-4 rounded-neo bg-neo-cyan/10 border-2 border-neo-cyan/30"
        >
          <p className="text-neo-cyan font-bold text-sm uppercase tracking-wide mb-2">
            {t('adventure.game.yourBest')}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-neo-white/60">{t('adventure.game.words')}: </span>
              <span className="font-bold text-neo-white">{bestAttempt.bestWords}</span>
            </div>
            <div>
              <span className="text-neo-white/60">{t('common.score')}: </span>
              <span className="font-bold text-neo-white">{bestAttempt.bestScore.toLocaleString()}</span>
            </div>
          </div>
          {bestAttempt.attemptCount >= 3 && (
            <p className="text-neo-lime text-sm font-bold mt-2">
              {t('adventure.game.keepTrying')}
            </p>
          )}
        </AdaptiveMotion.div>
      )}

      {/* Next Level Preview */}
      {!isFailed && nextLevelPreview && !isLastLevelOfWorld && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-4 p-3 rounded-neo bg-neo-cyan/10 border border-neo-cyan/20"
        >
          <p className="text-neo-cyan text-xs font-bold uppercase tracking-wide mb-1">
            {t('adventure.nextUp')}
          </p>
          <p className="text-neo-white text-sm font-bold">
            {t('adventure.level')} {nextLevelPreview.levelNumber} — {nextLevelPreview.worldName}
          </p>
          {nextLevelPreview.mechanic && (
            <p className="text-neo-white/60 text-xs mt-0.5">{t(nextLevelPreview.mechanic)}</p>
          )}
        </AdaptiveMotion.div>
      )}

      {/* Double Coins Rewarded Ad (single ad offer per level completion) */}
      {stars > 0 && !goldDoubled && (
        <div className="mb-4">
          <RewardedAdButton name="adventure-double-coins" onReward={() => setGoldDoubled(true)} className="w-full">
            {t('adventure.watchAdDoubleCoins')}
          </RewardedAdButton>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {!isFailed && (
          <button
            onClick={isLastLevelOfWorld && onNextWorld ? onNextWorld : onContinue}
            className={cn(
              'btn-primary w-full py-3 px-4',
              'bg-neo-lime text-neo-black font-black text-lg',
              'border-3 border-neo-black rounded-neo',
              'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
              'active:translate-y-0.5 active:shadow-hard-pressed',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
              'transition-all duration-200'
            )}
          >
            {isLastLevelOfWorld ? t('adventure.nextWorld') : t('adventure.continueToNext')}
          </button>
        )}

        <button
          onClick={onRetry}
          className={cn(
            isFailed ? 'btn-primary' : '',
            'w-full py-3 px-4 flex items-center justify-center gap-2',
            isFailed ? 'bg-neo-orange text-neo-black' : 'bg-neo-white/10 text-neo-white',
            'font-black text-lg border-3 border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
            'active:translate-y-0.5 active:shadow-hard-pressed',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
            'transition-all duration-200'
          )}
        >
          <RotateCcw className="w-5 h-5" />
          {canRetryFree ? t('adventure.freeRetry') : t('adventure.retryLevel')}
        </button>

        <button
          onClick={onExit}
          className={cn(
            'w-full py-2 px-4 flex items-center justify-center gap-2',
            'bg-transparent text-neo-white/70 font-bold text-base',
            'hover:text-neo-white hover:bg-neo-white/5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime',
            'rounded-neo transition-all duration-200'
          )}
        >
          <DoorOpen className="w-4 h-4" />
          {t('common.exit')}
        </button>
      </div>
    </>
  );
});

LevelCompleteContent.displayName = 'LevelCompleteContent';

export default LevelCompleteContent;
