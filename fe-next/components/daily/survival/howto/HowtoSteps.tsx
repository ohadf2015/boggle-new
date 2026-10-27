'use client';

import React, { useMemo, useState } from 'react';
import { Heart, Search } from 'lucide-react';
import { HuntBoard, type HuntBoardProps } from '../hunt/HuntBoard';
import type { HowtoDemo } from './howtoDemos';
import { FeedbackLegend, FeedbackWord, HiddenWord } from './HowtoTiles';

type TFn = HuntBoardProps['t'];
type Dir = 'ltr' | 'rtl';

const NO_LETTERS = new Set<string>();
const NO_LETTERS_MAP = new Map<number, string>();
const noop = () => {};

export function revealedGreens(demo: HowtoDemo): Map<number, string> {
  return new Map(demo.feedback.filter((f) => f.feedback === 'green').map((f) => [f.position, f.letter]));
}

export function HowtoBoardStep({ demo, dir, t, onTraced }: { demo: HowtoDemo; dir: Dir; t: TFn; onTraced: () => void }) {
  const [missed, setMissed] = useState<string | null>(null);
  const handleSubmit = (word: string) => {
    if (word.toUpperCase() === demo.word.toUpperCase()) onTraced();
    else setMissed(word);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <HiddenWord length={demo.target.length} revealed={NO_LETTERS_MAP} dir={dir} t={t} />
      <div className="text-center">
        <h2 className="font-display text-2xl font-black text-neo-white">{t('tutorial.wordHunt.howto.boardTitle')}</h2>
        <p className="mt-1 text-sm font-bold text-neo-white/80">
          {t('tutorial.wordHunt.howto.boardHint')}{' '}
          <span
            data-testid="howto-trace-word"
            dir={dir}
            className="inline-block rounded-md border-2 border-neo-black bg-neo-pink px-2 font-black tracking-widest text-neo-white"
          >
            {demo.word}
          </span>
        </p>
      </div>
      <div className="w-full max-w-[17rem]">
        <HuntBoard
          grid={demo.grid}
          interactive
          eliminatedLetters={NO_LETTERS}
          onWordSubmit={handleSubmit}
          onWordChange={noop}
          onLive={noop}
          onRelease={noop}
          phase="pending"
          verdict={null}
          heldPath={demo.path}
          calm={false}
          t={t}
        />
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-bold text-neo-yellow">
        {missed ? t('tutorial.wordHunt.howto.tryAgain', { word: demo.word }) : ''}
      </p>
    </div>
  );
}


export function HowtoFeedbackStep({ demo, dir, t }: { demo: HowtoDemo; dir: Dir; t: TFn }) {
  const revealed = useMemo(() => revealedGreens(demo), [demo]);
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center">
        <h2 className="font-display text-2xl font-black text-neo-white">{t('tutorial.wordHunt.howto.feedbackTitle')}</h2>
        <p className="mt-1 text-sm font-bold text-neo-white/80">{t('tutorial.wordHunt.howto.feedbackBody')}</p>
      </div>
      <FeedbackWord feedback={demo.feedback} dir={dir} />
      <div className="w-full max-w-xs">
        <FeedbackLegend t={t} />
      </div>
      <HiddenWord length={demo.target.length} revealed={revealed} dir={dir} t={t} />
    </div>
  );
}

export function HowtoGoalStep({ demo, dir, t }: { demo: HowtoDemo; dir: Dir; t: TFn }) {
  const revealed = useMemo(() => revealedGreens(demo), [demo]);
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full border-3 border-neo-black bg-neo-cyan shadow-hard">
        <Search className="h-8 w-8 text-neo-black" aria-hidden="true" />
      </span>
      <h2 className="font-display text-3xl font-black text-neo-white">{t('tutorial.wordHunt.howto.goalTitle')}</h2>
      <HiddenWord length={demo.target.length} revealed={revealed} dir={dir} t={t} />
      <ul className="flex w-full max-w-xs flex-col gap-3 text-start">
        <li className="flex items-start gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard">
          <Heart className="mt-0.5 h-5 w-5 shrink-0 fill-neo-pink text-neo-pink" aria-hidden="true" />
          <span className="text-sm font-bold text-neo-white">{t('tutorial.wordHunt.howto.goalLife')}</span>
        </li>
        <li className="flex items-start gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard">
          <span aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-neo-black bg-neo-lime" />
          <span className="text-sm font-bold text-neo-white">{t('tutorial.wordHunt.howto.goalClues')}</span>
        </li>
      </ul>
      <p className="max-w-xs text-sm font-bold text-neo-yellow">{t('tutorial.wordHunt.triesRule.keyInsight')}</p>
    </div>
  );
}
