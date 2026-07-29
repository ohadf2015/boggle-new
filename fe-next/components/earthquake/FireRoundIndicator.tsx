'use client';

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDisableFireRoundLights, useShouldReduceMotion } from '@/contexts/AccessibilityContext';

interface FireRoundIndicatorProps {
  isActive: boolean;
  remainingSeconds: number;
}

/**
 * FireRoundIndicator - Shows fire round status with countdown
 *
 * Displays a pulsing badge with:
 * - Fire emoji decoration
 * - "FIRE ROUND - 2× POINTS" text
 * - Countdown timer
 * - Responsive positioning (adapts for mobile landscape)
 */
export const FireRoundIndicator: React.FC<FireRoundIndicatorProps> = ({
  isActive,
  remainingSeconds,
}) => {
  const { t } = useLanguage();
  const disableFireLights = useDisableFireRoundLights();
  const reduceMotion = useShouldReduceMotion();

  if (disableFireLights || reduceMotion) {
    if (!isActive) return null;
    return (
      <div className="fixed z-50" style={{ top: 'calc(5rem + var(--cap-safe-area-top, env(safe-area-inset-top, 0px)))' }} role="status" aria-live="polite" aria-label={`${t('earthquake.fireRound')} - ${remainingSeconds}s`}>
        <div className="relative bg-linear-to-r from-neo-pink to-neo-red border-4 border-neo-black rounded-neo-lg px-4 py-2 shadow-hard-lg ltr:right-4 rtl:left-4">
          <div className="relative z-10 flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-wide text-neo-white leading-none">{t('earthquake.fireRound')}</span>
              <span className="text-xs font-bold text-neo-lime leading-none mt-0.5">{t('earthquake.multiplier')}</span>
              <span className="max-w-[11rem] text-[10px] font-semibold text-neo-white leading-tight mt-1">{t('earthquake.effect')}</span>
            </div>
            <div className="ms-2 bg-neo-black/20 text-white rounded-neo px-2 py-1 border-2 border-neo-black/40">
              <span className="text-xl font-black text-neo-white tabular-nums">{remainingSeconds}s</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine position based on layout
  // Position below header to avoid overlapping with header controls
  // Use logical 'end' property for RTL support (flips to left in Hebrew)
  const positionClasses = 'top-24 sm:top-28 ltr:right-4 rtl:left-4';

  return (
    <AnimatePresence>
      {isActive && (
        <m.div
          className={`fixed z-50 ${positionClasses}`}
          initial={{ scale: 0, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: -20 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
        >
          {/* Fire Round Badge */}
          <div
            className="relative bg-linear-to-r from-neo-pink to-neo-red border-4 border-neo-black rounded-neo-lg px-4 py-2 shadow-hard-lg"
            style={{
              animation: 'fire-badge-pulse 1.5s ease-in-out infinite',
            }}
          >
            {/* Flame background decoration */}
            <div className="absolute inset-0 overflow-hidden rounded-neo opacity-20 pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <m.div
                  key={`flame-${i}`}
                  className="absolute bottom-0 w-8 h-12 bg-neo-lime"
                  style={{
                    left: `${20 + i * 30}%`,
                    clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                  }}
                  animate={{
                    scaleY: [1, 1.2, 0.9, 1],
                    scaleX: [1, 0.9, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>

            {/* Content */}
            <div className="relative z-10 flex items-center gap-2">
              {/* Fire emoji */}
              <m.span
                className="text-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{
                  type: 'tween',
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                🔥
              </m.span>

              {/* Text */}
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-wide text-neo-white leading-none">
                  {t('earthquake.fireRound')}
                </span>
                <span className="text-xs font-bold text-neo-lime leading-none mt-0.5">
                  {t('earthquake.multiplier')}
                </span>
                <span className="max-w-[11rem] text-[10px] font-semibold text-neo-white leading-tight mt-1">
                  {t('earthquake.effect')}
                </span>
              </div>

              {/* Countdown */}
              <div className="ms-2 bg-neo-black/20 text-white rounded-neo px-2 py-1 border-2 border-neo-black/40">
                <m.span
                  key={remainingSeconds}
                  className="text-xl font-black text-neo-white tabular-nums"
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  {remainingSeconds}s
                </m.span>
              </div>
            </div>

            {/* Sparkle effects */}
            {remainingSeconds > 0 && remainingSeconds <= 5 && (
              <>
                {[...Array(4)].map((_, i) => {
                  const angle = (i * 90 + 45) * (Math.PI / 180);
                  const distance = 40;
                  return (
                    <m.div
                      key={`sparkle-${i}`}
                      className="absolute w-2 h-2 rounded-full bg-neo-lime border border-neo-black"
                      style={{
                        left: '50%',
                        top: '50%',
                      }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                        x: [0, Math.cos(angle) * distance],
                        y: [0, Math.sin(angle) * distance],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeOut',
                      }}
                    />
                  );
                })}
              </>
            )}
          </div>

          {/* Urgency indicator for last 5 seconds */}
          {remainingSeconds > 0 && remainingSeconds <= 5 && (
            <m.div
              className="absolute -inset-1 border-2 border-neo-lime rounded-neo-lg pointer-events-none"
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [0.98, 1.02, 0.98],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
};
