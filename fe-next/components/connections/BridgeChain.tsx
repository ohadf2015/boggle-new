'use client';

import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { ConnectionPuzzle } from '@/lib/connections/types';

interface BridgeChainProps {
  puzzle: ConnectionPuzzle;
  isCorrect: boolean;
  isGaveUp: boolean;
  bridgeRevealed: boolean;
  bufferDisplay: string;
  isRTL: boolean;
}

const CARD_SPRING = { type: 'spring' as const, stiffness: 320, damping: 26 };

const WORD_CHIP_VARIANTS = {
  initial: { opacity: 0, scale: 0.75, y: 10 },
  animate: (delay: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20, delay },
  }),
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.12 } },
};

/**
 * The word-bridge-word chain visualization.
 *
 * Displays: word1 + [bridge box] + word2
 * The bridge box is the focal point showing either ? (playing) or the bridge answer (revealed).
 * On solve, a hard beam draws across connecting all three elements.
 *
 * Uses container queries (inline-size) so the chain scales responsively on mobile.
 * Respects prefers-reduced-motion for animations.
 */
export function BridgeChain({
  puzzle,
  isCorrect,
  isGaveUp,
  bridgeRevealed,
  bufferDisplay,
  isRTL,
}: BridgeChainProps) {
  const reducedMotion = useReducedMotion();

  // On reveal (correct or gave-up) the slots settle on the actual bridge.
  const slotsValue = bridgeRevealed ? puzzle.bridge.replace(/[^\p{L}\p{N}]/gu, '') : bufferDisplay;

  return (
    <AnimatePresence mode="wait">
      <div
        key={`chain-${puzzle.id}`}
        className="relative flex flex-nowrap items-center justify-center gap-1.5 mb-4"
        style={{ containerType: 'inline-size' }}
      >
        {/* The "bridge built" moment: a hard beam draws across the chain on reveal. */}
        {bridgeRevealed && (
          <m.div
            data-testid="bridge-connector"
            aria-hidden="true"
            initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
            }
            className={[
              'absolute inset-x-1 top-1/2 -z-10 h-2 -translate-y-1/2 rounded-full border border-black',
              'origin-left rtl:origin-right',
              isCorrect ? 'bg-neo-lime' : 'bg-neo-red/70',
            ].join(' ')}
          />
        )}

        <m.span
          custom={0}
          variants={WORD_CHIP_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          className="font-neo-display text-[clamp(0.8rem,5.2cqi,1.5rem)] leading-tight text-neo-white font-bold tracking-wide px-2 py-1 rounded-neo border border-neo-white/20 bg-neo-navy shadow-hard-sm whitespace-nowrap"
        >
          {puzzle.word1}
        </m.span>

        <m.span
          custom={0.06}
          variants={WORD_CHIP_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          className="text-neo-white text-[clamp(0.7rem,3.2cqi,1.25rem)] font-mono select-none shrink-0"
        >
          +
        </m.span>

        <m.div
          custom={0.12}
          variants={WORD_CHIP_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          className={[
            'min-w-[clamp(2.25rem,14cqi,3.5rem)] h-10 px-2 rounded-neo border-2 flex shrink-0 items-center justify-center',
            'font-neo-display font-bold text-[clamp(0.8rem,4.6cqi,1.125rem)] transition-all duration-300',
            isCorrect
              ? 'border-neo-lime bg-neo-lime/20 text-neo-lime'
              : isGaveUp
              ? 'border-neo-red bg-neo-red/20 text-neo-red'
              : 'border-neo-purple/70 bg-neo-purple/10 text-neo-purple',
          ].join(' ')}
        >
          {bridgeRevealed ? (
            <m.span
              initial={reducedMotion ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: 'spring' as const, stiffness: 400, damping: 14 }
              }
            >
              {puzzle.bridge}
            </m.span>
          ) : (
            <m.span
              animate={
                reducedMotion ? { opacity: 1 } : { opacity: [0.5, 1, 0.5] }
              }
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              ?
            </m.span>
          )}
        </m.div>

        <m.span
          custom={0.18}
          variants={WORD_CHIP_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          className="text-neo-white text-[clamp(0.7rem,3.2cqi,1.25rem)] font-mono select-none shrink-0"
        >
          +
        </m.span>

        <m.span
          custom={0.24}
          variants={WORD_CHIP_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          className="font-neo-display text-[clamp(0.8rem,5.2cqi,1.5rem)] leading-tight text-neo-white font-bold tracking-wide px-2 py-1 rounded-neo border border-neo-white/20 bg-neo-navy shadow-hard-sm whitespace-nowrap"
        >
          {puzzle.word2}
        </m.span>
      </div>
    </AnimatePresence>
  );
}
