'use client';

import React, { useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { Sparkles, Star, Crown, Zap, AlertTriangle, Check } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { toRoman, PRESTIGE_CONFIG, type PrestigeReward } from '@/backend/modules/xpManager';

interface PrestigeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
  currentPrestige: number;
  prestigeMultiplier: number;
  nextRewards: PrestigeReward[];
  canPrestige: boolean;
  maxPrestige: number;
  t: (key: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
  language?: string;
  onPrestigeSuccess?: () => void;
}

/** Tailwind classes for prestige tiers (extends PRESTIGE_CONFIG.DISPLAY) */
const PRESTIGE_STYLES = {
  1: { bg: 'bg-neo-pink-muted', text: 'text-neo-white', border: 'border-neo-pink-muted', gradient: 'from-neo-pink-dark to-neo-pink-muted' },
  2: { bg: 'bg-neo-cream/40', text: 'text-neo-black', border: 'border-neo-cream/30', gradient: 'from-neo-cream/50 to-neo-cream/30' },
  3: { bg: 'bg-neo-lime', text: 'text-neo-black', border: 'border-neo-lime-light', gradient: 'from-neo-lime-dark to-neo-lime' },
  4: { bg: 'bg-neo-cyan', text: 'text-neo-black', border: 'border-neo-cyan-light', gradient: 'from-neo-cyan to-neo-cyan-light' },
  5: { bg: 'bg-neo-purple', text: 'text-neo-white', border: 'border-neo-purple-light', gradient: 'from-neo-purple to-neo-pink' },
} as const;

export const PrestigeModal: React.FC<PrestigeModalProps> = ({
  isOpen,
  onClose,
  currentLevel,
  currentPrestige,
  prestigeMultiplier,
  nextRewards,
  canPrestige,
  maxPrestige,
  t,
  // language prop kept for backwards compat, t() handles locale
  onPrestigeSuccess,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prestigeComplete, setPrestigeComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPrestigeLevel = currentPrestige + 1;
  const colors = PRESTIGE_STYLES[nextPrestigeLevel as keyof typeof PRESTIGE_STYLES] || PRESTIGE_STYLES[1];
  const pm = (key: string) => t(`xp.prestigeModal.${key}`);

  const handlePrestige = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/engagement/prestige', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to prestige');
      }

      setPrestigeComplete(true);
      setIsConfirming(false);

      // Call success callback after animation
      setTimeout(() => {
        onPrestigeSuccess?.();
        onClose();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [onClose, onPrestigeSuccess]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setIsConfirming(false);
      setPrestigeComplete(false);
      setError(null);
      onClose();
    }
  }, [isLoading, onClose]);

  const isMaxPrestige = currentPrestige >= maxPrestige;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent noDescription className="sm:max-w-lg bg-neo-navy border-4 border-neo-black rounded-neo shadow-hard-xl p-0 overflow-hidden">
        {/* Header with prestige gradient */}
        <div
          className={cn(
            'border-b-4 border-neo-black p-4 flex items-center justify-center gap-3',
            `bg-linear-to-r ${colors.gradient}`
          )}
        >
          <Sparkles className={cn('w-6 h-6', colors.text)} />
          <DialogTitle className={cn('text-xl font-black uppercase tracking-wide', colors.text)}>
            {prestigeComplete ? pm('achieved') : pm('title')}
          </DialogTitle>
          <Sparkles className={cn('w-6 h-6', colors.text)} />
        </div>

        <div className="p-5 space-y-5">
          <AnimatePresence mode="wait">
            {prestigeComplete ? (
              /* Success Animation */
              <m.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                <Image
                  src="/mascot/powerup-nobg.webp"
                  alt=""
                  width={80}
                  height={80}
                  className="drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                  unoptimized
                  aria-hidden="true"
                />
                <m.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                  transition={{ type: 'tween', duration: 0.5, repeat: 3 }}
                  className="text-7xl"
                >
                  {PRESTIGE_CONFIG.DISPLAY[nextPrestigeLevel]?.icon || '⭐'}
                </m.div>

                <div className="text-center">
                  <p className={cn('text-2xl font-black', colors.text.replace('text-', 'text-'))}>
                    {t('xp.prestigeModal.prestigeAchievedLevel', { level: toRoman(nextPrestigeLevel) })}
                  </p>
                  <p className="text-neo-white text-sm mt-1">
                    {pm('rewardsUnlocked')}
                  </p>
                </div>

                <div className="flex gap-2 mt-2">
                  {nextRewards.map((reward, rewardIdx) => (
                    <m.div
                      key={reward.value}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + rewardIdx * 0.2 }}
                      className="text-3xl"
                    >
                      {reward.icon}
                    </m.div>
                  ))}
                </div>
              </m.div>
            ) : isConfirming ? (
              /* Confirmation View */
              <m.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-3 p-4 rounded-neo bg-neo-lime/20 border-2 border-neo-lime/50">
                  <AlertTriangle className="w-6 h-6 text-neo-lime shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-neo-lime">
                      {pm('warning')}
                    </p>
                    <p className="text-sm text-neo-white mt-1">
                      {pm('warningText')}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-neo bg-neo-red/20 border-2 border-neo-red/50 text-neo-red text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsConfirming(false)}
                    disabled={isLoading}
                    className={cn(
                      'flex-1 p-3 rounded-neo border-2 border-white/30',
                      'font-bold uppercase text-sm',
                      'bg-neo-cream/10 text-neo-white hover:bg-neo-cream/20',
                      'transition-all',
                      'disabled:opacity-50'
                    )}
                  >
                    {pm('cancel')}
                  </button>
                  <button
                    onClick={handlePrestige}
                    disabled={isLoading}
                    className={cn(
                      'flex-1 p-3 rounded-neo border-2 border-neo-black shadow-hard-sm',
                      'font-bold uppercase text-sm',
                      `bg-linear-to-r ${colors.gradient}`,
                      colors.text,
                      'hover:shadow-hard-md hover:-translate-y-0.5',
                      'transition-all',
                      'disabled:opacity-50'
                    )}
                  >
                    {isLoading ? (
                      <Loader size="sm" className="mx-auto" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 inline me-1" />
                        {pm('confirmPrestige')}
                      </>
                    )}
                  </button>
                </div>
              </m.div>
            ) : (
              /* Main View */
              <m.div
                key="main"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Current Status */}
                <div className="flex items-center justify-between p-4 rounded-neo bg-neo-cream/5 border-2 border-white/10">
                  <div>
                    <p className="text-xs text-neo-white uppercase tracking-wide">
                      {pm('currentLevel')}
                    </p>
                    <p className="text-2xl font-black text-neo-white">{currentLevel}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-neo-white uppercase tracking-wide">
                      {pm('prestige')}
                    </p>
                    <p className="text-2xl font-black">
                      {currentPrestige > 0 ? (
                        <span className={cn(PRESTIGE_STYLES[currentPrestige as keyof typeof PRESTIGE_STYLES]?.text || 'text-neo-white')}>
                          {PRESTIGE_CONFIG.DISPLAY[currentPrestige]?.icon || '⭐'} {toRoman(currentPrestige)}
                        </span>
                      ) : (
                        <span className="text-neo-white">-</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neo-white uppercase tracking-wide">
                      {pm('xpMultiplier')}
                    </p>
                    <p className="text-2xl font-black text-neo-lime">
                      {prestigeMultiplier > 1 ? `${Math.round((prestigeMultiplier - 1) * 100)}%` : '-'}
                    </p>
                  </div>
                </div>

                {isMaxPrestige ? (
                  /* Max Prestige Reached */
                  <div className="text-center py-6">
                    <div className="text-5xl mb-3">{PRESTIGE_CONFIG.DISPLAY[5]?.icon || '🌌'}</div>
                    <p className="text-xl font-black text-neo-purple">
                      {pm('maxPrestige')}
                    </p>
                    <p className="text-neo-white text-sm mt-1">
                      {pm('maxPrestigeText')}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Next Prestige Rewards Preview */}
                    <div className="space-y-2">
                      <p className="text-xs text-neo-white uppercase tracking-wide flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {t('xp.prestigeModal.rewardsFor', { level: toRoman(nextPrestigeLevel) })}
                      </p>

                      <div className="grid gap-2">
                        {nextRewards.map((reward, rewardIdx) => (
                          <m.div
                            key={reward.value}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: rewardIdx * 0.1 }}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-neo',
                              'bg-neo-cream/5 border-2',
                              canPrestige ? colors.border : 'border-white/10'
                            )}
                          >
                            <span className="text-2xl">{reward.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className={cn('font-bold text-sm', canPrestige ? colors.text.replace('text-', 'text-') : 'text-neo-white')}>
                                {reward.displayName}
                              </p>
                              <p className="text-xs text-neo-white truncate">{reward.description}</p>
                            </div>
                            {reward.type === 'multiplier' && (
                              <Zap className={cn('w-4 h-4', canPrestige ? 'text-neo-lime' : 'text-neo-white')} />
                            )}
                            {reward.type === 'title' && (
                              <Crown className={cn('w-4 h-4', canPrestige ? 'text-neo-lime' : 'text-neo-white')} />
                            )}
                          </m.div>
                        ))}
                      </div>
                    </div>

                    {/* Prestige Button */}
                    {canPrestige ? (
                      <m.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsConfirming(true)}
                        className={cn(
                          'w-full p-4 rounded-neo border-4 border-neo-black shadow-hard-lg',
                          'font-black text-lg uppercase tracking-wide',
                          `bg-linear-to-r ${colors.gradient}`,
                          colors.text,
                          'hover:shadow-hard-xl hover:-translate-y-1',
                          'transition-all'
                        )}
                      >
                        <Sparkles className="w-5 h-5 inline me-2" />
                        {t('xp.prestigeModal.prestigeTo', { level: toRoman(nextPrestigeLevel) })}
                      </m.button>
                    ) : (
                      <div className="p-4 rounded-neo bg-neo-cream/5 border-2 border-white/10 text-center">
                        <p className="text-neo-white text-sm">
                          {pm('reachLevel')}
                        </p>
                        <p className="text-neo-white text-xs mt-1">
                          {t('xp.prestigeModal.levelsRemaining', { count: 100 - currentLevel })}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrestigeModal;
