'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import type { StudyCard } from '@/shared/utils/studyCards';
import type { EduT } from '@/components/education/lobby/eduText';
import { PRESS } from './eduLiveStyles';

interface LobbyWordStudyProps {
  cards: StudyCard[];
  studied: boolean;
  onDone: () => void;
  t: EduT;
}

const NAV = 'inline-flex min-h-12 items-center justify-center gap-1.5 rounded-neo border-[3px] px-4 font-neo-display text-base font-black uppercase shadow-hard-sm disabled:opacity-40 disabled:shadow-none';

export function LobbyWordStudy({ cards, studied, onDone, t }: LobbyWordStudyProps) {
  const [index, setIndex] = useState(0);
  const card = cards[Math.min(index, cards.length - 1)];
  const last = index >= cards.length - 1;

  return (
    <section data-testid="lobby-word-study" aria-labelledby="lobby-word-study-title" className="flex w-full max-w-sm flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="lobby-word-study-title" className="font-neo-display text-lg font-black text-neo-cream">
          {t('eduStudent.lobby.studyTitle')}
        </h2>
        {studied ? (
          <span data-testid="study-learned" className="inline-flex items-center gap-1 rounded-full border-2 border-neo-lime bg-neo-lime/10 px-2 py-0.5 font-neo-display text-sm font-bold text-neo-lime">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t('eduStudent.lobby.studyLearned', { count: cards.length })}
          </span>
        ) : (
          <span className="font-neo-display text-sm font-bold tabular-nums text-neo-cream/75">
            {t('eduStudent.lobby.studyProgress', { current: index + 1, total: cards.length })}
          </span>
        )}
      </div>

      <div aria-live="polite" className="flex min-h-36 flex-col justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-5 py-4 text-neo-black shadow-hard">
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
          onClick={() => setIndex((i) => i - 1)}
          disabled={index === 0}
          className={cn(NAV, PRESS, 'flex-1 border-neo-cream/40 bg-neo-navy-light text-neo-cream')}
        >
          <DirectionalIcon icon={ArrowLeft} className="size-5" />
          {t('eduStudent.lobby.studyBack')}
        </button>
        {last && !studied ? (
          <button type="button" data-testid="study-done" onClick={onDone} className={cn(NAV, PRESS, 'flex-[2] border-neo-black bg-neo-lime text-neo-black')}>
            <Check className="size-5" aria-hidden="true" />
            {t('eduStudent.lobby.studyDone')}
          </button>
        ) : (
          <button
            type="button"
            data-testid="study-next"
            onClick={() => setIndex((i) => i + 1)}
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
