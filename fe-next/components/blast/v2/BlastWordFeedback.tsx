'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import type { ValidationResult } from '@/lib/blast/v2/engine';

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
 * Two states, mutually exclusive:
 *   - `checking`: an off-theme run is being verified against the dictionary.
 *     Shown INSTEAD of the old red shake so the player isn't told "wrong!"
 *     before the verdict lands.
 *   - `bonus`: a valid word that wasn't on the level's target list. Celebrated
 *     (Wordscapes-style) so off-target discovery feels rewarded — it still
 *     counts toward coins + chest. Auto-hides after `visibleMs`.
 *
 * Theme-word matches are intentionally NOT handled here — the board's own
 * celebration FX already cover them.
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
  const lastShownKey = useRef<number | null>(null);

  // Surface a bonus word once per successful submit (keyed on eventKey), then
  // let the timer retract it.
  useEffect(() => {
    if (lastValidation?.kind !== 'bonus') return;
    if (lastShownKey.current === eventKey) return;
    lastShownKey.current = eventKey;
    setBonusWord(lastValidation.word);
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
            <div className="font-neo-display text-sm font-black leading-none text-neo-navy">
              ⭐ {t('blast.feedback.bonusWord', 'BONUS WORD!')}
            </div>
            <div className="mt-0.5 font-neo-body text-lg font-black uppercase leading-none text-neo-navy">
              {bonusWord}
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
