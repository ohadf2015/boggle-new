'use client';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export type FtueStep = 1 | 2 | 3 | 4 | 5 | 6 | null;

type Props = {
  onComplete: () => void;
  isVeteran?: boolean;
  step?: FtueStep;
};

const MESSAGES: Record<Exclude<FtueStep, null>, { key: string; fallback: string }> = {
  1: { key: 'blast.tutorial.ftue.step1', fallback: 'Drag across letters to spell a word' },
  2: { key: 'blast.tutorial.ftue.step2', fallback: 'Nice — keep going!' },
  3: { key: 'blast.tutorial.ftue.step3', fallback: 'Letters above fall to fill the space' },
  4: { key: 'blast.tutorial.ftue.step4', fallback: 'Find more words to fill the chest bar' },
  5: { key: 'blast.tutorial.ftue.step5', fallback: 'Or tap each letter, double-tap to confirm' },
  6: { key: 'blast.tutorial.ftue.step6', fallback: 'Level 1 complete! Watch your chest bar →' },
};

// Steps where the animated finger should appear pointing at the board.
const FINGER_STEPS: Set<Exclude<FtueStep, null>> = new Set([1, 2]);
// Steps that benefit from a dim scrim around the bubble.
const SCRIM_STEPS: Set<Exclude<FtueStep, null>> = new Set([1, 2, 5, 6]);

export function BlastFtueOverlay({ onComplete, isVeteran, step = 1 }: Props) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  if (isVeteran) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
      >
        <m.div
          className="bg-[#0b1530] border-neo-thick border-black rounded-neo p-6 max-w-sm text-center text-white space-y-4"
          initial={{ scale: reducedMotion === true ? 1 : 0.9 }}
          animate={{ scale: 1 }}
        >
          <div className="text-2xl font-bold">
            {t('blast.tutorial.veteran.title', 'Welcome back!')}
          </div>
          <p className="text-sm">
            {t('blast.tutorial.veteran.body', 'Blast has been redesigned. Enjoy the new levels!')}
          </p>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-neo-pink border-neo-thick border-black rounded-neo font-bold"
          >
            {t('blast.tutorial.veteran.cta', "Let's go")}
          </button>
        </m.div>
      </m.div>
    );
  }

  if (step === null) return null;
  const msg = MESSAGES[step];
  const showScrim = SCRIM_STEPS.has(step) && reducedMotion !== true;
  const showFinger = FINGER_STEPS.has(step) && reducedMotion !== true;

  // Full-screen wrapper stays pointer-events-none so taps reach the board.
  // Only the bubble (and step-6 button) claim pointer events.
  return (
    <div
      data-testid="blast-ftue-spotlight"
      className="fixed inset-0 z-40 pointer-events-none"
    >
      {/* Soft vignette scrim. Radial gradient leaves the board bright while
          fading edges. Pointer-events still off so play continues. */}
      {showScrim && (
        <m.div
          aria-hidden
          data-testid="blast-ftue-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% 60%, transparent 0%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      )}

      {/* Animated finger swiping right-then-left, hinting at drag motion. */}
      {showFinger && <AnimatedFinger key={`finger-step-${step}`} />}

      <div className="absolute inset-x-0 top-0 flex justify-center">
        <AnimatePresence mode="wait">
          <m.div
            key={`ftue-step-${step}`}
            initial={{ y: -20, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              ...(reducedMotion === true ? {} : { scale: [1, 1.04, 1] }),
            }}
            exit={{ y: -20, opacity: 0 }}
            transition={{
              duration: reducedMotion === true ? 0 : 0.25,
              scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="pointer-events-auto mt-4 mx-4 max-w-md bg-[#0b1530] border-neo-thick border-black rounded-neo px-5 py-3 text-center text-white shadow-hard"
          >
            <div className="text-sm font-bold" data-step={step}>
              {t(msg.key, msg.fallback)}
            </div>
            {step === 6 && (
              <button
                onClick={onComplete}
                className="mt-3 px-4 py-2 bg-neo-pink border-neo-thick border-black rounded-neo text-sm font-bold"
              >
                {t('blast.tutorial.ftue.step6Cta', 'Continue')}
              </button>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Cartoon finger pointing UP that drifts horizontally across the bottom-third
// of the screen, miming a "swipe across letters" gesture. Pixel-art friendly
// neo-brutalist stroke, no blur or gradient.
function AnimatedFinger() {
  return (
    <m.svg
      data-testid="blast-ftue-finger"
      aria-hidden
      width="56"
      height="64"
      viewBox="0 0 56 64"
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none drop-shadow-[2px_2px_0_#000]"
      style={{ bottom: '28%' }}
      initial={{ x: -90, opacity: 0 }}
      animate={{
        x: [-90, 90, -90],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        ease: 'easeInOut',
        times: [0, 0.15, 0.85, 1],
      }}
    >
      {/* Wrist */}
      <rect x="14" y="32" width="28" height="28" rx="6" fill="#FFE135" stroke="#000" strokeWidth="3" />
      {/* Finger */}
      <rect x="22" y="6" width="12" height="32" rx="6" fill="#FFE135" stroke="#000" strokeWidth="3" />
      {/* Nail highlight */}
      <rect x="25" y="9" width="6" height="4" rx="2" fill="#FFFFFF" />
    </m.svg>
  );
}
