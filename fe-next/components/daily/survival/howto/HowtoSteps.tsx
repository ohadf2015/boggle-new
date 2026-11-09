'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Heart, Lightbulb, Target, Trophy } from 'lucide-react';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { HuntBoard, type HuntBoardProps } from '../hunt/HuntBoard';
import type { HuntCell } from '../hunt/huntStage';
import { MAX_ATTEMPTS } from '../constants';
import { lessonGreens, lessonPresent, lessonSolved, spellsLessonWord, type HuntLesson } from './howtoDemos';
import { FeedbackLegend, FeedbackWord, HiddenWord } from './HowtoTiles';

type TFn = HuntBoardProps['t'];
type Dir = 'ltr' | 'rtl';

const NO_LETTERS = new Set<string>();
const NO_PATH: HuntCell[] = [];
const NO_GREENS = new Map<number, string>();
const noop = () => {};

/** How long the guess step waits before lighting the hidden word's path. */
export const GUESS_GLOW_DELAY_MS = 4000;

const TITLE = 'font-display text-2xl font-black text-neo-white';
const BODY = 'mt-1 text-sm font-bold text-neo-white/80';

function WordChip({ word, dir, testId }: { word: string; dir: Dir; testId: string }) {
  return (
    <span
      data-testid={testId}
      dir={dir}
      className="inline-block rounded-md border-2 border-neo-black bg-neo-pink px-2 font-black tracking-widest text-neo-white"
    >
      {word}
    </span>
  );
}

function LessonBoard({
  lesson,
  t,
  interactive,
  onSubmit,
  glow,
  won,
}: {
  lesson: HuntLesson;
  t: TFn;
  interactive: boolean;
  onSubmit: (word: string) => void;
  glow: HuntCell[];
  won?: boolean;
}) {
  return (
    <div className="w-full max-w-[16rem]">
      <HuntBoard
        grid={lesson.grid}
        interactive={interactive}
        eliminatedLetters={NO_LETTERS}
        onWordSubmit={onSubmit}
        onWordChange={noop}
        onLive={noop}
        onRelease={noop}
        phase={won ? 'verdict' : 'pending'}
        verdict={won ? 'target' : null}
        heldPath={glow}
        calm={false}
        t={t}
      />
    </div>
  );
}

/** Step 1: a short word is free. It heals and drops clue letters into the hidden word. */
export function LessonClueStep({
  lesson,
  dir,
  t,
  cleared,
  onCleared,
}: {
  lesson: HuntLesson;
  dir: Dir;
  t: TFn;
  cleared: boolean;
  onCleared: () => void;
}) {
  const [missed, setMissed] = useState(false);
  const greens = useMemo(() => lessonGreens(lesson), [lesson]);
  const present = useMemo(() => lessonPresent(lesson), [lesson]);
  const handleSubmit = (word: string) => {
    if (spellsLessonWord(word, lesson.clueWord, lesson.language)) onCleared();
    else setMissed(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <HiddenWord
        length={lesson.target.length}
        revealed={cleared ? greens : NO_GREENS}
        present={cleared ? present : []}
        dir={dir}
        t={t}
      />
      <div className="text-center">
        <h2 className={TITLE}>{t(cleared ? 'tutorial.wordHunt.lesson.clueDoneTitle' : 'tutorial.wordHunt.lesson.clueTitle')}</h2>
        <p className={BODY}>
          {cleared ? (
            t('tutorial.wordHunt.lesson.clueDoneBody')
          ) : (
            <>
              {t('tutorial.wordHunt.howto.boardHint')} <WordChip word={lesson.clueWord} dir={dir} testId="howto-trace-word" />
            </>
          )}
        </p>
      </div>
      <LessonBoard lesson={lesson} t={t} interactive={!cleared} onSubmit={handleSubmit} glow={cleared ? NO_PATH : lesson.cluePath} />
      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-bold text-neo-yellow">
        {missed && !cleared ? t('tutorial.wordHunt.howto.tryAgain', { word: lesson.clueWord }) : ''}
      </p>
    </div>
  );
}

/** Step 2: what the colours on that word meant. */
export function LessonColorsStep({ lesson, dir, t }: { lesson: HuntLesson; dir: Dir; t: TFn }) {
  const greens = useMemo(() => lessonGreens(lesson), [lesson]);
  const present = useMemo(() => lessonPresent(lesson), [lesson]);
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center">
        <h2 className={TITLE}>{t('tutorial.wordHunt.howto.feedbackTitle')}</h2>
        <p className={BODY}>{t('tutorial.wordHunt.howto.feedbackBody')}</p>
      </div>
      <FeedbackWord feedback={lesson.clueFeedback} dir={dir} />
      <div className="w-full max-w-xs">
        <FeedbackLegend t={t} />
      </div>
      <HiddenWord length={lesson.target.length} revealed={greens} present={present} dir={dir} t={t} />
    </div>
  );
}

type GuessMiss = 'short' | 'wrong' | null;

/**
 * Step 3: the hidden word is on the board, and a word as long as it is a guess.
 * The path lights up if the player hesitates or misses, so nobody gets stuck here.
 */
export function LessonGuessStep({
  lesson,
  dir,
  t,
  solved,
  onSolved,
}: {
  lesson: HuntLesson;
  dir: Dir;
  t: TFn;
  solved: boolean;
  onSolved: () => void;
}) {
  const reduce = useReducedMotion();
  const [miss, setMiss] = useState<GuessMiss>(null);
  const [glowing, setGlowing] = useState(false);
  const greens = useMemo(() => lessonGreens(lesson), [lesson]);
  const present = useMemo(() => lessonPresent(lesson), [lesson]);
  const allGreen = useMemo(() => lessonSolved(lesson), [lesson]);
  const count = [...lesson.target].length;

  useEffect(() => {
    if (solved || glowing) return undefined;
    const id = window.setTimeout(() => setGlowing(true), GUESS_GLOW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [solved, glowing]);

  const handleSubmit = (word: string) => {
    if (spellsLessonWord(word, lesson.target, lesson.language)) {
      onSolved();
      return;
    }
    setMiss([...word].length < count ? 'short' : 'wrong');
    setGlowing(true);
  };

  const missText =
    miss === 'short'
      ? t('tutorial.wordHunt.lesson.guessShort', { count })
      : miss === 'wrong'
        ? t('tutorial.wordHunt.lesson.guessWrong')
        : glowing
          ? t('tutorial.wordHunt.lesson.guessGlow')
          : '';

  return (
    <div className="flex flex-col items-center gap-4">
      <HiddenWord
        length={count}
        revealed={solved ? allGreen : greens}
        present={solved ? [] : present}
        solved={solved}
        dir={dir}
        t={t}
      />
      <div className="text-center">
        {solved ? (
          <m.div
            initial={reduce ? false : { scale: 0.6, rotate: -4 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={SPRING_PRESETS.bouncy}
            className="flex flex-col items-center gap-1"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-3 border-neo-black bg-neo-yellow shadow-hard">
              <Trophy aria-hidden="true" className="h-6 w-6 text-neo-black" />
            </span>
            <h2 className={TITLE}>{t('tutorial.wordHunt.lesson.guessWinTitle')}</h2>
            <p className="text-sm font-bold text-neo-white/80">{t('tutorial.wordHunt.lesson.guessWinBody')}</p>
          </m.div>
        ) : (
          <>
            <h2 className={TITLE}>{t('tutorial.wordHunt.lesson.guessTitle')}</h2>
            <p className={BODY}>{t('tutorial.wordHunt.lesson.guessBody', { count })}</p>
          </>
        )}
      </div>
      <LessonBoard
        lesson={lesson}
        t={t}
        interactive={!solved}
        onSubmit={handleSubmit}
        glow={solved || glowing ? lesson.targetPath : NO_PATH}
        won={solved}
      />
      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-bold text-neo-yellow">
        {solved ? '' : missText}
      </p>
    </div>
  );
}

/** Step 4: the three rules of the real game, now that they've done each one. */
export function LessonReadyStep({ t }: { t: TFn }) {
  const rules: Array<{ icon: React.ReactNode; key: string; params?: Record<string, number> }> = [
    { icon: <Heart className="h-5 w-5 fill-neo-pink text-neo-pink" aria-hidden="true" />, key: 'tutorial.wordHunt.lesson.ruleLife' },
    { icon: <Lightbulb className="h-5 w-5 text-neo-lime" aria-hidden="true" />, key: 'tutorial.wordHunt.lesson.ruleClues' },
    {
      icon: <Target className="h-5 w-5 text-neo-cyan" aria-hidden="true" />,
      key: 'tutorial.wordHunt.lesson.ruleGuess',
      params: { tries: MAX_ATTEMPTS },
    },
  ];
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <h2 className="font-display text-3xl font-black text-neo-white">{t('tutorial.wordHunt.lesson.readyTitle')}</h2>
      <ul data-testid="howto-rules" className="flex w-full max-w-xs flex-col gap-3 text-start">
        {rules.map((rule) => (
          <li key={rule.key} className="flex items-start gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard">
            <span className="mt-0.5 shrink-0">{rule.icon}</span>
            <span className="text-sm font-bold text-neo-white">{t(rule.key, rule.params)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
