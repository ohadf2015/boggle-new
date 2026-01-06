import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects } from '../contexts/SoundEffectsContext';

interface GoRipplesAnimationProps {
  onComplete?: () => void;
}

/**
 * Minimal & calm pre-game countdown with smooth animations
 * Clean 3-2-1-GO with soft cyan glow - easy on the eyes
 */
const GoRipplesAnimation: React.FC<GoRipplesAnimationProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [count, setCount] = useState(3);
  const [isFadingOut, setIsFadingOut] = useState(false);
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
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else if (count === 0) {
      // Show "GO!" briefly then fade out smoothly
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 700);

      const completeTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 1000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(completeTimer);
      };
    }
    return undefined;
  }, [count, onComplete]);

  if (!isVisible) return null;

  const isGo = count === 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: isFadingOut ? 0 : 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Soft background overlay for focus */}
      <motion.div
        className="absolute inset-0 bg-neo-navy/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* Single subtle expanding ring for GO */}
      <AnimatePresence>
        {isGo && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute rounded-full border-2 border-neo-cyan/50"
            style={{ width: 120, height: 120 }}
          />
        )}
      </AnimatePresence>

      {/* Main countdown/GO text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{
            duration: 0.25,
            ease: [0.25, 0.46, 0.45, 0.94] // Smooth ease-out
          }}
          className={`relative px-10 py-5 border-4 border-neo-black rounded-neo ${
            isGo ? 'bg-neo-lime' : 'bg-neo-cyan'
          }`}
          style={{
            boxShadow: isGo
              ? '6px 6px 0px var(--neo-black), 0 0 30px rgba(191, 255, 0, 0.4)'
              : '6px 6px 0px var(--neo-black), 0 0 25px rgba(0, 255, 255, 0.3)'
          }}
        >
          {/* Subtle inner glow */}
          <motion.div
            className="absolute inset-0 rounded-neo"
            animate={{
              opacity: [0.1, 0.25, 0.1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: isGo
                ? 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)',
            }}
          />

          <span
            className={`relative z-10 font-black text-neo-black ${
              isGo ? 'text-6xl sm:text-8xl' : 'text-5xl sm:text-7xl'
            }`}
            style={{ textShadow: '2px 2px 0px rgba(255,255,255,0.3)' }}
          >
            {count > 0 ? count : 'GO!'}
          </span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default GoRipplesAnimation;
