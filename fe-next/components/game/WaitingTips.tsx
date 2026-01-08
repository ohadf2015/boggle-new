'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ArrowRight, Star, Zap, Target, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaitingTipsProps {
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
  rotationInterval?: number; // ms
}

interface GameTip {
  icon: React.ReactNode;
  titleKey: string;
  textKey: string;
  fallbackTitle: string;
  fallbackText: string;
}

const TIPS: GameTip[] = [
  {
    icon: <ArrowRight className="w-5 h-5" />,
    titleKey: 'tips.swipeTitle',
    textKey: 'tips.swipeText',
    fallbackTitle: 'Swipe to Connect',
    fallbackText: 'Drag your finger across letters to form words. You can move in any direction!',
  },
  {
    icon: <Star className="w-5 h-5" />,
    titleKey: 'tips.longerTitle',
    textKey: 'tips.longerText',
    fallbackTitle: 'Longer = Better',
    fallbackText: 'Longer words score exponentially more points. A 6-letter word is worth much more than two 3-letter words!',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    titleKey: 'tips.comboTitle',
    textKey: 'tips.comboText',
    fallbackTitle: 'Build Combos',
    fallbackText: 'Find words quickly in succession to build combo multipliers for bonus points!',
  },
  {
    icon: <Target className="w-5 h-5" />,
    titleKey: 'tips.uniqueTitle',
    textKey: 'tips.uniqueText',
    fallbackTitle: 'Stay Unique',
    fallbackText: 'Words found by multiple players score zero! Think creatively to find unique words.',
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    titleKey: 'tips.bonusTitle',
    textKey: 'tips.bonusText',
    fallbackTitle: 'Bonus Rounds',
    fallbackText: 'Watch for fire rounds with 2x points! Perfect timing can turn the game around.',
  },
];

export function WaitingTips({ t, className, rotationInterval = 5000 }: WaitingTipsProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Shuffle tips on mount for variety (lazy initializer runs once)
  const [shuffledTips] = useState(() => {
    const shuffled = [...TIPS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % shuffledTips.length);
    }, rotationInterval);

    return () => clearInterval(timer);
  }, [shuffledTips.length, rotationInterval]);

  const currentTip = shuffledTips[currentTipIndex];

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-neo-yellow p-1.5 rounded border-2 border-neo-black text-neo-black">
          <Lightbulb className="w-4 h-4 text-neo-black" />
        </div>
        <span className="text-sm font-bold uppercase tracking-wide text-neo-cream/80">
          {t('tips.header') || 'Pro Tips'}
        </span>
      </div>

      {/* Tip card */}
      <div className="relative min-h-[100px] bg-slate-700/50 rounded-lg border-2 border-neo-black/30 p-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTipIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex gap-3"
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-neo-cyan/20 rounded-lg border-2 border-neo-cyan/40 flex items-center justify-center text-neo-cyan">
              {currentTip.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-neo-cream mb-1">
                {t(currentTip.titleKey) || currentTip.fallbackTitle}
              </h4>
              <p className="text-sm text-neo-cream/70 leading-relaxed">
                {t(currentTip.textKey) || currentTip.fallbackText}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="absolute bottom-2 right-3 flex gap-1.5">
          {shuffledTips.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTipIndex(index)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                index === currentTipIndex
                  ? "bg-neo-cyan w-4"
                  : "bg-neo-cream/30 hover:bg-neo-cream/50"
              )}
              aria-label={`Tip ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default WaitingTips;
