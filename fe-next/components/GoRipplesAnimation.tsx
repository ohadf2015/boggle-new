import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects } from '../contexts/SoundEffectsContext';

interface GoRipplesAnimationProps {
  onComplete?: () => void;
}

/**
 * Minimal pre-game countdown with sound
 * Shows quick 3-2-1 countdown with beeps, then brief "GO!"
 * Very lightweight - no heavy animations or backdrops
 */
const GoRipplesAnimation: React.FC<GoRipplesAnimationProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [count, setCount] = useState(3);
  const { playCountdownBeep } = useSoundEffects();

  // Play beep for each countdown number
  useEffect(() => {
    if (count > 0) {
      playCountdownBeep(count);
    }
  }, [count, playCountdownBeep]);

  // Countdown logic
  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 700);
      return () => clearTimeout(timer);
    } else if (count === 0) {
      // Show "GO!" briefly then complete
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [count, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.1, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-6 py-3 bg-neo-yellow border-3 border-neo-black rounded-neo shadow-hard"
        >
          <span
            className="text-5xl sm:text-6xl font-black text-neo-black"
            style={{ textShadow: '2px 2px 0px var(--neo-cyan)' }}
          >
            {count > 0 ? count : 'GO!'}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GoRipplesAnimation;
