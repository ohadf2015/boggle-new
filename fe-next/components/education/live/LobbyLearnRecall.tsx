'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyCard } from '@/shared/utils/studyCards';
import type { EduT } from '@/components/education/lobby/eduText';
import { quizzableCards, recallTarget } from '@/lib/education/recallQuiz';
import { spellableWords } from '@/components/education/lobby/warmUpSpell';
import { RecallBuild } from './RecallBuild';
import { WaitingWarmUp } from '@/components/education/lobby/WaitingWarmUp';
import { LobbyWordStudy } from './LobbyWordStudy';
import { RecallQuiz } from './RecallQuiz';
import { RecallFinishCard } from './RecallFinishCard';
import { RECALL_FILLS, RECALL_KEYFRAMES } from './recallStyles';
import type { RecallSummary } from '@/lib/education/recallScore';
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

const BUILD_MAX_LETTERS = 12;

const BUTTON = 'inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-neo border-[3px] px-4 font-neo-display text-base font-black uppercase shadow-hard-sm';

const SECONDARY = 'border-neo-cream/40 edu-sky:border-edu-line bg-neo-navy edu-sky:bg-edu-surface text-neo-cream edu-sky:text-edu-ink';

function buildableCards(cards: readonly StudyCard[]): StudyCard[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = card.word.trim().toLocaleLowerCase();
    if (seen.has(key) || !spellableWords([card.word], BUILD_MAX_LETTERS).length) return false;
    seen.add(key);
    return true;
  });
}

export function canRecall(cards: readonly StudyCard[]): boolean {
  return quizzableCards(cards).length >= 2;
}

export function LobbyLearnRecall({ cards, studied, onDone, quiet = false, username, t }: LobbyLearnRecallProps) {
  const { language } = useLanguageSafe();
  const items = useMemo(() => quizzableCards(cards), [cards]);
  const pool = useMemo(() => cards.map((c) => c.word), [cards]);
  const buildable = useMemo(() => buildableCards(cards), [cards]);
  const [phase, setPhase] = useState<Phase>(studied ? 'learned' : 'meet');
  const [round, setRound] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [peeked, setPeeked] = useState<ReadonlySet<string>>(() => new Set());
  const [run, setRun] = useState<{ summary: RecallSummary; newBest: boolean } | null>(null);
  const [best, setBest] = useState(0);
  const startedAt = useRef(0);

  const building = items.length < 2;
  const count = building ? buildable.length : items.length;
  if (count < 1) return <LobbyWordStudy cards={cards} studied={studied} onDone={onDone} quiet={quiet} t={t} />;

  const finish = (summary: RecallSummary) => {
    setRun({ summary, newBest: best > 0 && summary.score > best });
    setBest((b) => Math.max(b, summary.score));
    if (!studied) {
      trackEduStudyCompleted({ words: count, seconds: Math.round((Date.now() - startedAt.current) / 1000) });
      onDone();
    }
    setPhase('learned');
  };

  return (
    <section data-testid="lobby-word-study" aria-labelledby="lobby-word-study-title" className="flex w-full flex-col gap-3">
      <style>{RECALL_KEYFRAMES}</style>
      <div className="flex items-center justify-between gap-2">
        <h2 id="lobby-word-study-title" className="font-neo-display text-2xl font-black text-neo-cream edu-sky:text-edu-ink lg:text-4xl">
          {t('eduStudent.lobby.studyTitle')}
        </h2>
        {phase === 'learned' && (
          <span data-testid="study-learned" className="inline-flex items-center gap-1 rounded-full border-2 border-neo-lime bg-neo-lime/10 px-2 py-0.5 font-neo-display text-sm font-bold text-neo-lime edu-sky:text-edu-lime-ink">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t(pluralKeyOf('eduStudent.lobby.studyLearned', count, language), { count })}
          </span>
        )}
      </div>

      {phase === 'meet' && (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-neo-body text-base text-neo-cream/80 edu-sky:text-edu-ink/80">{t(building ? 'eduStudent.recall.buildIntro' : 'eduStudent.recall.intro')}</p>
            <span data-testid="recall-peeked" className="shrink-0 font-neo-display text-sm font-bold tabular-nums text-neo-cream/75 edu-sky:text-edu-ink/75">
              {t('eduStudent.recall.peeked', { count: peeked.size, total: cards.length })}
            </span>
          </div>
          <ul data-testid="recall-meet" className="flex max-h-[40cqh] min-h-24 flex-wrap content-start gap-2 overflow-y-auto">
            {cards.map((card, i) => {
              const isOpen = open === card.word;
              const seen = peeked.has(card.word);
              return (
                <li key={card.word} className={isOpen ? 'w-full' : undefined}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => {
                      setOpen(isOpen ? null : card.word);
                      if (!seen) setPeeked((p) => new Set(p).add(card.word));
                    }}
                    className={cn(
                      'w-full rounded-neo-lg border-[3px] border-neo-black text-start text-neo-black transition-[transform,box-shadow] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none motion-reduce:transition-none',
                      PRESS,
                      isOpen ? 'bg-neo-cream shadow-hard' : cn(RECALL_FILLS[i % RECALL_FILLS.length], 'shadow-hard-sm'),
                    )}
                  >
                    <span key={isOpen ? 'open' : 'shut'} className="flex flex-col items-start gap-1 px-4 py-2 motion-safe:animate-[recall-flip_240ms_cubic-bezier(0.23,1,0.32,1)_both]">
                      <span className="flex items-center gap-1.5">
                        <span dir="auto" className="break-words font-neo-display text-xl font-black leading-tight">{card.word}</span>
                        {seen && !isOpen && <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
                      </span>
                      {isOpen && (card.definition || card.hint) && <span dir="auto" className="font-neo-body text-base leading-snug">{card.definition || card.hint}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" data-testid="recall-start" onClick={() => {
              startedAt.current = Date.now();
              setPhase('quiz');
            }} className={cn(BUTTON, PRESS, quiet ? SECONDARY : 'min-h-14 border-neo-black edu-sky:border-neo-black bg-neo-lime edu-sky:bg-neo-lime text-lg text-neo-black edu-sky:text-neo-black')}>
            <Play className="size-5" aria-hidden="true" />
            {t(building ? 'eduStudent.recall.buildStart' : 'eduStudent.recall.start')}
          </button>
        </>
      )}

      {phase === 'quiz' && building && <RecallBuild key={round} cards={buildable} onFinish={finish} t={t} />}

      {phase === 'quiz' && !building && <RecallQuiz key={round} items={items} pool={pool} target={recallTarget(items.length)} onFinish={finish} t={t} />}

      {phase === 'learned' && run && <RecallFinishCard run={run.summary} words={count} newBest={run.newBest} t={t} />}

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
          {best > 0 ? t('eduStudent.recall.beatScore', { score: best }) : t('eduStudent.recall.practiceAgain')}
        </button>
      )}
    </section>
  );
}
