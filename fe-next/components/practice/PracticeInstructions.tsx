'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

const ACCENT: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan/60 bg-neo-cyan/10',
  wordHunt: 'border-neo-lime/60 bg-neo-lime/10',
  wheelRush: 'border-neo-purple/60 bg-neo-purple/10',
};

const TIPS_KEYS: Record<PracticeMode, [string, string, string]> = {
  classic: [
    'practice.instructions.classic.line1',
    'practice.instructions.classic.line2',
    'practice.instructions.classic.line3',
  ],
  wordHunt: [
    'practice.instructions.wordHunt.line1',
    'practice.instructions.wordHunt.line2',
    'practice.instructions.wordHunt.line3',
  ],
  wheelRush: [
    'practice.instructions.wheelRush.line1',
    'practice.instructions.wheelRush.line2',
    'practice.instructions.wheelRush.line3',
  ],
};

interface Props {
  mode: PracticeMode;
}

/**
 * Collapsible instructions card. Open by default on first render so new
 * players see the rules without an extra tap; collapses on toggle and stays
 * collapsed (no persistence — fresh per session keeps reminders cheap).
 */
export default function PracticeInstructions({ mode }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);
  const tips = TIPS_KEYS[mode];

  return (
    <div
      data-testid="practice-instructions"
      className={`w-full max-w-xs rounded-neo border-2 ${ACCENT[mode]} px-3 py-2`}
    >
      <button
        type="button"
        data-testid="practice-instructions-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-xs uppercase font-neo-display font-black tracking-wider text-neo-cream">
          {t('practice.instructions.title')}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-neo-cream/70" aria-hidden />
        ) : (
          <ChevronDown className="w-4 h-4 text-neo-cream/70" aria-hidden />
        )}
      </button>
      {open && (
        <ul
          data-testid="practice-instructions-list"
          className="mt-2 flex flex-col gap-1 text-xs font-neo-body text-neo-cream/85"
        >
          {tips.map((tipKey) => (
            <li key={tipKey} className="flex items-start gap-1.5">
              <span aria-hidden className="text-neo-lime mt-0.5">›</span>
              <span>{t(tipKey)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
