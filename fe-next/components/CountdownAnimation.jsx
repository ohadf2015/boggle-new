import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CountdownAnimation = ({ onComplete, duration = 3000 }) => {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      // Countdown finished, trigger completion
      const timer = setTimeout(() => {
        onComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }

    // Decrease count every second
    const timer = setTimeout(() => {
      setCount(count - 1);
    }, duration / 3);

    return () => clearTimeout(timer);
  }, [count, duration, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {count > 0 && (
          <motion.div
            key={count}
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative"
          >
            {/* Outer glow rings */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 blur-2xl"
            />

            {/* Main number */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                textShadow: [
                  '0 0 20px rgba(6, 182, 212, 0.8)',
                  '0 0 40px rgba(168, 85, 247, 0.8)',
                  '0 0 20px rgba(6, 182, 212, 0.8)'
                ]
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400"
              style={{
                WebkitTextStroke: '2px rgba(255, 255, 255, 0.8)',
                filter: 'drop-shadow(0 0 30px rgba(6, 182, 212, 0.6))'
              }}
            >
              {count}
            </motion.div>

            {/* Pulse rings */}
            {[0, 0.2, 0.4].map((delay, i) => (
              <motion.div
                key={i}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay,
                  ease: 'easeOut'
                }}
                className="absolute inset-0 rounded-full border-4 border-cyan-400"
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CountdownAnimation;
