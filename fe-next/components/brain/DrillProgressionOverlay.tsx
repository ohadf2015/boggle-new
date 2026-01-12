'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Brain, Target, Shuffle, BookOpen, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CognitiveDomain, BrainTier } from '@/shared/types/cognitive';

interface DrillProgressionOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Called when overlay should close */
  onClose: () => void;
  /** The domain that was trained */
  targetDomain: CognitiveDomain;
  /** New domain score after drill */
  newDomainScore: number;
  /** Previous domain score */
  previousDomainScore?: number;
  /** Score change delta */
  scoreDelta: number;
  /** New overall brain score */
  overallScore: number;
  /** Current tier */
  tier: BrainTier;
}

const DOMAIN_CONFIG: Record<CognitiveDomain, {
  icon: typeof Zap;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  processingSpeed: {
    icon: Zap,
    color: 'text-neo-lime',
    bgColor: 'bg-neo-lime',
    borderColor: 'border-yellow-600',
  },
  workingMemory: {
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400',
    borderColor: 'border-purple-600',
  },
  attention: {
    icon: Target,
    color: 'text-neo-orange',
    bgColor: 'bg-neo-orange',
    borderColor: 'border-orange-600',
  },
  flexibility: {
    icon: Shuffle,
    color: 'text-neo-cyan',
    bgColor: 'bg-neo-cyan',
    borderColor: 'border-cyan-600',
  },
  vocabulary: {
    icon: BookOpen,
    color: 'text-lime-400',
    bgColor: 'bg-lime-400',
    borderColor: 'border-lime-600',
  },
};

/**
 * Animated counter component for score display
 */
function AnimatedScore({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(easeOut * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

/**
 * Drill Progression Overlay Component
 *
 * Shows animated brain score progression after completing a drill.
 * Highlights the specific domain that was trained.
 */
export default function DrillProgressionOverlay({
  isOpen,
  onClose,
  targetDomain,
  newDomainScore,
  previousDomainScore = 0,
  scoreDelta,
  overallScore,
  tier,
}: DrillProgressionOverlayProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';
  const [showScore, setShowScore] = useState(false);
  const [showDelta, setShowDelta] = useState(false);
  const [showOverall, setShowOverall] = useState(false);

  const domainConfig = DOMAIN_CONFIG[targetDomain];
  const Icon = domainConfig.icon;

  // Animate sequence
  useEffect(() => {
    if (isOpen) {
      setShowScore(false);
      setShowDelta(false);
      setShowOverall(false);

      const scoreTimer = setTimeout(() => setShowScore(true), 500);
      const deltaTimer = setTimeout(() => setShowDelta(true), 1200);
      const overallTimer = setTimeout(() => setShowOverall(true), 1800);

      return () => {
        clearTimeout(scoreTimer);
        clearTimeout(deltaTimer);
        clearTimeout(overallTimer);
      };
    }
    return undefined;
  }, [isOpen]);

  // Auto-close after animation
  useEffect(() => {
    if (isOpen) {
      const closeTimer = setTimeout(onClose, 4500);
      return () => clearTimeout(closeTimer);
    }
    return undefined;
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute inset-0',
              isDarkMode ? 'bg-neo-navy' : 'bg-neo-black'
            )}
            onClick={onClose}
          />

          {/* Content Card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              'relative w-full max-w-sm rounded-neo border-4 border-neo-black shadow-hard-lg p-6',
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            )}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className={cn(
                'absolute top-3 right-3 p-1.5 rounded-neo border-2 border-neo-black',
                'transition-all hover:scale-105',
                isDarkMode ? 'bg-slate-700 text-neo-white' : 'bg-gray-100 text-neo-black'
              )}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'text-sm font-bold uppercase tracking-wide mb-2',
                  isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70'
                )}
              >
                {t('brain.drills.brainTraining')}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  'text-xl font-black uppercase',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black'
                )}
              >
                {t(`brain.domains.${targetDomain}`)}
              </motion.h2>
            </div>

            {/* Domain Icon with Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={cn(
                  'w-20 h-20 rounded-neo border-4 border-neo-black flex items-center justify-center',
                  domainConfig.bgColor
                )}
              >
                <Icon className="w-10 h-10 text-neo-black" />
              </motion.div>
            </motion.div>

            {/* Score Display */}
            <AnimatePresence>
              {showScore && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-4"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className={cn(
                      'text-5xl font-black',
                      isDarkMode ? 'text-neo-white' : 'text-neo-black'
                    )}>
                      <AnimatedScore value={newDomainScore} />
                    </span>
                    <span className={cn(
                      'text-xl font-bold',
                      isDarkMode ? 'text-neo-white/50' : 'text-neo-black/50'
                    )}>
                      /100
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className={cn(
                    'h-3 mt-3 rounded-full border-2 border-neo-black overflow-hidden',
                    isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                  )}>
                    <motion.div
                      className={cn('h-full', domainConfig.bgColor)}
                      initial={{ width: `${previousDomainScore}%` }}
                      animate={{ width: `${newDomainScore}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Delta Display */}
            <AnimatePresence>
              {showDelta && scoreDelta !== 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="flex justify-center mb-4"
                >
                  <div className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-neo border-3 border-neo-black',
                    scoreDelta > 0 ? 'bg-neo-green' : 'bg-red-400'
                  )}>
                    <TrendingUp className={cn(
                      'w-5 h-5 text-neo-black',
                      scoreDelta < 0 && 'rotate-180'
                    )} />
                    <span className="text-lg font-black text-neo-black">
                      {scoreDelta > 0 ? '+' : ''}{scoreDelta}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Overall Score */}
            <AnimatePresence>
              {showOverall && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'text-center pt-4 mt-4 border-t-2',
                    isDarkMode ? 'border-slate-700' : 'border-gray-200'
                  )}
                >
                  <p className={cn(
                    'text-xs font-bold uppercase tracking-wide mb-1',
                    isDarkMode ? 'text-neo-white/50' : 'text-neo-black/50'
                  )}>
                    {t('brain.overallScore')}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className={cn(
                      'text-2xl font-black',
                      isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
                    )}>
                      {overallScore}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-neo border-2 border-neo-black text-xs font-bold uppercase',
                      isDarkMode ? 'bg-slate-700 text-neo-white' : 'bg-gray-100 text-neo-black'
                    )}>
                      {t(`brain.tiers.${tier}`)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tap to close hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 2 }}
              className={cn(
                'text-center text-xs mt-4',
                isDarkMode ? 'text-neo-white' : 'text-neo-black'
              )}
            >
              {t('common.tapToClose')}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
