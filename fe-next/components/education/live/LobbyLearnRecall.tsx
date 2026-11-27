'use client';

import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyCard } from '@/shared/utils/studyCards';
import type { EduT } from '@/components/education/lobby/eduText';
import { quizzableCards, recallTarget } from '@/lib/education/recallQuiz';
import { WaitingWarmUp } from '@/components/education/lobby/WaitingWarmUp';
import { LobbyWordStudy } from './LobbyWordStudy';
import { RecallQuiz } from './RecallQuiz';
import { trackEduStudyCompleted } from '@/lib/education/studyTelemetry';
import { PRESS } from './eduLiveStyles';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';
import { useLanguageSafe } from '@/contexts/LanguageContext';

interface LobbyLearnRecallProps {
  cards: StudyCard[];
  studied: boolean;
  onDone: () => void;
  /** READY is available, so it stays the screen's one lime action. */
  quiet?: boolean;
  /** Seeds the spelling practice that follows once the words are learned. */
  username?: string;
  t: EduT;
}

type Phase = 'meet' | 'quiz' | 'learned';

const BUTTON = 'inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-neo border-[3px] px-4 font-neo-display text-base font-black uppercase shadow-hard-sm';

const SECONDARY = 'border-edu-line bg-edu-surface text-edu-ink';

export function canRecall(cards: readonly StudyCard[]): boolean {
  return quizzableCards(cards).length >= 2;
}

export function LobbyLearnRecall({ cards, studied, onDone, quiet = false, username, t }: LobbyLearnRecallProps) {
  const { language } = useLanguageSafe();
  const items = useMemo(() => quizzableCards(cards), [cards]);
  const pool = useMemo(() => cards.map((c) => c.word), [cards]);
  const [phase, setPhase] = useState<Phase>(studied ? 'learned' : 'meet');
  const [round, setRound] = useState(0);
  const startedAt = useRef(0);

  if (items.length < 2) return <LobbyWordStudy cards={cards} studied={studied} onDone={onDone} quiet={quiet} t={t} />;

  const finish = () => {
    if (!studied) {
      trackEduStudyCompleted({ words: items.length, seconds: Math.round((Date.now() - startedAt.current) / 1000) });
      onDone();
    }
    setPhase('learned');
  };

  return (
    <section data-testid="lobby-word-study" aria-labelledby="lobby-word-study-title" className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="lobby-word-study-title" className="font-neo-display text-2xl font-black text-edu-ink lg:text-4xl">
          {t('eduStudent.lobby.studyTitle')}
        </h2>
        {phase === 'learned' && (
          <span data-testid="study-learned" className="inline-flex items-center gap-1 rounded-full border-2 border-neo-lime bg-neo-lime/10 px-2 py-0.5 font-neo-display text-sm font-bold text-edu-lime-ink">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t(pluralKeyOf('eduStudent.lobby.studyLearned', items.length, language), { count: items.length })}
          </span>
        )}
      </div>

      {phase === 'meet' && (
        <>
          <p className="font-neo-body text-base text-edu-ink/80">{t('eduStudent.recall.intro')}</p>
          <ul data-testid="recall-meet" className="flex max-h-[40cqh] min-h-24 flex-col divide-y-2 divide-neo-black/15 overflow-y-auto rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-4 py-1 text-neo-black shadow-hard">
            {cards.map((card) => (
              <li key={card.word} className="flex flex-col py-2">
                <span dir="auto" className="break-words font-neo-display text-xl font-black leading-tight">{card.word}</span>
                {card.definition && <span dir="auto" className="font-neo-body text-base leading-snug">{card.definition}</span>}
              </li>
            ))}
          </ul>
          <button type="button" data-testid="recall-start" onClick={() => {
              startedAt.current = Date.now();
              setPhase('quiz');
            }} className={cn(BUTTON, PRESS, quiet ? SECONDARY : 'min-h-14 border-neo-black bg-neo-lime text-lg text-neo-black')}>
            <Play className="size-5" aria-hidden="true" />
            {t('eduStudent.recall.start')}
          </button>
        </>
      )}

      {phase === 'quiz' && <RecallQuiz key={round} items={items} pool={pool} target={recallTarget(items.length)} onFinish={finish} t={t} />}

      {phase === 'learned' && username && <WaitingWarmUp username={username} t={t} hero />}

      {phase === 'learned' && (
        <button
          type="button"
          data-testid="recall-practice-again"
          onClick={() => {
            setRound((r) => r + 1);
            setPhase('quiz');
          }}
          className={cn(BUTTON, PRESS, SECONDARY)}
        >
          <RotateCcw className="size-5" aria-hidden="true" />
          {t('eduStudent.recall.practiceAgain')}
        </button>
      )}
    </section>
  );
}
