'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, TrendingUp, Star, X, type LucideIcon } from 'lucide-react';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BrainTier } from '@/shared/types/cognitive';

interface TierUpCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  previousTier: BrainTier;
  newTier: BrainTier;
  newScore: number;
}

const TIER_CONFIG: Record<BrainTier, {
  color: string;
  bgGradient: string;
  emoji: string;
  icon: LucideIcon;
}> = {
  novice: { color: 'text-slate-400', bgGradient: 'from-slate-500 to-slate-600', emoji: '🌱', icon: Star },
  apprentice: { color: 'text-neo-green', bgGradient: 'from-green-500 to-green-600', emoji: '📚', icon: Star },
  intermediate: { color: 'text-neo-cyan', bgGradient: 'from-cyan-500 to-cyan-600', emoji: '⚡', icon: TrendingUp },
  advanced: { color: 'text-neo-purple', bgGradient: 'from-purple-500 to-purple-600', emoji: '🔥', icon: TrendingUp },
  expert: { color: 'text-neo-orange', bgGradient: 'from-orange-500 to-orange-600', emoji: '🏆', icon: Crown },
  master: { color: 'text-neo-lime', bgGradient: 'from-yellow-400 to-amber-500', emoji: '👑', icon: Crown },
};

const TIER_ORDER: BrainTier[] = ['novice', 'apprentice', 'intermediate', 'advanced', 'expert', 'master'];

/**
 * TierUpCelebration Component
 *
 * A celebratory modal that appears when a user advances to a new tier.
 * Features confetti-like particles, animated tier badge, and encouraging messaging.
 */
export default function TierUpCelebration({
  isOpen,
  onClose,
  previousTier,
  newTier,
  newScore,
}: TierUpCelebrationProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';
  const [showConfetti, setShowConfetti] = useState(false);

  const newTierConfig = TIER_CONFIG[newTier];
  const TierIcon = newTierConfig.icon;
  const tierIndex = TIER_ORDER.indexOf(newTier);

  // Generate stable confetti values
  const [confettiValues] = useState(() =>
    Array.from({ length: 40 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 720 - 360,
      duration: 1.5 + Math.random() * 1.5,
      size: 8 + Math.random() * 8,
    }))
  );

  // Generate stable star values
  const [starValues] = useState(() =>
    Array.from({ length: 12 }).map(() => ({
      angle: Math.random() * 360,
      distance: 60 + Math.random() * 80,
      delay: Math.random() * 0.5,
      duration: 0.8 + Math.random() * 0.4,
    }))
  );

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
        onClick={onClose}
      >
        {/* Confetti Particles */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confettiValues.map((values, i) => (
              <motion.div
                key={i}
                className="absolute rounded-sm"
                style={{
                  width: values.size,
                  height: values.size,
                  backgroundColor: [
                    '#FFE135', // yellow
                    '#00D4FF', // cyan
                    '#A855F7', // purple
                    '#22C55E', // green
                    '#F97316', // orange
                  ][i % 5],
                }}
                initial={{
                  x: '50vw',
                  y: '30vh',
                  scale: 0,
                  rotate: 0,
                }}
                animate={{
                  x: `${values.x}vw`,
                  y: `${values.y}vh`,
                  scale: [0, 1, 0.5],
                  rotate: values.rotation,
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: values.duration,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}

        {/* Main Modal */}
        <motion.div
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.5, y: 50 }}
          transition={{ type: 'spring', damping: 15 }}
          className={cn(
            'relative max-w-sm w-full rounded-neo border-4 border-neo-black shadow-hard-lg overflow-hidden',
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient Header */}
          <div className={cn(
            'bg-gradient-to-r p-6 text-center text-white',
            newTierConfig.bgGradient
          )}>
            {/* Close Button - minimum 44px touch target for accessibility */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Animated Tier Badge */}
            <motion.div
              className="relative inline-block"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Radiating Stars */}
              {showConfetti && starValues.map((star, i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2"
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{
                    x: Math.cos(star.angle * Math.PI / 180) * star.distance,
                    y: Math.sin(star.angle * Math.PI / 180) * star.distance,
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: star.duration,
                    delay: star.delay,
                  }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </motion.div>
              ))}

              {/* Main Badge */}
              <div className="w-24 h-24 rounded-full border-4 border-white/50 bg-white/20 flex items-center justify-center">
                <span className="text-5xl">{newTierConfig.emoji}</span>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-black uppercase mt-4 tracking-wide"
            >
              {t('brain.tierUp.title')}
            </motion.h2>

            {/* Tier Name */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-white/20 rounded-full"
            >
              <TierIcon className="w-5 h-5" />
              <span className="font-black uppercase tracking-wider">
                {t(`brain.tiers.${newTier}`)}
              </span>
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            {/* Progress Arrow */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <span className={cn(
                'text-sm font-bold px-3 py-1 rounded-full border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700 text-neo-white' : 'bg-gray-100 text-neo-black'
              )}>
                {t(`brain.tiers.${previousTier}`)}
              </span>
              <TrendingUp className="w-5 h-5 text-neo-green" />
              <span className={cn(
                'text-sm font-bold px-3 py-1 rounded-full border-2 border-neo-black',
                `bg-gradient-to-r ${newTierConfig.bgGradient} text-white`
              )}>
                {t(`brain.tiers.${newTier}`)}
              </span>
            </motion.div>

            {/* New Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={cn(
                'p-4 rounded-neo border-2 border-neo-black mb-4',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-cream'
              )}
            >
              <p className={cn(
                'text-xs font-bold uppercase mb-1',
                isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
              )}>
                {t('brain.tierUp.newScore')}
              </p>
              <p className={cn(
                'text-4xl font-black',
                newTierConfig.color
              )}>
                {newScore}
                <span className={cn(
                  'text-lg ml-1',
                  isDarkMode ? 'text-neo-white/50' : 'text-neo-black/50'
                )}>
                  /100
                </span>
              </p>
            </motion.div>

            {/* Tier Progress Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center gap-1 mb-4"
            >
              {TIER_ORDER.map((tier, i) => (
                <div
                  key={tier}
                  className={cn(
                    'w-3 h-3 rounded-full border border-neo-black',
                    i <= tierIndex
                      ? `bg-gradient-to-r ${TIER_CONFIG[tier].bgGradient}`
                      : isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                  )}
                />
              ))}
            </motion.div>

            {/* Encouragement Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className={cn(
                'text-sm mb-4',
                isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
              )}
            >
              {t('brain.tierUp.message', { tier: t(`brain.tiers.${newTier}`) })}
            </motion.p>

            {/* Continue Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className={cn(
                'w-full px-6 py-3 rounded-neo font-black uppercase',
                'border-3 border-neo-black shadow-hard',
                'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg',
                'bg-neo-cyan text-neo-black'
              )}
            >
              {t('brain.tierUp.continue')}
            </motion.button>
          </div>

          {/* Celebration Mascot - positioned at corner */}
          <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 pointer-events-none z-10">
            <CelebrationMascotWithEntrance
              variant="celebration"
              size="sm"
              delay={0.9}
              className="drop-shadow-lg"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
