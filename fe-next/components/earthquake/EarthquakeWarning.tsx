'use client';

import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDisableEarthquakeEffects, useShouldReduceMotion } from '@/contexts/AccessibilityContext';

interface EarthquakeWarningProps {
  isVisible: boolean;
}

/**
 * EarthquakeWarning - Full-screen warning overlay before earthquake
 *
 * Shows a bold Neo-Brutalist warning card 2 seconds before earthquake hits.
 * Includes pulsing animation, screen reader announcement, and dramatic styling.
 *
 * On the user's FIRST earthquake, also shows an effects preference prompt
 * allowing them to disable animations before experiencing them.
 */
export const EarthquakeWarning: React.FC<EarthquakeWarningProps> = ({ isVisible }) => {
  const { t } = useLanguage();
  const disableEarthquake = useDisableEarthquakeEffects();
  const reduceMotion = useShouldReduceMotion();

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
      announcement.textContent = t('earthquake.warning');
      document.body.appendChild(announcement);

      // Clean up
      return () => {
        document.body.removeChild(announcement);
      };
    }
    return undefined;
  }, [isVisible, t]);

  if (disableEarthquake || reduceMotion) {
    if (!isVisible) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" role="alert" aria-live="assertive">
        <div className="absolute inset-0 bg-neo-black/40" />
        <div className="relative z-10 mx-4 max-w-lg bg-neo-red text-neo-white border-4 border-neo-black rounded-neo-lg shadow-hard-xl px-8 py-6">
          <div className="text-center mb-3"><span className="text-6xl">⚠️</span></div>
          <div className="text-center">
            <h2 className="text-3xl font-black uppercase text-neo-white mb-2 tracking-wide">{t('earthquake.warning')}</h2>
            <p className="text-lg font-bold text-neo-white">{t('earthquake.brace')}</p>
            <p className="mt-2 text-sm font-bold text-neo-white leading-snug border-t-2 border-neo-cream/30 pt-2">{t('earthquake.effect')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <m.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Semi-transparent backdrop */}
            <m.div
              className="absolute inset-0 bg-neo-black/40 text-white backdrop-blur-xs pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

          {/* Warning Card */}
          <m.div
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
              className="relative bg-neo-red text-neo-white border-4 border-neo-black rounded-neo-lg shadow-hard-xl px-8 py-6"
              style={{
                animation: 'warning-pulse 0.8s ease-in-out infinite',
                transform: 'rotate(-2deg)',
              }}
            >
              {/* Warning Icon */}
              <m.div
                className="text-center mb-3"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{
                  type: 'tween',
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 0.3,
                }}
              >
                <span className="text-6xl">⚠️</span>
              </m.div>

              {/* Warning Text */}
              <div className="text-center">
                <h2 className="text-3xl font-black uppercase text-neo-white mb-2 tracking-wide">
                  {t('earthquake.warning')}
                </h2>
                <p className="text-lg font-bold text-neo-white">
                  {t('earthquake.brace')}
                </p>
                <p className="mt-2 text-sm font-bold text-neo-white leading-snug border-t-2 border-neo-cream/30 pt-2">
                  {t('earthquake.effect')}
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
          </m.div>

          {/* Particle effects - warning sparkles */}
          {distances.map((distance, i) => {
            const angle = (i * 45) * (Math.PI / 180);
            return (
              <m.div
                key={`particle-${i}-${distance}`}
                className="absolute w-3 h-3 rounded-full bg-neo-red border-2 border-neo-black"
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

        </m.div>
      )}
    </AnimatePresence>
    </>
  );
};
