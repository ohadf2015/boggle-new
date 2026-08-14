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
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/75 z-50 animate-in fade-in-0 duration-300"
      >
        <div
          className="bg-[#0b1530] border-neo-thick border-black rounded-neo p-6 max-w-sm text-center text-white space-y-4 animate-in fade-in-0 zoom-in-95 duration-300"
        >
          <div className="text-2xl font-bold">
            {t('blast.tutorial.veteran.title', 'Welcome back!')}
          </div>
          <p className="text-sm">
            {t('blast.tutorial.veteran.body', 'Blast has been redesigned. Enjoy the new levels!')}
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="px-6 py-3 bg-neo-pink border-neo-thick border-black rounded-neo font-bold"
          >
            {t('blast.tutorial.veteran.cta', "Let's go")}
          </button>
        </div>
      </div>
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
        <div
          aria-hidden
          data-testid="blast-ftue-scrim"
          className="absolute inset-0 animate-in fade-in-0 duration-300"
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
            initial={{ y: -20 }}
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
                type="button"
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

// Stylised pointing glove drifting across the board to mime a "swipe" gesture.
// Deliberately NOT anatomical: the previous version stacked skin-toned rects and
// ellipses behind a blue sleeve, which put two colours on screen that exist
// nowhere else in the palette and left visible seams where the primitives
// overlapped — at board scale it read as a lumpy mitten with a floating finger.
// This is one closed path (no seams) in cream on the standard 3px ink outline,
// like a cartoon glove, and it is small enough that the fist no longer covers
// the tile the fingertip is pointing at. A pulsing lime ring marks the target.
function AnimatedFinger() {
  return (
    <m.div
      data-testid="blast-ftue-finger"
      aria-hidden
      className="absolute left-1/2 pointer-events-none"
      style={{ bottom: '28%', marginLeft: -32 }}
      initial={{ x: -90, opacity: 0 }}
      animate={{
        x: [-90, 90, -90],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        ease: 'easeInOut',
        // Per-value `times`: a single top-level one is applied to every keyframe
        // array, and x has 3 stops to opacity's 4. Padding x would turn the even
        // glide into a dart-and-hold, so each value keeps its own timing.
        // duration/repeat/ease are RESTATED, not inherited: motion-dom's
        // getValueTransition only merges the parent transition when the sub-object
        // sets `inherit`, so omitting them here would silently drop the infinite
        // loop and fall back to the default duration.
        x: { duration: 2.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 1] },
        opacity: {
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.15, 0.85, 1],
        },
      }}
    >
      <svg
        width="44"
        height="66"
        viewBox="0 0 48 72"
        className="drop-shadow-[3px_3px_0_#0b1530]"
      >
        {/* Pulsing touch ring around the fingertip, marking the tap target. */}
        <m.circle
          cx="24"
          cy="15"
          r={7}
          fill="none"
          stroke="#BFFF00"
          strokeWidth="2.5"
          initial={{ opacity: 0.95 }}
          animate={{ r: [6, 11, 6], opacity: [0.95, 0.2, 0.95] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* The glove as ONE closed silhouette: extended index finger, curled
            fist, thumb lobe on the left. Single path on purpose — the previous
            version stacked separate rects/ellipses and the overlaps showed. */}
        <path
          d="M19 21 A5 5 0 0 1 29 21 L29 34 C35.5 34 42 37.5 42 45 L42 56
             A9 9 0 0 1 33 65 L17 65 A11 11 0 0 1 6 54 L6 51
             C1.5 50 0.5 44 4 41.5 C6 40 8 40.5 8.8 42
             C9.5 37.8 13.5 34 19 34 Z"
          fill="#FFFEF0"
          stroke="#0b1530"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    </m.div>
  );
}
