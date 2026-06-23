'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils';
import { Sparkles, Gift, Zap, Star, Crown } from 'lucide-react';
import { fireConfetti } from '@/utils/confettiUtils';
import { SilentVideo } from '@/components/ui/SilentVideo';

/**
 * Mystery reward data from engagement system
 */
export interface MysteryReward {
  type: string;
  value: number | string;
  display: string;
  triggerType: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface MysteryRewardPopupProps {
  reward: MysteryReward | null;
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

/**
 * Rarity color schemes
 */
const RARITY_STYLES = {
  common: {
    bg: 'bg-gray-500',
    border: 'border-slate-500',
    text: 'text-slate-200',
    glow: 'shadow-hard-sm',
    particle: '#94a3b8',
  },
  uncommon: {
    bg: 'bg-neo-lime',
    border: 'border-emerald-400',
    text: 'text-emerald-200',
    glow: 'shadow-hard',
    particle: '#34d399',
  },
  rare: {
    bg: 'bg-neo-cyan',
    border: 'border-blue-400',
    text: 'text-blue-200',
    glow: 'shadow-hard',
    particle: '#3b82f6',
  },
  epic: {
    bg: 'bg-neo-purple',
    border: 'border-purple-400',
    text: 'text-purple-200',
    glow: 'shadow-hard-lg',
    particle: '#a855f7',
  },
  legendary: {
    bg: 'bg-neo-orange',
    border: 'border-yellow-400',
    text: 'text-yellow-100',
    glow: 'shadow-hard-lg',
    particle: '#fbbf24',
  },
};

/**
 * Get icon for reward type
 */
function getRewardIcon(type: string) {
  switch (type) {
    case 'xp_multiplier':
    case 'xp_flat':
    case 'instant_xp':
      return <Zap className="w-8 h-8" />;
    case 'bonus_hints':
      return <Star className="w-8 h-8" />;
    case 'streak_freeze':
      return <Crown className="w-8 h-8" />;
    case 'rare_title':
      return <Crown className="w-8 h-8" />;
    case 'combo_boost':
      return <Sparkles className="w-8 h-8" />;
    default:
      return <Gift className="w-8 h-8" />;
  }
}

/**
 * Mystery Reward Popup Component
 * Animated chest opening reveal for mystery rewards
 */
const MysteryRewardPopup: React.FC<MysteryRewardPopupProps> = ({
  reward,
  isOpen,
  onClose,
  t,
}) => {
  const [phase, setPhase] = useState<'chest' | 'opening' | 'reveal'>('chest');
  const [canDismiss, setCanDismiss] = useState(false);

  const rarity = reward?.rarity || 'common';
  const styles = RARITY_STYLES[rarity];

  // Allow dismiss after 1 second
  useEffect(() => {
    if (isOpen) {
      setCanDismiss(false);
      const timer = setTimeout(() => setCanDismiss(true), 1000);
      return () => clearTimeout(timer);
    }
    setCanDismiss(false);
    return;
  }, [isOpen]);

  // Reset phase when popup opens
  useEffect(() => {
    if (isOpen && reward) {
      setPhase('chest');

      // Sequence: chest -> opening -> reveal
      const openingTimer = setTimeout(() => {
        setPhase('opening');
      }, 1000);

      const revealTimer = setTimeout(() => {
        setPhase('reveal');
        // Fire confetti for rare+ rewards
        if (['rare', 'epic', 'legendary'].includes(rarity)) {
          fireConfetti({
            particleCount: rarity === 'legendary' ? 150 : rarity === 'epic' ? 100 : 50,
            spread: 70,
            colors: [styles.particle, '#ffffff', styles.particle],
          });
        }
      }, 2000);

      return () => {
        clearTimeout(openingTimer);
        clearTimeout(revealTimer);
      };
    }
    return;
  }, [isOpen, reward, rarity, styles.particle]);

  // Auto-close after reveal
  useEffect(() => {
    if (phase === 'reveal') {
      const autoCloseTimer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(autoCloseTimer);
    }
    return;
  }, [phase, onClose]);

  const handleClose = useCallback(() => {
    if (canDismiss) {
      onClose();
    }
  }, [canDismiss, onClose]);

  if (!reward) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        noDescription
        className={cn(
          'sm:max-w-sm border-4 rounded-neo p-0 overflow-hidden',
          styles.bg,
          styles.border,
          styles.glow
        )}
      >
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">
          {t('mysteryReward.title')}
        </DialogTitle>

        <div className="p-6 flex flex-col items-center">
          {/* Phase swap uses keyed CSS entrances (animate-in) instead of
              framer-motion: a starved JS loop (e.g. while the large Hebrew
              bundle parses) would leave the active phase pinned at its invisible
              `initial` state, showing an empty popup. Distinct keys remount on
              phase change so the CSS entrance replays; CSS runs off the main
              thread and always settles visible. */}
          <>
            {phase === 'chest' && (
              /* Chest Phase - Show mystery box */
              <div
                key="chest"
                className="flex flex-col items-center gap-4 animate-in fade-in-0 zoom-in-95 duration-300"
              >
                <m.div
                  animate={{
                    y: [0, -8, 0],
                    rotate: [0, -2, 2, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="text-8xl"
                >
                  🎁
                </m.div>
                <p className={cn('text-lg font-black uppercase', styles.text)}>
                  {t('mysteryReward.youFound')}
                </p>
                <m.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-sm text-white"
                >
                  {t('mysteryReward.opening')}
                </m.div>
              </div>
            )}

            {phase === 'opening' && (
              /* Opening Phase - Shaking/glowing animation */
              <div
                key="opening"
                className="flex flex-col items-center gap-4 animate-in fade-in-0 duration-300"
              >
                <m.div
                  animate={{
                    scale: [1, 1.1, 1, 1.15, 1],
                    rotate: [-5, 5, -8, 8, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: 3,
                    ease: 'easeInOut'
                  }}
                  className={cn(
                    'text-8xl p-4 rounded-full',
                    'animate-pulse'
                  )}
                >
                  ✨
                </m.div>
                <m.div
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity
                  }}
                  className={cn('text-xl font-black uppercase', styles.text)}
                >
                  {t('mysteryReward.revealing')}
                </m.div>
              </div>
            )}

            {phase === 'reveal' && (
              /* Reveal Phase - Show the reward */
              <div
                key="reveal"
                className="flex flex-col items-center gap-4 text-center animate-in fade-in-0 zoom-in-95 duration-300"
              >
                {/* Rarity Badge */}
                <Reveal
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide',
                    rarity === 'legendary' && 'bg-yellow-500 text-yellow-900',
                    rarity === 'epic' && 'bg-purple-500 text-purple-100',
                    rarity === 'rare' && 'bg-blue-500 text-blue-100',
                    rarity === 'uncommon' && 'bg-emerald-500 text-emerald-100',
                    rarity === 'common' && 'bg-slate-500 text-slate-100'
                  )}
                >
                  {rarity}
                </Reveal>

                {/* Reward Icon */}
                <m.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className={cn(
                    'p-6 rounded-full border-4',
                    'bg-white/10',
                    styles.border,
                    styles.text
                  )}
                >
                  {getRewardIcon(reward.type)}
                </m.div>

                {/* Reward Display */}
                <Reveal>
                  <p className="text-2xl font-black text-white">
                    {reward.display}
                  </p>
                </Reveal>

                {/* Trigger info */}
                <Reveal
                  noSlide
                  className="text-center space-y-1"
                >
                  <p className="text-xs text-white">
                    {reward.triggerType === 'game_completion' && (t('mysteryReward.gameCompletion'))}
                    {reward.triggerType === 'win' && (t('mysteryReward.winBonus'))}
                    {reward.triggerType === 'long_word' && (t('mysteryReward.longWord'))}
                    {reward.triggerType === 'achievement' && (t('mysteryReward.achievement'))}
                  </p>
                  <p className="text-xs text-white italic">
                    {reward.triggerType === 'game_completion' && (t('mysteryReward.gameCompletionExplain'))}
                    {reward.triggerType === 'win' && (t('mysteryReward.winBonusExplain'))}
                    {reward.triggerType === 'long_word' && (t('mysteryReward.longWordExplain'))}
                    {reward.triggerType === 'achievement' && (t('mysteryReward.achievementExplain'))}
                  </p>
                </Reveal>

                {/* Excited mascot */}
                <Reveal>
                  <SilentVideo
                    src={rarity === 'legendary' || rarity === 'epic' ? '/mascot/celebration.webp' : '/mascot/flexing.webp'}
                    width={80}
                    height={80}
                    className="drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    preload="metadata"
                    aria-hidden="true"
                  />
                </Reveal>

                {/* Tap to dismiss */}
                <button
                  onClick={onClose}
                  className={cn(
                    'mt-4 px-6 py-2.5 rounded-neo border-2 border-neo-black shadow-hard-sm',
                    'font-bold uppercase text-sm',
                    'bg-white/20 hover:bg-white/30 transition-colors',
                    'animate-in fade-in-0 duration-300',
                    styles.text
                  )}
                >
                  {t('mysteryReward.awesome')}
                </button>
              </div>
            )}
          </>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MysteryRewardPopup;
