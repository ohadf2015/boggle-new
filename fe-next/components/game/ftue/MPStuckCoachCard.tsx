'use client';

import { X } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';

import type { StuckStage } from '../../../lib/ftue/mpStuckCoach';
import type { StuckCoachMode } from '../../../lib/ftue/stuckCoachMemory';
import { DragHintDiagram } from './DragHintDiagram';

interface MPStuckCoachCardProps {
  stage: StuckStage;
  onDismiss: () => void;
  /**
   * A word that is genuinely on this player's board. The abstract copy alone is
   * ignored by 70% of the players who see it — naming a real word turns "drag
   * across letters" into something they can actually do right now.
   */
  exampleWord?: string | null;
  /** Wheel modes are spelled by tapping or swiping around a center letter. */
  mode?: StuckCoachMode;
}

// Each stage maps to copy that matches its specific confusion — never generic.
const COPY: Record<Exclude<StuckStage, 'none'>, { key: string; fallback: string }> = {
  'idle-nudge': {
    key: 'mpCoach.idleNudge',
    fallback: 'Drag across letters to spell a word',
  },
  'tap-hint': {
    key: 'mpCoach.tapHint',
    fallback: 'Hold and drag across letters, then lift to submit',
  },
  'submit-hint': {
    key: 'mpCoach.submitHint',
    fallback: 'Lift your finger off the last letter to submit the word',
  },
  'validity-hint': {
    key: 'mpCoach.validityHint',
    fallback: 'Letters must connect. Spell a real word — 2 letters or more',
  },
  // The escalation card says only "Try: WORD" next to the traced word: it must fit under a phone board.
  example: {
    key: 'mpCoach.idleNudge',
    fallback: 'Drag across letters to spell a word',
  },
};

const WHEEL_NUDGE = {
  key: 'mpCoach.wheelNudge',
  fallback: 'Tap or swipe letters to spell a word. Every word uses the center letter',
};
const isWheel = (mode?: StuckCoachMode) => mode === 'wheelRush' || mode === 'dailyWheel';

/**
 * The single visible surface of the stuck-player coach, in every word mode. Neo-brutalist card
 * with a stage-matched message, the wordless drag diagram, and a dismiss button.
 * Renders nothing when there is no active hint.
 */
export function MPStuckCoachCard({ stage, onDismiss, exampleWord, mode }: MPStuckCoachCardProps) {
  const { t } = useLanguage();
  if (stage === 'none') return null;

  const copy = isWheel(mode) && stage === 'idle-nudge' ? WHEEL_NUDGE : COPY[stage];
  const showExample = !!exampleWord && stage === 'example';

  return (
    <div
      data-testid="mp-stuck-coach-card"
      role="status"
      aria-live="polite"
      className="animate-neo-pop pointer-events-auto mx-auto flex w-full max-w-sm items-center gap-3 rounded-neo border-neo-thick border-neo-black bg-neo-cream px-3 py-2 text-neo-black shadow-hard-lg"
    >
      <DragHintDiagram word={showExample ? exampleWord : null} />
      <div className="flex-1">
        {!showExample && <p className="font-neo-body text-sm leading-snug">{t(copy.key, copy.fallback)}</p>}
        {showExample && (
          <p className="font-neo-display text-base font-black leading-snug">
            {t('mpCoach.tryWord', 'Try: {word}', {
              // solve-grid returns Hebrew words sofit-folded (גרמ); the caption
              // must read as a real word (גרם). No-op for other scripts.
              word: applyHebrewFinalLetters(exampleWord!).toUpperCase(),
            })}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('mpCoach.dismiss', 'Got it')}
        className="shrink-0 rounded-neo border-neo border-neo-black bg-neo-lime p-1 text-neo-black active:animate-neo-press"
      >
        <X size={16} strokeWidth={3} />
      </button>
    </div>
  );
}
