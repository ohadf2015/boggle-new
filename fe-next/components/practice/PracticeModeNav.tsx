'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRACTICE_MODES } from '@/lib/practice/practiceRoute';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';
import { usePracticeProgress } from './usePracticeProgress';

interface Props {
  current: PracticeMode;
}

const ACCENT: Record<PracticeMode, string> = {
  classic: 'bg-neo-cyan/30 border-neo-cyan text-neo-cyan',
  wordHunt: 'bg-neo-lime/30 border-neo-lime text-neo-lime',
  wheelRush: 'bg-neo-purple/30 border-neo-purple text-neo-purple',
};

const ACCENT_DIM: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan/50 text-neo-cyan/80',
  wordHunt: 'border-neo-lime/50 text-neo-lime/80',
  wheelRush: 'border-neo-purple/50 text-neo-purple/80',
};

/**
 * Compact 3-chip row letting the player jump between practice modes from
 * inside any sandbox. Current mode rendered as a non-link disabled chip;
 * completed modes get a check; the rest are dim links.
 *
 * Always-visible escape hatch — answers "easily move to other modes".
 */
export default function PracticeModeNav({ current }: Props) {
  const { t, language } = useLanguage();
  const completed = usePracticeProgress(language);

  return (
    <nav
      aria-label={t('practiceHub.navAria')}
      data-testid="practice-mode-nav"
      className="w-full max-w-md mx-auto flex items-center justify-between gap-2 px-1 py-1"
    >
      <Link
        href={`/${language}/practice`}
        className="text-xs font-neo-display font-black text-neo-cream/60 underline-offset-2 hover:underline shrink-0"
      >
        {t('practiceHub.backToHub')}
      </Link>
      <div className="flex items-center gap-1.5 flex-1 justify-end">
        {PRACTICE_MODES.map((mode) => {
          const isCurrent = mode === current;
          const isDone = completed.has(mode);
          const label = t(`gameModes.${mode}.name`);
          const className =
            'flex items-center gap-1 px-2 py-1 rounded-full border-2 font-neo-display font-black text-[10px] uppercase tracking-wide ' +
            (isCurrent ? ACCENT[mode] : ACCENT_DIM[mode]);
          if (isCurrent) {
            return (
              <span
                key={mode}
                aria-current="page"
                data-testid={`practice-nav-${mode}`}
                className={className + ' opacity-100'}
              >
                {isDone && <span aria-hidden>✓</span>}
                {label}
              </span>
            );
          }
          return (
            <Link
              key={mode}
              href={`/${language}/practice/${mode}`}
              data-testid={`practice-nav-${mode}`}
              data-complete={isDone}
              className={className + ' hover:opacity-100 opacity-70'}
            >
              {isDone && <span aria-hidden>✓</span>}
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
