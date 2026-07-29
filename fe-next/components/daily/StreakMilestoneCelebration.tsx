'use client';

import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '@/utils/confettiUtils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';

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
  // Performance optimization for low-end devices
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const skipConfetti = useMemo(() => isLowEnd || !enableComplexAnimations, [isLowEnd, enableComplexAnimations]);

  // Refs for cleanup
  const rafIdRef = useRef<number | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup function
  const cleanupAnimations = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // Fire confetti celebration (with proper cleanup)
  const triggerCelebration = useCallback(() => {
    // Skip confetti entirely on low-end devices
    if (skipConfetti) return cleanupAnimations;

    // Clean up any previous animations
    cleanupAnimations();

    // Reduced duration and particle counts for performance
    const duration = 2000; // Reduced from 3000
    const end = Date.now() + duration;
    let cancelled = false;

    // Color schemes based on milestone
    const colors = streak >= 100
      ? ['#FFD700', '#FFA500', '#FF4500', '#FF1493'] // Gold/orange for 100+
      : streak >= 30
        ? ['#9333EA', '#A855F7', '#C084FC', '#E879F9'] // Purple for 30+
        : ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0']; // Green for 7+

    const frame = () => {
      if (cancelled) return;

      fireConfetti({
        particleCount: 3, // Reduced from 5
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors,
      });
      fireConfetti({
        particleCount: 3, // Reduced from 5
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end && !cancelled) {
        rafIdRef.current = requestAnimationFrame(frame);
      }
    };
    frame();

    // Extra celebration bursts (reduced particle counts) - track timeouts for cleanup
    const t1 = setTimeout(() => {
      if (cancelled) return;
      fireConfetti({
        particleCount: 80, // Reduced from 150
        spread: 180,
        origin: { y: 0.6, x: 0.5 },
        colors,
      });
    }, 300);
    timeoutsRef.current.push(t1);

    if (streak >= 30) {
      const t2 = setTimeout(() => {
        if (cancelled) return;
        fireConfetti({
          particleCount: 100, // Reduced from 200
          spread: 200,
          origin: { y: 0.5, x: 0.5 },
          colors,
        });
      }, 800);
      timeoutsRef.current.push(t2);
    }

    if (streak >= 100) {
      const t3 = setTimeout(() => {
        if (cancelled) return;
        fireConfetti({
          particleCount: 150, // Reduced from 300
          spread: 360,
          origin: { y: 0.5, x: 0.5 },
          colors,
        });
      }, 1500);
      timeoutsRef.current.push(t3);
    }

    // Return cleanup function
    return () => {
      cancelled = true;
      cleanupAnimations();
    };
  }, [streak, skipConfetti, cleanupAnimations]);

  useEffect(() => {
    if (isOpen) {
      // Slight delay to ensure modal is visible
      const timer = setTimeout(() => {
        const cleanup = triggerCelebration();
        // Store cleanup for when isOpen becomes false
        return cleanup;
      }, 100);
      return () => {
        clearTimeout(timer);
        cleanupAnimations();
      };
    }
    return undefined;
  }, [isOpen, triggerCelebration, cleanupAnimations]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
          onClick={onClose}
        >
          <m.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="bg-linear-to-br from-neo-cream to-white dark:from-neo-navy dark:to-neo-navy-light rounded-neo border-4 border-neo-black p-8 max-w-md w-full text-center shadow-hard-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Celebration mascot — Lexi joins the streak party */}
            <div className="flex justify-center mb-2">
              <CelebrationMascotWithEntrance variant="celebration" size="xl" delay={0.3} clipBorder="none" />
            </div>

            {/* Animated emoji */}
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-8xl mb-4"
            >
              {emoji}
            </m.div>

            {/* Title with animation */}
            <m.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 26 }}
              className="text-3xl md:text-4xl font-black text-neo-black dark:text-white mb-2"
            >
              {title}
            </m.h2>

            {/* Streak number */}
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.4, stiffness: 400, damping: 22 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-orange-400 to-red-500 rounded-neo border-3 border-neo-black shadow-hard mb-4"
            >
              <span className="text-4xl font-black text-white">{streak}</span>
              <span className="text-lg font-bold text-white">DAYS</span>
            </m.div>

            {/* Subtitle */}
            <m.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 280, damping: 26 }}
              className="text-gray-600 dark:text-gray-300 text-lg mb-6"
            >
              {subtitle}
            </m.p>

            {/* Dismiss button */}
            <m.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 26 }}
            >
              <Button
                onClick={onClose}
                className="w-full max-w-btn py-4 text-lg font-black uppercase bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all"
              >
                Keep the streak going!
              </Button>
            </m.div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default StreakMilestoneCelebration;
