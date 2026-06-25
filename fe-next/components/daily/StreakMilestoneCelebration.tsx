'use client';

import React, { useEffect, useCallback, useMemo, useRef } from 'react';
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
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-in fade-in-0 duration-300"
          onClick={onClose}
        >
          <div
            className="bg-linear-to-br from-neo-cream to-white dark:from-neo-navy dark:to-neo-navy-light rounded-neo border-4 border-neo-black p-8 max-w-md w-full text-center shadow-hard-lg animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
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
            <div
              className="text-8xl mb-4 animate-in zoom-in-50 duration-300"
              style={{ animationDelay: '0.2s' }}
            >
              {emoji}
            </div>

            {/* Title with animation */}
            <h2
              className="text-3xl md:text-4xl font-black text-neo-black dark:text-white mb-2 animate-in fade-in-0 zoom-in-95 duration-300"
              style={{ animationDelay: '0.3s' }}
            >
              {title}
            </h2>

            {/* Streak number */}
            <div
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-orange-400 to-red-500 rounded-neo border-3 border-neo-black shadow-hard mb-4 animate-in zoom-in-50 duration-300"
              style={{ animationDelay: '0.4s' }}
            >
              <span className="text-4xl font-black text-white">{streak}</span>
              <span className="text-lg font-bold text-white">DAYS</span>
            </div>

            {/* Subtitle */}
            <p
              className="text-gray-600 dark:text-gray-300 text-lg mb-6 animate-in fade-in-0 zoom-in-95 duration-300"
              style={{ animationDelay: '0.5s' }}
            >
              {subtitle}
            </p>

            {/* Dismiss button */}
            <div
              className="animate-in fade-in-0 zoom-in-95 duration-300"
              style={{ animationDelay: '0.6s' }}
            >
              <Button
                onClick={onClose}
                className="w-full max-w-btn py-4 text-lg font-black uppercase bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all"
              >
                Keep the streak going!
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StreakMilestoneCelebration;
