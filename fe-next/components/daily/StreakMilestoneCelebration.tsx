'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '@/utils/confettiUtils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StreakMilestoneCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  emoji: string;
  title: string;
  subtitle: string;
}

/**
 * Streak Milestone Celebration Modal
 * Shows dramatic celebration when player hits streak milestones (7, 14, 30, 50, 100, 365 days)
 */
const StreakMilestoneCelebration: React.FC<StreakMilestoneCelebrationProps> = ({
  isOpen,
  onClose,
  streak,
  emoji,
  title,
  subtitle,
}) => {
  // Fire confetti celebration
  const triggerCelebration = useCallback(() => {
    // Massive celebration burst
    const duration = 3000;
    const end = Date.now() + duration;

    // Color schemes based on milestone
    const colors = streak >= 100
      ? ['#FFD700', '#FFA500', '#FF4500', '#FF1493'] // Gold/orange for 100+
      : streak >= 30
        ? ['#9333EA', '#A855F7', '#C084FC', '#E879F9'] // Purple for 30+
        : ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0']; // Green for 7+

    const frame = () => {
      fireConfetti({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors,
      });
      fireConfetti({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Extra celebration bursts
    setTimeout(() => {
      fireConfetti({
        particleCount: 150,
        spread: 180,
        origin: { y: 0.6, x: 0.5 },
        colors,
      });
    }, 300);

    if (streak >= 30) {
      setTimeout(() => {
        fireConfetti({
          particleCount: 200,
          spread: 200,
          origin: { y: 0.5, x: 0.5 },
          colors,
        });
      }, 800);
    }

    if (streak >= 100) {
      setTimeout(() => {
        fireConfetti({
          particleCount: 300,
          spread: 360,
          origin: { y: 0.5, x: 0.5 },
          colors,
        });
      }, 1500);
    }
  }, [streak]);

  useEffect(() => {
    if (isOpen) {
      // Slight delay to ensure modal is visible
      const timer = setTimeout(triggerCelebration, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, triggerCelebration]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="bg-gradient-to-br from-neo-cream to-white dark:from-neo-navy dark:to-neo-navy-light rounded-neo border-4 border-neo-black p-8 max-w-md w-full text-center shadow-hard-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Animated emoji */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-8xl mb-4"
            >
              {emoji}
            </motion.div>

            {/* Title with animation */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-black text-neo-black dark:text-white mb-2"
            >
              {title}
            </motion.h2>

            {/* Streak number */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.4 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-neo border-3 border-neo-black shadow-hard mb-4"
            >
              <span className="text-4xl font-black text-white">{streak}</span>
              <span className="text-lg font-bold text-white/90">DAYS</span>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-600 dark:text-gray-300 text-lg mb-6"
            >
              {subtitle}
            </motion.p>

            {/* Dismiss button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={onClose}
                className="w-full py-4 text-lg font-black uppercase bg-gradient-to-r from-neo-lime to-neo-cyan text-neo-black border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all"
              >
                Keep the streak going!
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StreakMilestoneCelebration;
