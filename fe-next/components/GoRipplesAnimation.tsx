import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects } from '../contexts/SoundEffectsContext';

interface GoRipplesAnimationProps {
  onComplete?: () => void;
  /** Skip the 3-2-1 countdown and just show GO (default: false) */
  skipCountdown?: boolean;
}

/**
 * Pre-game countdown and GO animation
 * Shows 3-2-1 countdown with sound beeps, then a quick "GO!"
 * Clean, minimal design that's not distracting
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
      setPhase('go');
      return;
    }

    const timer = setTimeout(() => {
      setCountdownNumber(prev => prev - 1);
    }, 800); // Quick countdown

    return () => clearTimeout(timer);
  }, [phase, countdownNumber]);

  // Handle GO animation completion
  useEffect(() => {
    if (phase !== 'go') return;

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 800); // Quick GO display

    return () => clearTimeout(completeTimer);
  }, [phase, onComplete]);

  // Get color for countdown number
  const getCountdownColor = (num: number): string => {
    switch (num) {
      case 3: return 'var(--neo-cyan)';
      case 2: return 'var(--neo-yellow)';
      case 1: return 'var(--neo-orange)';
      default: return 'var(--neo-yellow)';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Countdown Phase */}
          <AnimatePresence mode="wait">
            {phase === 'countdown' && countdownNumber > 0 && (
              <motion.div
                key={`countdown-${countdownNumber}`}
                className="relative z-10"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <div
                  className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg px-8 py-4"
                >
                  <span
                    className="text-7xl sm:text-8xl font-black text-neo-black"
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
                className="relative z-10"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.1, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div
                  className="bg-neo-yellow border-4 border-neo-black rounded-neo-lg shadow-hard-lg px-6 py-3"
                >
                  <h1
                    className="text-6xl sm:text-7xl font-black text-neo-black uppercase"
                    style={{ textShadow: '3px 3px 0px var(--neo-cyan)' }}
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
