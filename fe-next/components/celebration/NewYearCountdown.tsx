'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Sparkles, PartyPopper } from 'lucide-react';
import { Dialog, DialogContent, DialogBody, DialogTitle } from '../ui/dialog';
import { Reveal } from '../ui/Reveal';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNewYearDetection, formatTimeRemaining } from '../../hooks/useNewYearDetection';
import { triggerHaptic } from '../../utils/hapticFeedback';
import NewYearFireworks from './NewYearFireworks';

interface NewYearCountdownProps {
  /** Whether the countdown feature is enabled (default: true) */
  enabled?: boolean;
}

/**
 * New Year's Eve Countdown & Celebration Component
 *
 * Automatically shows:
 * 1. Pre-countdown notification (11:55 PM)
 * 2. Final countdown modal (11:59:50 PM - last 10 seconds)
 * 3. Celebration explosion at midnight
 * 4. Happy New Year message with fireworks
 *
 * All times calculated in player's local timezone.
 */
function isWithinNewYearWindow(): boolean {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  return (month === 11 && day >= 29) || (month === 0 && day <= 2);
}

export default function NewYearCountdown(props: NewYearCountdownProps) {
  const { enabled = true } = props;
  if (!enabled || !isWithinNewYearWindow()) return null;
  return <NewYearCountdownInner {...props} />;
}

function NewYearCountdownInner({ enabled = true }: NewYearCountdownProps) {
  const { t } = useLanguage();
  const newYearState = useNewYearDetection({ enabled });

  const [showPreNotification, setShowPreNotification] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasShownCountdown, setHasShownCountdown] = useState(false);
  const [hasShownCelebration, setHasShownCelebration] = useState(false);

  // Show pre-notification at 11:55 PM (5 minutes before)
  useEffect(() => {
    if (!enabled) return;

    if (newYearState.isCountdownTime && newYearState.secondsUntilMidnight > 60 && newYearState.secondsUntilMidnight <= 300) {
      if (!showPreNotification && !hasShownCountdown) {
        setShowPreNotification(true);
        triggerHaptic('medium');
      }
    }
  }, [enabled, newYearState.isCountdownTime, newYearState.secondsUntilMidnight, showPreNotification, hasShownCountdown]);

  // Show countdown modal in last 10 seconds
  useEffect(() => {
    if (!enabled) return;

    if (newYearState.isCountdownTime && newYearState.secondsUntilMidnight <= 10 && newYearState.secondsUntilMidnight > 0) {
      if (!showCountdown && !hasShownCountdown) {
        setShowCountdown(true);
        setShowPreNotification(false);
        setHasShownCountdown(true);
        triggerHaptic('success');
      }
    }

    // Trigger celebration at midnight
    if (newYearState.secondsUntilMidnight === 0 && showCountdown) {
      setShowCountdown(false);
      setShowCelebration(true);
      setHasShownCelebration(true);
      triggerHaptic('success');
    }
  }, [enabled, newYearState.isCountdownTime, newYearState.secondsUntilMidnight, showCountdown, hasShownCountdown]);

  // Show celebration if we're in celebration time and haven't shown it yet
  useEffect(() => {
    if (!enabled) return;

    if (newYearState.isCelebrationTime && !hasShownCelebration) {
      setShowCelebration(true);
      setHasShownCelebration(true);
      triggerHaptic('success');
    }
  }, [enabled, newYearState.isCelebrationTime, hasShownCelebration]);

  // Auto-close celebration after 10 seconds
  useEffect(() => {
    if (!showCelebration) return undefined;

    const timer = setTimeout(() => {
      setShowCelebration(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [showCelebration]);

  // Reset state when New Year's Day ends
  useEffect(() => {
    if (!newYearState.isNewYearsDay && !newYearState.isNewYearsEve) {
      setHasShownCountdown(false);
      setHasShownCelebration(false);
      setShowPreNotification(false);
      setShowCountdown(false);
      setShowCelebration(false);
    }
  }, [newYearState.isNewYearsDay, newYearState.isNewYearsEve]);

  return (
    <>
      {/* Pre-notification toast */}
      <AnimatePresence>
        {showPreNotification && (
          <m.div
            className="fixed top-4 right-4 z-9998 max-w-xs"
            initial={{ opacity: 0, x: 100, rotate: 3 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: 100, rotate: -3 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <div className="bg-neo-pink text-neo-white border-3 border-neo-black rounded-neo-lg shadow-hard-lg p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-black text-sm uppercase">
                    {t('newYear.comingSoon')}
                  </p>
                  <p className="text-xs font-medium opacity-90">
                    {formatTimeRemaining(newYearState.secondsUntilMidnight)}
                  </p>
                </div>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Countdown Modal */}
      <Dialog open={showCountdown} onOpenChange={(open) => { if (!open) setShowCountdown(false); }}>
        <DialogContent noDescription className="max-w-md">
          <DialogTitle className="sr-only">
            {t('newYear.countdownTitle')}
          </DialogTitle>
          <DialogBody className="text-center py-8">
            <Reveal noSlide className="flex flex-col items-center gap-6">
              <Sparkles className="w-16 h-16 text-neo-lime" />

              <div>
                <h2 className="text-2xl font-black uppercase mb-2 text-neo-black">
                  {t('newYear.countdownTitle')}
                </h2>
                <p className="text-sm font-medium text-neo-black/70">
                  {t('newYear.countdownSubtitle')}
                </p>
              </div>

              {/* Countdown number — keyed CSS zoom replays each second; CSS keeps
                  the big number visible even if the JS loop is starved. */}
              <div
                key={newYearState.secondsUntilMidnight}
                className="relative animate-in zoom-in-50 duration-300"
              >
                <div
                  className="text-9xl font-black text-neo-pink border-8 border-neo-black rounded-neo-xl shadow-hard-2xl bg-neo-lime w-48 h-48 flex items-center justify-center"
                  style={{
                    textShadow: '4px 4px 0px rgb(0, 0, 0)',
                  }}
                >
                  {newYearState.secondsUntilMidnight}
                </div>
              </div>

              <p className="text-lg font-bold text-neo-black uppercase">
                {t('newYear.almostThere')}
              </p>
            </Reveal>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Celebration Modal with Fireworks */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent noDescription className="max-w-2xl overflow-hidden">
          <DialogTitle className="sr-only">
            {t('newYear.happyNewYear')}
          </DialogTitle>
          <DialogBody className="text-center py-12 relative">
            <Reveal noSlide className="flex flex-col items-center gap-8">
              <PartyPopper className="w-20 h-20 text-neo-pink animate-neo-wobble" />

              {/* Happy New Year text */}
              <div className="relative">
                <m.h1
                  className="text-6xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, var(--neo-lime) 0%, var(--neo-red) 25%, var(--neo-pink) 50%, var(--neo-pink) 75%, var(--neo-cyan) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '6px 6px 0px rgb(0, 0, 0)',
                    filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))',
                  }}
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {t('newYear.happyNewYear')}
                </m.h1>

                {/* Year badge */}
                <Reveal
                  noSlide
                  className="mt-6 inline-block bg-neo-cyan text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-lg px-8 py-3"
                >
                  <span className="text-5xl font-black">{newYearState.celebrationYear}</span>
                </Reveal>
              </div>

              <p className="text-xl font-bold text-neo-black uppercase max-w-md animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
                {t('newYear.celebrationMessage')}
              </p>

              {/* Confetti emoji decorations */}
              <div className="flex gap-4 text-4xl">
                {['🎉', '✨', '🎊', '🥳', '🎆'].map((emoji, i) => (
                  <m.span
                    key={emoji}
                    initial={{ opacity: 0, y: 20, rotate: 0 }}
                    animate={{
                      opacity: 1,
                      y: [0, -10, 0],
                      rotate: [-10, 10, -10],
                    }}
                    transition={{
                      delay: 0.6 + i * 0.1,
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    {emoji}
                  </m.span>
                ))}
              </div>
            </Reveal>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Fireworks overlay */}
      <NewYearFireworks active={showCelebration} count={12} duration={8000} />
    </>
  );
}
