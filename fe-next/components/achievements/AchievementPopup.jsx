'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';

/**
 * Neo-Brutalist Achievement Popup
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 */
const AchievementPopup = ({ achievement, onComplete }) => {
  const { t } = useLanguage();
  const { playAchievementSound } = useSoundEffects();
  const [progress, setProgress] = useState(0);
  const displayDuration = 3000; // 3 seconds

  useEffect(() => {
    if (!achievement) return;

    // Play sound
    playAchievementSound();

    // Fire confetti with Neo-Brutalist colors (smaller burst)
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.2 },
      colors: ['#FFE135', '#FF6B35', '#FF1493', '#00FFFF', '#BFFF00'],
      zIndex: 9999,
    });

    // Animate progress bar
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / displayDuration) * 100, 100);
      setProgress(newProgress);

      if (elapsed >= displayDuration) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [achievement, onComplete, playAchievementSound]);

  if (!achievement) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
        }}
        className="fixed top-20 right-4 z-[9999] w-80 max-w-[calc(100vw-2rem)]"
        onClick={onComplete}
      >
        {/* Compact toast container - Neo-Brutalist */}
        <div className="relative overflow-hidden rounded-lg bg-neo-purple border-3 border-neo-black shadow-hard-lg cursor-pointer hover:scale-[1.02] transition-transform">
          {/* Content */}
          <div className="p-3">
            <div className="flex items-center gap-3">
              {/* Compact icon */}
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              >
                <div className="w-10 h-10 bg-neo-cyan border-2 border-neo-black shadow-hard rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">
                    {achievement.icon}
                  </span>
                </div>
              </motion.div>

              {/* Text content - more compact */}
              <div className="flex-1 min-w-0">
                <motion.h3
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm font-black uppercase text-neo-yellow truncate"
                >
                  {achievement.name}
                </motion.h3>
                <motion.p
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs font-bold text-neo-white/90 line-clamp-1"
                >
                  {achievement.description}
                </motion.p>
              </div>

              {/* Close button */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex-shrink-0"
              >
                <div className="w-6 h-6 bg-neo-pink border-2 border-neo-black rounded flex items-center justify-center text-xs font-black">
                  ✕
                </div>
              </motion.div>
            </div>

            {/* Compact progress bar */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-2 h-1.5 bg-neo-navy-light border border-neo-black rounded-sm overflow-hidden"
              style={{ transformOrigin: 'left' }}
            >
              <motion.div
                className="h-full bg-neo-lime"
                style={{ width: `${progress}%` }}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AchievementPopup;
