import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects } from '../contexts/SoundEffectsContext';

interface GoRipplesAnimationProps {
  onComplete?: () => void;
  /** Skip the 3-2-1 countdown and just show GO (default: false) */
  skipCountdown?: boolean;
}

/**
 * Pre-game countdown and GO animation
 * Shows 3-2-1 countdown with sound beeps, then a clean "GO!" animation
 * Total duration: ~4 seconds (3 seconds countdown + 1 second GO)
 */
const GoRipplesAnimation: React.FC<GoRipplesAnimationProps> = ({
  onComplete,
  skipCountdown = false
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<'countdown' | 'go'>(skipCountdown ? 'go' : 'countdown');
  const [countdownNumber, setCountdownNumber] = useState(3);
  const { playCountdownBeep } = useSoundEffects();

  // Play beep when countdown number changes
  useEffect(() => {
    if (phase === 'countdown' && countdownNumber > 0) {
      playCountdownBeep(countdownNumber);
    }
  }, [phase, countdownNumber, playCountdownBeep]);

  // Handle countdown progression
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdownNumber <= 0) {
      // Switch to GO phase
      setPhase('go');
      return;
    }

    const timer = setTimeout(() => {
      setCountdownNumber(prev => prev - 1);
    }, 900); // Slightly less than 1 second for snappier feel

    return () => clearTimeout(timer);
  }, [phase, countdownNumber]);

  // Handle GO animation completion
  useEffect(() => {
    if (phase !== 'go') return;

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 1200); // 1.2 seconds for GO animation

    return () => clearTimeout(completeTimer);
  }, [phase, onComplete]);

  // Get color for countdown number
  const getCountdownColor = useCallback((num: number): string => {
    switch (num) {
      case 3: return 'var(--neo-cyan)';
      case 2: return 'var(--neo-yellow)';
      case 1: return 'var(--neo-orange)';
      default: return 'var(--neo-yellow)';
    }
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden bg-neo-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Countdown Phase */}
          <AnimatePresence mode="wait">
            {phase === 'countdown' && countdownNumber > 0 && (
              <motion.div
                key={`countdown-${countdownNumber}`}
                className="absolute flex items-center justify-center"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.34, 1.56, 0.64, 1], // Overshoot easing
                }}
              >
                {/* Single pulse ring */}
                <motion.div
                  className="absolute w-32 h-32 rounded-full border-4 border-neo-black"
                  style={{ backgroundColor: getCountdownColor(countdownNumber) }}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />

                {/* Number */}
                <div
                  className="relative bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-xl px-8 py-4"
                >
                  <span
                    className="text-8xl sm:text-9xl font-black text-neo-black"
                    style={{ textShadow: `3px 3px 0px ${getCountdownColor(countdownNumber)}` }}
                  >
                    {countdownNumber}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* GO Phase */}
          <AnimatePresence>
            {phase === 'go' && (
              <motion.div
                key="go-animation"
                className="absolute z-10"
                initial={{ scale: 0, opacity: 0, rotate: -10 }}
                animate={{
                  scale: [0, 1.15, 1],
                  opacity: [0, 1, 1, 0],
                  rotate: [-10, 3, 0],
                }}
                transition={{
                  duration: 1.2,
                  times: [0, 0.3, 0.7, 1],
                  ease: [0.34, 1.56, 0.64, 1]
                }}
              >
                {/* Single accent ripple */}
                <motion.div
                  className="absolute -inset-8 rounded-neo-lg border-4 border-neo-black bg-neo-cyan"
                  initial={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />

                {/* GO text container */}
                <div
                  className="relative bg-neo-yellow border-4 border-neo-black rounded-neo-lg shadow-hard-xl px-8 py-4"
                  style={{ transform: 'rotate(-1deg)' }}
                >
                  <h1
                    className="text-7xl sm:text-8xl font-black text-neo-black uppercase"
                    style={{
                      textShadow: '3px 3px 0px var(--neo-cyan)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    GO!
                  </h1>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GoRipplesAnimation;
