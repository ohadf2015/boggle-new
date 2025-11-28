'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSoundEffects } from '../../contexts/SoundEffectsContext';

const AchievementPopup = ({ achievement, onComplete }) => {
  const { t } = useLanguage();
  const { playAchievementSound } = useSoundEffects();
  const [progress, setProgress] = useState(0);
  const displayDuration = 4000; // 4 seconds

  useEffect(() => {
    if (!achievement) return;

    // Play sound
    playAchievementSound();

    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.2 },
      colors: ['#06B6D4', '#8B5CF6', '#F59E0B', '#10B981'],
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
        initial={{ y: -100, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.9 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
          duration: 0.6,
        }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90vw] max-w-md"
        onClick={onComplete}
      >
        {/* Main popup container */}
        <motion.div
          className="relative overflow-hidden rounded-2xl shadow-2xl"
          animate={{
            boxShadow: [
              '0 0 20px rgba(139, 92, 246, 0.4)',
              '0 0 40px rgba(139, 92, 246, 0.7)',
              '0 0 20px rgba(139, 92, 246, 0.4)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Background with glassmorphism */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-slate-900/95 backdrop-blur-xl" />

          {/* Animated gradient border */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(45deg, #8B5CF6, #06B6D4, #F59E0B, #8B5CF6)',
              backgroundSize: '400% 400%',
              padding: '2px',
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute inset-[2px] rounded-2xl bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-slate-900/95" />
          </motion.div>

          {/* Content */}
          <div className="relative p-5">
            {/* Header */}
            <div className="flex items-center gap-4">
              {/* Animated icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.3, 1], rotate: [-180, 10, 0] }}
                transition={{ delay: 0.3, duration: 0.5, times: [0, 0.6, 1] }}
                className="relative"
              >
                {/* Glow ring */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 blur-lg"
                  animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                {/* Icon container */}
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">{achievement.icon}</span>
                </div>
              </motion.div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs font-bold uppercase tracking-widest text-cyan-400"
                >
                  {t('achievementPopup.unlocked') || 'Achievement Unlocked!'}
                </motion.p>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-bold text-white mt-1 truncate"
                >
                  {achievement.name}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-slate-300 mt-0.5 line-clamp-2"
                >
                  {achievement.description}
                </motion.p>
              </div>
            </div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 h-1 bg-slate-700/50 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.05 }}
              />
            </motion.div>

            {/* Tap to dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1 }}
              className="text-center text-xs text-slate-400 mt-2"
            >
              {t('achievementPopup.tapToDismiss') || 'Tap to dismiss'}
            </motion.p>
          </div>

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.5, delay: 0.5, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AchievementPopup;
