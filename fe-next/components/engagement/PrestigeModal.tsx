'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { Sparkles, Star, Crown, Zap, AlertTriangle, Check } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';

interface PrestigeReward {
  type: 'title' | 'multiplier' | 'border' | 'icon';
  value: string;
  displayName: string;
  description: string;
  icon: string;
}

interface PrestigeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
  currentPrestige: number;
  prestigeMultiplier: number;
  nextRewards: PrestigeReward[];
  canPrestige: boolean;
  maxPrestige: number;
  t: (key: string) => string;
  language?: string;
  onPrestigeSuccess?: () => void;
}

const PRESTIGE_COLORS = {
  1: { bg: 'bg-amber-600', text: 'text-amber-100', border: 'border-amber-500', gradient: 'from-amber-700 to-amber-500' },
  2: { bg: 'bg-gray-400', text: 'text-gray-900', border: 'border-gray-300', gradient: 'from-gray-500 to-gray-300' },
  3: { bg: 'bg-yellow-500', text: 'text-yellow-900', border: 'border-yellow-400', gradient: 'from-yellow-600 to-yellow-400' },
  4: { bg: 'bg-cyan-400', text: 'text-cyan-900', border: 'border-cyan-300', gradient: 'from-cyan-500 to-cyan-300' },
  5: { bg: 'bg-purple-600', text: 'text-purple-100', border: 'border-purple-400', gradient: 'from-purple-700 to-pink-500' },
} as const;

const PRESTIGE_ICONS = ['', '⭐', '🌟', '✨', '💫', '🌌'];

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
  language = 'en',
  onPrestigeSuccess,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prestigeComplete, setPrestigeComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPrestigeLevel = currentPrestige + 1;
  const colors = PRESTIGE_COLORS[nextPrestigeLevel as keyof typeof PRESTIGE_COLORS] || PRESTIGE_COLORS[1];

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
      <DialogContent noDescription className="sm:max-w-lg bg-[#1a1a2e] border-4 border-neo-black rounded-neo shadow-hard-xl p-0 overflow-hidden">
        {/* Header with prestige gradient */}
        <div
          className={cn(
            'border-b-4 border-neo-black p-4 flex items-center justify-center gap-3',
            `bg-gradient-to-r ${colors.gradient}`
          )}
        >
          <Sparkles className={cn('w-6 h-6', colors.text)} />
          <DialogTitle className={cn('text-xl font-black uppercase tracking-wide', colors.text)}>
            {prestigeComplete
              ? (language === 'he' ? 'יופי! הגעת!' : 'Prestige Achieved!')
              : (language === 'he' ? 'מערכת פרסטיג\'' : 'Prestige System')}
          </DialogTitle>
          <Sparkles className={cn('w-6 h-6', colors.text)} />
        </div>

        <div className="p-5 space-y-5">
          <AnimatePresence mode="wait">
            {prestigeComplete ? (
              /* Success Animation */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                  className="text-7xl"
                >
                  {PRESTIGE_ICONS[nextPrestigeLevel]}
                </motion.div>

                <div className="text-center">
                  <p className={cn('text-2xl font-black', colors.text.replace('text-', 'text-'))}>
                    Prestige {toRoman(nextPrestigeLevel)}
                  </p>
                  <p className="text-white/70 text-sm mt-1">
                    {language === 'he' ? 'הפרסים שלך נפתחו!' : 'Your rewards have been unlocked!'}
                  </p>
                </div>

                <div className="flex gap-2 mt-2">
                  {nextRewards.map((reward, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.2 }}
                      className="text-3xl"
                    >
                      {reward.icon}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : isConfirming ? (
              /* Confirmation View */
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-3 p-4 rounded-neo bg-yellow-500/20 border-2 border-yellow-500/50">
                  <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-yellow-300">
                      {language === 'he' ? 'שים לב!' : 'Warning!'}
                    </p>
                    <p className="text-sm text-yellow-200/80 mt-1">
                      {language === 'he'
                        ? 'האיפוס יחזיר אותך לרמה 1. כל ה-XP הנוכחי יאופס, אבל תקבל את כל הפרסים למטה.'
                        : 'This will reset you to Level 1. All current XP will be reset, but you will gain all rewards below.'}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-neo bg-red-500/20 border-2 border-red-500/50 text-red-300 text-sm">
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
                      'bg-white/10 text-white hover:bg-white/20',
                      'transition-all',
                      'disabled:opacity-50'
                    )}
                  >
                    {language === 'he' ? 'ביטול' : 'Cancel'}
                  </button>
                  <button
                    onClick={handlePrestige}
                    disabled={isLoading}
                    className={cn(
                      'flex-1 p-3 rounded-neo border-2 border-neo-black shadow-hard-sm',
                      'font-bold uppercase text-sm',
                      `bg-gradient-to-r ${colors.gradient}`,
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
                        {language === 'he' ? 'אשר פרסטיג\'' : 'Confirm Prestige'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Main View */
              <motion.div
                key="main"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Current Status */}
                <div className="flex items-center justify-between p-4 rounded-neo bg-white/5 border-2 border-white/10">
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wide">
                      {language === 'he' ? 'רמה נוכחית' : 'Current Level'}
                    </p>
                    <p className="text-2xl font-black text-white">{currentLevel}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-white/50 uppercase tracking-wide">
                      {language === 'he' ? 'פרסטיג\'' : 'Prestige'}
                    </p>
                    <p className="text-2xl font-black">
                      {currentPrestige > 0 ? (
                        <span className={cn(PRESTIGE_COLORS[currentPrestige as keyof typeof PRESTIGE_COLORS]?.text || 'text-white')}>
                          {PRESTIGE_ICONS[currentPrestige]} {toRoman(currentPrestige)}
                        </span>
                      ) : (
                        <span className="text-white/50">-</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/50 uppercase tracking-wide">
                      {language === 'he' ? 'מכפיל XP' : 'XP Multiplier'}
                    </p>
                    <p className="text-2xl font-black text-neo-lime">
                      {prestigeMultiplier > 1 ? `${Math.round((prestigeMultiplier - 1) * 100)}%` : '-'}
                    </p>
                  </div>
                </div>

                {isMaxPrestige ? (
                  /* Max Prestige Reached */
                  <div className="text-center py-6">
                    <div className="text-5xl mb-3">{PRESTIGE_ICONS[5]}</div>
                    <p className="text-xl font-black text-purple-400">
                      {language === 'he' ? 'פרסטיג\' מקסימלי!' : 'Maximum Prestige!'}
                    </p>
                    <p className="text-white/60 text-sm mt-1">
                      {language === 'he'
                        ? 'הגעת לרמה הגבוהה ביותר. אתה אגדה!'
                        : 'You have reached the highest level. You are a legend!'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Next Prestige Rewards Preview */}
                    <div className="space-y-2">
                      <p className="text-xs text-white/50 uppercase tracking-wide flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {language === 'he' ? `פרסים לפרסטיג' ${toRoman(nextPrestigeLevel)}` : `Prestige ${toRoman(nextPrestigeLevel)} Rewards`}
                      </p>

                      <div className="grid gap-2">
                        {nextRewards.map((reward, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-neo',
                              'bg-white/5 border-2',
                              canPrestige ? colors.border : 'border-white/10'
                            )}
                          >
                            <span className="text-2xl">{reward.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className={cn('font-bold text-sm', canPrestige ? colors.text.replace('text-', 'text-') : 'text-white')}>
                                {reward.displayName}
                              </p>
                              <p className="text-xs text-white/50 truncate">{reward.description}</p>
                            </div>
                            {reward.type === 'multiplier' && (
                              <Zap className={cn('w-4 h-4', canPrestige ? 'text-neo-lime' : 'text-white/30')} />
                            )}
                            {reward.type === 'title' && (
                              <Crown className={cn('w-4 h-4', canPrestige ? 'text-neo-lime' : 'text-white/30')} />
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Prestige Button */}
                    {canPrestige ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsConfirming(true)}
                        className={cn(
                          'w-full p-4 rounded-neo border-4 border-neo-black shadow-hard-lg',
                          'font-black text-lg uppercase tracking-wide',
                          `bg-gradient-to-r ${colors.gradient}`,
                          colors.text,
                          'hover:shadow-hard-xl hover:-translate-y-1',
                          'transition-all'
                        )}
                      >
                        <Sparkles className="w-5 h-5 inline me-2" />
                        {language === 'he' ? `קפוץ לפרסטיג' ${toRoman(nextPrestigeLevel)}` : `Prestige to ${toRoman(nextPrestigeLevel)}`}
                      </motion.button>
                    ) : (
                      <div className="p-4 rounded-neo bg-white/5 border-2 border-white/10 text-center">
                        <p className="text-white/50 text-sm">
                          {language === 'he'
                            ? `הגע לרמה 100 כדי לבצע פרסטיג'`
                            : `Reach Level 100 to Prestige`}
                        </p>
                        <p className="text-white/30 text-xs mt-1">
                          {language === 'he'
                            ? `${100 - currentLevel} רמות נותרו`
                            : `${100 - currentLevel} levels remaining`}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

export default PrestigeModal;
