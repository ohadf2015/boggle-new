'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import type { ValidationResult } from '@/lib/blast/v2/engine';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { BlastIcon } from './BlastIcon';

type Props = {
  /** True while an off-theme word is awaiting the async dictionary verdict. */
  dictCheckPending: boolean;
  /** Latest validation outcome from the engine. */
  lastValidation: ValidationResult | null;
  /** Bumps on every successful submit — used to re-trigger the bonus pill. */
  eventKey: number;
  modeColor: string;
  t: (key: string, fallback?: string) => string;
  /** How long the celebratory bonus pill stays up before fading. */
  visibleMs?: number;
};

const DEFAULT_VISIBLE_MS = 1600;

/**
 * Transient feedback for free-form word play in Blast V2.
 *
 * Three states, mutually exclusive:
 *   - `checking`: an off-theme run is being verified against the dictionary.
 *     Shown INSTEAD of the old red shake so the player isn't told "wrong!"
 *     before the verdict lands.
 *   - `target`: a THEME word (one of the level's goal words) was found. This is
 *     the actual objective, so it gets the loudest, most affirming toast —
 *     "TARGET!" + the word. Previously theme words got NO toast while bonus
 *     words did, which read backwards (the off-goal word felt more rewarded
 *     than the goal word). Auto-hides after `visibleMs`.
 *   - `bonus`: a valid word that wasn't on the level's target list. Celebrated
 *     (Wordscapes-style) so off-target discovery feels rewarded — it still
 *     counts toward coins + chest. Auto-hides after `visibleMs`.
 */
export function BlastWordFeedback({
  dictCheckPending,
  lastValidation,
  eventKey,
  modeColor,
  t,
  visibleMs = DEFAULT_VISIBLE_MS,
}: Props) {
  const [bonusWord, setBonusWord] = useState<string | null>(null);
  const [targetWord, setTargetWord] = useState<string | null>(null);
  const lastShownKey = useRef<number | null>(null);

  // Surface a found word once per successful submit (keyed on eventKey), then
  // let the timer retract it. A theme match shows the loud TARGET toast; a
  // bonus shows the bonus pill. Both share the one-per-eventKey guard so a
  // re-render can't double-fire, and both clear the other so a fast
  // theme→bonus sequence never stacks two toasts.
  useEffect(() => {
    if (lastValidation?.kind !== 'theme_match' && lastValidation?.kind !== 'bonus') return;
    if (lastShownKey.current === eventKey) return;
    lastShownKey.current = eventKey;
    if (lastValidation.kind === 'theme_match') {
      setTargetWord(lastValidation.word);
      setBonusWord(null);
      const handle = setTimeout(() => setTargetWord(null), visibleMs);
      return () => clearTimeout(handle);
    }
    setBonusWord(lastValidation.word);
    setTargetWord(null);
    const handle = setTimeout(() => setBonusWord(null), visibleMs);
    return () => clearTimeout(handle);
  }, [lastValidation, eventKey, visibleMs]);

  if (dictCheckPending) {
    return (
      <div
        data-testid="blast-feedback-checking"
        className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2"
      >
        <span
          className="inline-flex items-center gap-1.5 rounded-neo border-neo px-3 py-1.5 font-neo-body text-sm font-bold text-neo-white"
          style={{ borderColor: modeColor, background: '#16213e' }}
        >
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full"
            style={{ background: modeColor }}
          />
          {t('blast.feedback.checking', 'Checking…')}
        </span>
      </div>
    );
  }

  if (targetWord) {
    return (
      <AnimatePresence>
        <m.div
          key={`target-${eventKey}-${targetWord}`}
          data-testid="blast-feedback-target"
          className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 text-center"
          initial={{ opacity: 0, y: -10, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 480, damping: 22 }}
        >
          <div
            className="rounded-neo border-neo-thick px-4 py-2 shadow-hard"
            style={{ borderColor: '#0b1530', background: modeColor }}
          >
            <div className="font-neo-display text-sm font-black uppercase leading-none tracking-[0.18em] text-neo-navy flex items-center justify-center gap-1">
              <BlastIcon src="/blast/icons/target.svg" size={20} />
              {t('blast.feedback.target', 'TARGET!')}
            </div>
            <div className="mt-1 font-neo-display text-2xl font-black uppercase leading-none text-neo-navy">
              {applyHebrewFinalLetters(targetWord)}
            </div>
          </div>
        </m.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {bonusWord && (
        <m.div
          key={`${eventKey}-${bonusWord}`}
          data-testid="blast-feedback-bonus"
          className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 text-center"
          initial={{ opacity: 0, y: -8, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        >
          <div
            className="rounded-neo border-neo-thick px-3 py-1.5 shadow-hard"
            style={{ borderColor: modeColor, background: modeColor }}
          >
            <div className="font-neo-display text-sm font-black leading-none text-neo-navy flex items-center justify-center gap-1">
              <BlastIcon src="/blast/icons/star.svg" size={20} />
              {t('blast.feedback.bonusWord', 'BONUS WORD!')}
            </div>
            <div className="mt-0.5 font-neo-body text-lg font-black uppercase leading-none text-neo-navy">
              {applyHebrewFinalLetters(bonusWord)}
            </div>
          </div>
          <div className="mt-1 font-neo-body text-[0.7rem] font-semibold text-neo-white">
            {t('blast.feedback.bonusHint', 'Not on the list — still counts!')}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
