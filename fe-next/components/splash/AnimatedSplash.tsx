'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/utils/accessibility';

const MIN_SHOW_MS = 600;
const MAX_SHOW_MS = 3500;
const TEXT_ROTATION_MS = 1300;
const LOADING_TEXT_COUNT = 8;
const SESSION_FLAG = 'lx_splash_shown';

const BOLT_PATH = 'M14 2L4 18h7l-3 12 13-18h-8l5-10H14z';

/**
 * Full-screen branded loading splash shown once per browsing session while the
 * app boots, replacing the dead static dark screen.
 *
 * Driver note: timing is intentionally timer-based (setTimeout / setInterval),
 * NOT a requestAnimationFrame elapsed-time tick. A per-frame state update
 * re-renders this subtree 60×/sec, which repeatedly disrupts framer-motion's
 * delayed one-shot entrance animations (logo / wordmark) so they stall at their
 * `initial` state and never appear. Timers keep the entrance window
 * re-render-free; the first text swap lands at 1300ms — after the entrance has
 * finished. The bar fill is animated by framer over a duration (no state).
 *
 * Fail-safe: a hard MAX_SHOW_MS timeout always hides the splash, so it can never
 * become the stuck screen it exists to cure.
 */
export function AnimatedSplash() {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [show, setShow] = useState(false);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    // Show once per session. Decide after mount so SSR never renders the overlay.
    let alreadyShown = false;
    try {
      alreadyShown = !!sessionStorage.getItem(SESSION_FLAG);
    } catch {
      // sessionStorage unavailable (SSR / privacy mode) — fall through and show.
    }
    if (alreadyShown) return;
    setShow(true);

    const mountTime = Date.now();
    let readyTimer: ReturnType<typeof setTimeout> | undefined;

    const hide = () => {
      setShow(false);
      try {
        sessionStorage.setItem(SESSION_FLAG, 'true');
      } catch {
        // ignore — worst case the splash may show again next navigation
      }
    };

    // Hard fail-safe: always hide by MAX_SHOW_MS no matter what.
    const maxTimer = setTimeout(hide, MAX_SHOW_MS);

    // Hide on window load, but never before MIN_SHOW_MS (avoids a one-frame flash).
    const onReady = () => {
      const elapsed = Date.now() - mountTime;
      readyTimer = setTimeout(hide, Math.max(0, MIN_SHOW_MS - elapsed));
    };
    if (typeof document !== 'undefined' && document.readyState === 'complete') {
      onReady();
    } else {
      window.addEventListener('load', onReady, { once: true });
    }

    // Rotate the witty text. First fire at 1300ms — after the entrance animation.
    const textTimer = setInterval(() => {
      setTextIndex((i) => (i + 1) % LOADING_TEXT_COUNT);
    }, TEXT_ROTATION_MS);

    return () => {
      clearTimeout(maxTimer);
      if (readyTimer) clearTimeout(readyTimer);
      clearInterval(textTimer);
      window.removeEventListener('load', onReady);
    };
  }, []);

  if (!show) return null;

  const loadingText = t(`splash.loadingText${textIndex + 1}`);

  return (
    <AnimatePresence>
      <motion.div
        key="splash-overlay"
        data-testid="animated-splash"
        className="fixed inset-0 z-[9999] bg-neo-navy flex flex-col items-center justify-center overflow-hidden"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Radial glow pulse behind the logo */}
        {!prefersReducedMotion && (
          <motion.div
            aria-hidden
            className="absolute w-72 h-72 rounded-full bg-gradient-to-r from-neo-lime to-neo-cyan opacity-20 blur-3xl"
            initial={{ scale: 0.85, opacity: 0.12 }}
            animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.14, 0.26, 0.14] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Floating particles drifting upward */}
        {!prefersReducedMotion && (
          <div aria-hidden data-testid="splash-particles" className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => {
              const left = 12 + (i * 76) / 8 + (i % 2 ? 4 : -3);
              const color =
                i % 3 === 0 ? 'bg-neo-lime' : i % 3 === 1 ? 'bg-neo-cyan' : 'bg-neo-pink';
              return (
                <motion.span
                  key={`p-${i}`}
                  className={`absolute block w-2 h-2 rounded-[1px] ${color}`}
                  style={{ left: `${left}%`, bottom: '-8px' }}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: [-20, -340], opacity: [0, 0.7, 0] }}
                  transition={{
                    duration: 2.6 + (i % 4) * 0.4,
                    repeat: Infinity,
                    delay: i * 0.25,
                    ease: 'easeOut',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Logo: bolts strike in, wordmark slams in from both sides */}
        <motion.div
          className="flex items-center gap-2 mb-7 relative z-10"
          initial={prefersReducedMotion ? false : { scale: 0.4, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.05 }}
        >
          <motion.svg
            aria-hidden
            className="w-11 h-14 sm:w-14 sm:h-16 text-neo-lime-light"
            viewBox="0 0 24 32"
            fill="none"
            initial={prefersReducedMotion ? false : { scale: 0, rotate: -34 }}
            animate={{ scale: 1, rotate: -15 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.18 }}
            style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
          >
            <path d={BOLT_PATH} fill="currentColor" stroke="#1a365d" strokeWidth="2" strokeLinejoin="round" />
          </motion.svg>

          <div className="font-black uppercase tracking-tight flex items-center gap-1">
            <motion.span
              className="text-5xl sm:text-6xl text-neo-lime"
              style={{ WebkitTextStroke: '2px #1a365d', paintOrder: 'stroke fill', textShadow: '4px 4px 0px #1a365d' }}
              initial={prefersReducedMotion ? false : { x: -56, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.26 }}
            >
              {t('logo.lexi')}
            </motion.span>
            <motion.span
              className="text-4xl sm:text-5xl text-neo-cyan"
              style={{ WebkitTextStroke: '1px #1a365d', paintOrder: 'stroke fill', textShadow: '3px 3px 0px rgba(26,54,93,0.7)' }}
              initial={prefersReducedMotion ? false : { x: 56, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.32 }}
            >
              {t('logo.clash')}
            </motion.span>
          </div>

          <motion.svg
            aria-hidden
            className="w-11 h-14 sm:w-14 sm:h-16 text-neo-cyan-light"
            viewBox="0 0 24 32"
            fill="none"
            initial={prefersReducedMotion ? false : { scale: 0, rotate: 34 }}
            animate={{ scale: 1, rotate: 15 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.22 }}
            style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
          >
            <path d={BOLT_PATH} fill="currentColor" stroke="#1a365d" strokeWidth="2" strokeLinejoin="round" />
          </motion.svg>
        </motion.div>

        {/* Witty loading text */}
        <div className="h-8 flex items-center justify-center mb-10 px-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={textIndex}
              data-testid="splash-loading-text"
              className="text-base sm:text-lg text-neo-cyan-muted font-medium text-center"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
            >
              {loadingText}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Neon loading bar */}
        <div className="absolute bottom-16 sm:bottom-20 w-full flex justify-center px-4">
          <div className="relative h-4 w-64 sm:w-80 border-neo border-neo-black rounded-neo bg-neo-navy-light overflow-hidden shadow-hard">
            <motion.div
              data-testid="splash-bar-fill"
              className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,#FF1493,#FFE135,#00FFFF)] origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: prefersReducedMotion ? 0.65 : 0.95 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: MAX_SHOW_MS / 1000, ease: 'easeOut' }}
              style={{ transformOrigin: 'left' }}
            >
              {!prefersReducedMotion && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AnimatedSplash;
