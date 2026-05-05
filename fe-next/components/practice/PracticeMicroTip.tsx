'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MicroTutorialBeat } from '@/lib/practice/microTutorial';

interface Props {
  beat: MicroTutorialBeat;
  onDismiss: () => void;
}

const DURATION_MS: Record<NonNullable<MicroTutorialBeat>, number> = {
  drag: 1600,
  spin: 1600,
  target: 1600,
  diagonal: 4000,
  nice: 800,
  goalComplete: 3500,
  idleNudge: 1600,
};

const KEY_FOR: Record<NonNullable<MicroTutorialBeat>, string> = {
  drag: 'practice.tutorial.drag',
  spin: 'practice.tutorial.spin',
  target: 'practice.tutorial.target',
  diagonal: 'practice.tutorial.diagonal',
  nice: 'practice.tutorial.nice',
  goalComplete: 'practice.tutorial.goalComplete',
  idleNudge: 'practice.tutorial.idleNudge',
};

/**
 * Inline floating ≤4-word tooltip. Auto-dismisses after a beat-specific
 * duration. Driven by the microTutorial state machine — never renders multiple
 * beats at once.
 */
export default function PracticeMicroTip({ beat, onDismiss }: Props) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!beat) return;
    const id = setTimeout(onDismiss, DURATION_MS[beat]);
    return () => clearTimeout(id);
  }, [beat, onDismiss]);

  if (!beat) return null;

  return (
    <div
      data-testid="practice-micro-tip"
      role="status"
      aria-live="polite"
      className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-neo border-2 border-neo-black bg-neo-cream text-neo-black font-neo-display font-black text-sm shadow-hard pointer-events-none z-10"
    >
      {t(KEY_FOR[beat])}
    </div>
  );
}
