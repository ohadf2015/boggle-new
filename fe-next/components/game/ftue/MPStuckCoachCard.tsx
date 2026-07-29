'use client';

import { X } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';

import type { StuckStage } from '../../../lib/ftue/mpStuckCoach';
import { DragHintDiagram } from './DragHintDiagram';

interface MPStuckCoachCardProps {
  stage: StuckStage;
  onDismiss: () => void;
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
};

/**
 * The single visible surface of the MP stuck-player coach. Neo-brutalist card
 * with a stage-matched message, the wordless drag diagram, and a dismiss button.
 * Renders nothing when there is no active hint.
 */
export function MPStuckCoachCard({ stage, onDismiss }: MPStuckCoachCardProps) {
  const { t } = useLanguage();
  if (stage === 'none') return null;

  const copy = COPY[stage];

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-neo-pop pointer-events-auto mx-auto flex w-full max-w-sm items-center gap-3 rounded-neo border-neo-thick border-neo-black bg-neo-navy-light px-3 py-2 text-neo-white shadow-hard"
    >
      <DragHintDiagram />
      <p className="flex-1 font-neo-body text-sm leading-snug">
        {t(copy.key, copy.fallback)}
      </p>
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
