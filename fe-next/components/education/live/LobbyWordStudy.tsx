'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import posthog from '@/lib/analytics/lazyPosthog';
import { useExperiment } from '@/hooks/useExperiment';
import type { StudyCard } from '@/shared/utils/studyCards';
import type { EduT } from '@/components/education/lobby/eduText';
import { PRESS } from './eduLiveStyles';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';
import { useLanguageSafe } from '@/contexts/LanguageContext';

interface LobbyWordStudyProps {
  cards: StudyCard[];
  studied: boolean;
  onDone: () => void;
  quiet?: boolean;
  t: EduT;
}

const NAV = 'inline-flex min-h-12 items-center justify-center gap-1.5 rounded-neo border-[3px] px-4 font-neo-display text-base font-black uppercase shadow-hard-sm disabled:opacity-40 disabled:shadow-none';

export function LobbyWordStudy({ cards, studied, onDone, quiet = false, t }: LobbyWordStudyProps) {
  const { language } = useLanguageSafe();
  const [index, setIndex] = useState(0);
  const [navBump, setNavBump] = useState(0);
  const card = cards[Math.min(index, cards.length - 1)];
  const last = index >= cards.length - 1;
  const { variant } = useExperiment('exp-edu-study-card-feedback-v1');

  const nav = (direction: 'next' | 'back') => {
    posthog.capture('edu_lobby_study_nav_clicked', { direction, cardIndex: index, totalCards: cards.length });
    setNavBump((n) => n + 1);
    setIndex((i) => (direction === 'next' ? i + 1 : i - 1));
  };

  return (
    <section data-testid="lobby-word-study" aria-labelledby="lobby-word-study-title" className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="lobby-word-study-title" className="font-neo-display text-2xl font-black text-neo-cream edu-sky:text-edu-ink lg:text-4xl">
          {t('eduStudent.lobby.studyTitle')}
        </h2>
        {studied ? (
          <span data-testid="study-learned" className="inline-flex items-center gap-1 rounded-full border-2 border-neo-lime bg-neo-lime/10 px-2 py-0.5 font-neo-display text-sm font-bold text-neo-lime edu-sky:text-edu-lime-ink">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t(pluralKeyOf('eduStudent.lobby.studyLearned', cards.length, language), { count: cards.length })}
          </span>
        ) : (
          <span className="font-neo-display text-sm font-bold tabular-nums text-neo-cream/75 edu-sky:text-edu-ink/75">
            {t('eduStudent.lobby.studyProgress', { current: index + 1, total: cards.length })}
          </span>
        )}
      </div>

      <div
        data-testid="study-card"
        key={variant === 'card-pulse' ? navBump : undefined}
        aria-live="polite"
        className={cn(
          'flex min-h-36 flex-col justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-5 py-4 text-neo-black shadow-hard',
          variant === 'card-pulse' && 'animate-neo-pop'
        )}
      >
        <p data-testid="study-word" dir="auto" className="break-words font-neo-display text-[clamp(1.75rem,9cqw,2.5rem)] font-black leading-tight">
          {card.word}
        </p>
        {card.definition && <p dir="auto" className="font-neo-body text-base leading-snug">{card.definition}</p>}
        {card.hint && <p dir="auto" className="font-neo-body text-sm text-neo-black/70">{t('eduStudent.lobby.studyHint', { hint: card.hint })}</p>}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          data-testid="study-back"
          onClick={() => nav('back')}
          disabled={index === 0}
          className={cn(NAV, PRESS, 'flex-1 border-neo-cream/40 edu-sky:border-edu-line bg-neo-navy-light edu-sky:bg-edu-surface text-neo-cream edu-sky:text-edu-ink')}
        >
          <DirectionalIcon icon={ArrowLeft} className="size-5" />
          {t('eduStudent.lobby.studyBack')}
        </button>
        {last && !studied ? (
          <button type="button" data-testid="study-done"
            onClick={() => {
              posthog.capture('edu_lobby_study_done_clicked', { totalCards: cards.length });
              onDone();
            }}
            className={cn(NAV, PRESS, 'flex-[2]', quiet ? 'border-neo-cream/40 edu-sky:border-edu-line bg-neo-navy edu-sky:bg-edu-surface text-neo-cream edu-sky:text-edu-ink' : 'border-neo-black edu-sky:border-neo-black bg-neo-lime edu-sky:bg-neo-lime text-neo-black edu-sky:text-neo-black')}>
            <Check className="size-5" aria-hidden="true" />
            {t('eduStudent.lobby.studyDone')}
          </button>
        ) : (
          <button
            type="button"
            data-testid="study-next"
            onClick={() => nav('next')}
            disabled={last}
            className={cn(NAV, PRESS, 'flex-[2] border-neo-black bg-neo-cyan text-neo-black')}
          >
            {t('eduStudent.lobby.studyNext')}
            <DirectionalIcon icon={ArrowRight} className="size-5" />
          </button>
        )}
      </div>
    </section>
  );
}
