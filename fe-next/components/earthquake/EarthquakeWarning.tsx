'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface EarthquakeWarningProps {
  isVisible: boolean;
}

/**
 * EarthquakeWarning - Full-screen warning overlay before earthquake
 *
 * Shows a bold Neo-Brutalist warning card 2 seconds before earthquake hits.
 * Includes pulsing animation, screen reader announcement, and dramatic styling.
 */
export const EarthquakeWarning: React.FC<EarthquakeWarningProps> = ({ isVisible }) => {
  const { t } = useLanguage();

  // Generate random distances for particle effects (once on mount)
  const [distances] = useState(() =>
    Array.from({ length: 8 }, () => 100 + Math.random() * 50)
  );

  // Announce for screen readers when warning appears
  useEffect(() => {
    if (isVisible) {
      // Create screen reader announcement
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'alert');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.className = 'sr-only';
      announcement.textContent = t('earthquake.warning') || 'Earthquake incoming!';
      document.body.appendChild(announcement);

      // Clean up
      return () => {
        document.body.removeChild(announcement);
      };
    }
    return undefined;
  }, [isVisible, t]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Semi-transparent backdrop - pointer-events-none to allow word selection */}
          <motion.div
            className="absolute inset-0 bg-neo-black/40 text-white backdrop-blur-sm pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Warning Card */}
          <motion.div
            className="relative z-10 mx-4 max-w-lg"
            initial={{ scale: 0.5, rotate: -10, y: 50 }}
            animate={{
              scale: 1,
              rotate: 0,
              y: 0
            }}
            exit={{
              scale: 0.5,
              rotate: 10,
              y: -50,
              opacity: 0
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
          >
            <div
              className="relative bg-neo-yellow text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-xl px-8 py-6"
              style={{
                animation: 'warning-pulse 0.8s ease-in-out infinite',
                transform: 'rotate(-2deg)',
              }}
            >
              {/* Warning Icon */}
              <motion.div
                className="text-center mb-3"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 0.3,
                }}
              >
                <span className="text-6xl">⚠️</span>
              </motion.div>

              {/* Warning Text */}
              <div className="text-center">
                <h2 className="text-3xl font-black uppercase text-neo-black mb-2 tracking-wide">
                  {t('earthquake.warning') || 'Earthquake!'}
                </h2>
                <p className="text-lg font-bold text-neo-black/80">
                  {t('earthquake.brace') || 'Brace yourself!'}
                </p>
              </div>

              {/* Decorative stripes */}
              <div
                className="absolute top-0 left-0 right-0 h-2 bg-neo-black"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 5% 50%)',
                }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-2 bg-neo-black"
                style={{
                  clipPath: 'polygon(0 0, 95% 50%, 100% 100%, 0 100%)',
                }}
              />
            </div>
          </motion.div>

          {/* Particle effects - warning sparkles */}
          {distances.map((distance, i) => {
            const angle = (i * 45) * (Math.PI / 180);
            return (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-neo-yellow border-2 border-neo-black"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                initial={{
                  scale: 0,
                  opacity: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{
                  scale: [0, 1, 0.8, 0],
                  opacity: [0, 1, 0.8, 0],
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeOut',
                }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
