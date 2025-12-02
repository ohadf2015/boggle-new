import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaTimes, FaClock } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';

interface AutoRejoinTimerProps {
  /** Duration in seconds before auto-rejoin (default: 30) */
  duration?: number;
  /** Callback when timer reaches 0 or user clicks rejoin */
  onRejoin: () => void;
  /** Callback when user dismisses the timer */
  onDismiss?: () => void;
  /** Whether the timer is visible (default: true) */
  visible?: boolean;
}

/**
 * AutoRejoinTimer Component
 * Shows a countdown timer that auto-transitions player back to the room
 * after results. Player can dismiss or manually rejoin early.
 */
const AutoRejoinTimer: React.FC<AutoRejoinTimerProps> = ({
  duration = 30,
  onRejoin,
  onDismiss,
  visible = true,
}) => {
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState(duration);
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset countdown when duration changes or component remounts
  useEffect(() => {
    setCountdown(duration);
    setIsDismissed(false);
  }, [duration]);

  // Refs to track callback and interval for proper cleanup
  const onRejoinRef = useRef(onRejoin);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    onRejoinRef.current = onRejoin;
  }, [onRejoin]);

  // Reset triggered state when component remounts or becomes visible again
  useEffect(() => {
    hasTriggeredRef.current = false;
  }, [visible, duration]);

  // Countdown timer
  useEffect(() => {
    if (isDismissed || !visible) return;

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Clear the interval immediately when reaching 0
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Only trigger onRejoin once
          if (!hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            // Use setTimeout to avoid calling onRejoin during state update
            setTimeout(() => onRejoinRef.current(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isDismissed, visible]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleRejoinNow = useCallback(() => {
    onRejoin();
  }, [onRejoin]);

  // Calculate progress percentage for the circular timer
  const progress = (countdown / duration) * 100;
  const circumference = 2 * Math.PI * 42; // radius = 42
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (isDismissed || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 mx-4 max-w-[calc(100%-2rem)]"
      >
        <div className="bg-neo-cyan border-4 border-neo-black rounded-neo-lg shadow-hard-xl p-4 flex flex-col items-center gap-3">
          {/* Row 1: Text label */}
          <div className="flex items-center gap-2">
            <FaClock className="text-neo-black" />
            <span className="font-bold text-neo-black text-sm sm:text-base whitespace-nowrap">
              {t('results.autoRejoinIn') || 'Auto-rejoin in'}
            </span>
          </div>

          {/* Row 2: Timer and buttons */}
          <div className="flex items-center gap-4">
            {/* Circular countdown timer */}
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--neo-black)"
                  strokeWidth="6"
                  opacity="0.2"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--neo-black)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transition={{ duration: 0.3, ease: 'linear' }}
                />
              </svg>
              {/* Countdown number */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-neo-black">{countdown}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              {/* Rejoin Now button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRejoinNow}
                className="flex items-center gap-1 px-3 py-1.5 bg-neo-yellow border-3 border-neo-black rounded-neo shadow-hard-sm font-bold text-neo-black text-sm uppercase hover:shadow-hard transition-all"
              >
                <FaPlay className="text-xs" />
                <span>{t('results.rejoinNow') || 'Rejoin Now'}</span>
              </motion.button>

              {/* Dismiss button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDismiss}
                className="flex items-center gap-1 px-3 py-1.5 bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-sm font-bold text-neo-black text-sm uppercase hover:shadow-hard transition-all"
              >
                <FaTimes className="text-xs" />
                <span>{t('common.dismiss') || 'Dismiss'}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AutoRejoinTimer;
