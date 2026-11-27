'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { ArrowLeft, ArrowRight, Lightbulb, Check, X, Star } from 'lucide-react';
import { useSpellingGame } from './hooks/useSpellingGame';
import PracticeResultsCard from './PracticeResultsCard';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { EnrichedVocabularyWord } from '@/types/vocabulary';
import { WordContextRow } from './WordContextRow';
import { PronunciationButton } from './PronunciationButton';
import { usePracticeSfx } from '@/components/education/practice/usePracticeSfx';
import StreakFlame from '@/components/education/practice/StreakFlame';
import { PracticeInsufficientData } from './PracticeInsufficientData';
import { wordsReadyForDrill } from '@/lib/education/normalizePracticeWords';
import { fireConfetti } from '@/utils/confettiUtils';
import { SpellingTiles, TILE_KEYFRAMES } from './spelling/SpellingTiles';
import { StarTrack, STAR_KEYFRAMES } from './spelling/StarTrack';
import { candyKey } from './spelling/candyKey';
import { PracticeBuddy, BUDDY_KEYFRAMES, type BuddyReaction } from './spelling/PracticeBuddy';
import { streakFlameStage } from '@/lib/education/practiceJuice';
import type { WordResult } from '@/lib/education/wordMemory';

/*
 * The stage behind the drill: two soft brand-colour glows and a faint dot grid
 * over the navy, so the round reads as a game board rather than a blank form.
 * Static (no animation), so it costs nothing on a low-end phone. The sky
 * classroom skin sets --practice-stage-art to none: no glows on the light page.
 */
const STAGE_STYLE: React.CSSProperties = {
  backgroundImage: `var(--practice-stage-art, ${[
    'radial-gradient(60% 38% at 12% 0%, color-mix(in srgb, var(--neo-cyan) 20%, transparent), transparent 70%)',
    'radial-gradient(55% 35% at 100% 40%, color-mix(in srgb, var(--neo-pink) 18%, transparent), transparent 70%)',
    'radial-gradient(55% 30% at 0% 100%, color-mix(in srgb, var(--neo-lime) 12%, transparent), transparent 70%)',
    'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1.6px)',
  ].join(',')})`,
  backgroundSize: 'auto, auto, auto, 18px 18px',
};

/** A small burst of confetti from the tiles on a right answer (skipped for reduced motion / low-end). */
function burstFrom(el: HTMLElement | null) {
  if (!el || typeof window === 'undefined') return;
  const r = el.getBoundingClientRect();
  // Cosmetic only: a confetti failure must never cost the student their answer.
  try {
    fireConfetti({
    particleCount: 36,
    spread: 70,
    startVelocity: 32,
    gravity: 1.1,
    ticks: 120,
    scalar: 0.8,
    origin: { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight },
    });
  } catch {
    /* no confetti this time */
  }
}

export interface SpellingChallengePracticeProps {
  words: VocabularyWord[];
  onComplete: (results: { correct: number; total: number; accuracy: number; wordResults: WordResult[] }) => void;
  onBack: () => void;
  /** Jump straight into the next ready mode, when the lesson offers one. */
  onNext?: () => void;
  /** Human name of that next mode, for the button label. */
  nextLabel?: string;
  /** XP session data to display on results screen (optional) */
  xpSessionData?: {
    sessionXpEarned: number;
    sessionMasteryMessage: string | null;
  };
}

/**
 * SpellingChallengePractice - Type-the-word spelling practice mode
 *
 * Features:
 * - Shows definition, student types the word
 * - Progressive difficulty (shorter words first)
 * - Hint system (first letter free, additional hints reset streak)
 * - Streak tracking with visual feedback
 * - Auto-advance after answer (1s correct, 2s incorrect)
 * - Results display with PracticeResultsCard
 */
interface SpellingRoundProps extends SpellingChallengePracticeProps {
  /** Start a fresh round: the full list (no argument) or only the words just missed. */
  onNewRound: (words?: VocabularyWord[]) => void;
}

/**
 * Each round is a fresh mount (the game hook fixes its word order on mount), so
 * "Again" and "Practice these" both start clean: same list, or only the misses.
 */
export function SpellingChallengePractice(props: SpellingChallengePracticeProps) {
  const [round, setRound] = useState<{ n: number; words: VocabularyWord[] | null }>({ n: 0, words: null });
  const onNewRound = useCallback((retry?: VocabularyWord[]) => {
    setRound((r) => ({ n: r.n + 1, words: retry && retry.length > 0 ? retry : null }));
  }, []);
  return <SpellingRound key={round.n} {...props} words={round.words ?? props.words} onNewRound={onNewRound} />;
}

function SpellingRound({
  words,
  onComplete,
  onBack,
  xpSessionData,
  onNext,
  nextLabel,
  onNewRound,
}: SpellingRoundProps) {
  const { t, dir, language } = useLanguage();
  const isRTL = dir === 'rtl';
  const sfx = usePracticeSfx();

  /*
    Trimmed, de-duplicated, blanks dropped — a teacher's list arrives with all
    three. Spelling asks for the WORD and nothing else (the definition is a
    bonus prompt, not the question — see the definition card below), so the
    only entry this drill cannot use is one with no word at all.
  */
  const usable = useMemo(() => wordsReadyForDrill(words, 'word'), [words]);

  const {
    currentWord,
    wordIndex,
    totalWords,
    currentHint,
    getHint,
    submitAnswer,
    currentStreak,
    maxStreak,
    hintsUsed,
    correctCount,
    attempts,
    accuracy,
    isComplete,
    wordResults,
    advance,
    resetGame,
  } = useSpellingGame(usable, { manualAdvanceOnWrong: true });

  // Mirror the hook's sort-by-length so wordIndex maps to the right enriched
  // word — including the hook's drop of entries with no `word`, or the two
  // lists index differently and the hint row describes a different card than
  // the one on screen.
  const sortedWords = useMemo(
    () => [...usable].sort((a, b) => a.word.length - b.word.length),
    [usable]
  );

  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; correctWord: string; attempt?: string } | null>(null);
  // One entry per answered word: drives the progress track and the "catch these" list.
  const [outcomes, setOutcomes] = useState<Array<{ correct: boolean; attempt: string }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [totalHintsUsed, setTotalHintsUsed] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const sessionStartRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  // The buddy's cue: one reaction per answer, plus a nod per keystroke.
  const [buddyReaction, setBuddyReaction] = useState<BuddyReaction | null>(null);
  const [typingTick, setTypingTick] = useState(0);

  // Initialize session start time — and open the round with a cue, so the
  // student hears that a drill has begun rather than just seeing a new card.
  useEffect(() => {
    sessionStartRef.current = Date.now();
    sfx.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  // Focus input on mount and word change
  useEffect(() => {
    if (!isComplete && !feedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [wordIndex, isComplete, feedback]);

  // Show results and report completion when game ends
  useEffect(() => {
    if (isComplete && !showResults) {
      setTimeSpent(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      setTimeout(() => {
        setShowResults(true);
        onComplete({ correct: correctCount, total: attempts, accuracy, wordResults });
      }, 500);
    }
  }, [isComplete, showResults, onComplete, correctCount, attempts, accuracy, wordResults]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || feedback) return;

      const result = submitAnswer(inputValue);
      const answeredAt = wordIndex;
      setOutcomes((prev) => {
        const next = [...prev];
        next[answeredAt] = { correct: result.correct, attempt: inputValue.trim() };
        return next;
      });
      if (result.correct) sfx.correct();
      else sfx.wrong();
      // A right answer that lifts the streak flame to a new stage gets the strut, not the jump.
      const nextStreak = result.correct ? currentStreak + 1 : 0;
      const newStage = streakFlameStage(nextStreak).stage;
      const hype = result.correct && newStage >= 2 && newStage > streakFlameStage(currentStreak).stage;
      setBuddyReaction((prev) => ({
        kind: result.correct ? (hype ? 'streak' : 'correct') : 'miss',
        id: (prev?.id ?? 0) + 1,
      }));
      // Keep what they typed: seeing their own spelling next to the right one is the lesson.
      setFeedback({ ...result, attempt: inputValue.trim() });
      if (result.correct) burstFrom(tilesRef.current);
      setInputValue('');

      if (result.correct) setTimeout(() => setFeedback(null), 1000);
    },
    [inputValue, feedback, submitAnswer, sfx, wordIndex, currentStreak]
  );

  const handleNext = useCallback(() => {
    setFeedback(null);
    advance();
  }, [advance]);

  const handleRestart = useCallback(() => {
    resetGame();
    onNewRound();
  }, [resetGame, onNewRound]);

  const missed = useMemo(
    () => sortedWords.filter((_, i) => outcomes[i] && !outcomes[i].correct),
    [sortedWords, outcomes]
  );

  // "Nailed it!|Spot on!|…" — a different cheer per word, so a streak does not read as one stamp.
  const praise = useMemo(() => {
    const raw = t('eduStudent.practice.praise');
    const list = typeof raw === 'string' && raw.includes('|') ? raw.split('|').filter(Boolean) : [];
    return list.length > 0 ? list[wordIndex % list.length] : t('education.practice.correct');
  }, [t, wordIndex]);


  // Track hints used across all words — intentionally fires on word transition only
  useEffect(() => {
    setTotalHintsUsed(prev => prev + hintsUsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIndex]);

  const hintSpent = currentHint.length >= (sortedWords[wordIndex]?.word?.length ?? 0);

  if (usable.length < 1) {
    return <PracticeInsufficientData onBack={onBack} />;
  }

  if (showResults) {
    return (
      <div className="min-h-full bg-neo-navy edu-sky:bg-edu-page edu-sky:[--practice-stage-art:none] flex items-center justify-center p-4" style={STAGE_STYLE}>
        <PracticeResultsCard
          correct={correctCount}
          total={attempts}
          xpEarned={xpSessionData?.sessionXpEarned}
          onRestart={handleRestart}
          onBack={onBack}
          timeSpent={timeSpent}
          maxStreak={maxStreak}
          hintsUsed={totalHintsUsed}
          onNext={onNext}
          nextLabel={nextLabel}
          footer={
            missed.length > 0 ? (
              <div data-testid="spelling-missed" className="mt-1 flex flex-col items-center gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
                <p className="font-neo-display text-sm font-bold uppercase tracking-wide text-neo-cream edu-sky:text-edu-ink">
                  {t('eduStudent.results.missedTitle')}
                </p>
                <ul className="flex flex-wrap justify-center gap-2">
                  {missed.map((w) => (
                    <li
                      key={w.word}
                      dir="auto"
                      className="rounded-neo border-[3px] border-neo-black bg-neo-cream px-2.5 py-0.5 font-neo-display text-base font-black tracking-[0.08em] text-neo-black shadow-hard-sm"
                    >
                      {w.word}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  data-testid="spelling-retry-missed"
                  onClick={() => onNewRound(missed)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-neo border-[2px] border-neo-pink bg-neo-navy edu-sky:bg-edu-surface px-4 font-neo-body text-sm font-bold uppercase text-neo-pink edu-sky:text-edu-pink-ink transition-colors hover:bg-neo-navy-light edu-sky:hover:bg-edu-tile focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
                >
                  {t('eduStudent.results.practiceThese')}
                  <DirectionalIcon icon={ArrowRight} className="size-4" />
                </button>
              </div>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div
      className="@container min-h-full bg-neo-navy edu-sky:bg-edu-page edu-sky:[--practice-stage-art:none] p-4 @3xl:rounded-neo @3xl:border-[3px] @3xl:border-neo-cream/15 edu-sky:@3xl:border-edu-line @3xl:px-8 @3xl:py-6"
      style={STAGE_STYLE}
      data-testid="spelling-stage"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <style>{TILE_KEYFRAMES + STAR_KEYFRAMES + BUDDY_KEYFRAMES + PLAY_KEYFRAMES}</style>
      {/* Header */}
      <div className="mx-auto mb-6 max-w-2xl @3xl:max-w-4xl">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label={t('common.back')}
            className="edu-sky:border-edu-line edu-sky:bg-edu-surface edu-sky:shadow-edu-lip-sm text-neo-white edu-sky:text-edu-ink hover:text-neo-white edu-sky:hover:text-edu-ink hover:bg-neo-white/10 edu-sky:hover:bg-edu-ink/10"
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <h2 className="text-xl font-neo-display text-neo-white edu-sky:text-edu-ink mb-1">
              {t('education.practice.spellTheWord')}
            </h2>
            <div className="flex flex-col items-center gap-1">
              <p className="text-neo-white edu-sky:text-edu-ink font-neo-body" data-testid="progress-text">
                {wordIndex + (isComplete ? 0 : 0)} / {totalWords}
              </p>
            </div>
          </div>

          {/* On a phone the buddy sits in the header's free corner, clear of the pips and the card. */}
          <div className="relative w-10 self-stretch">
            <PracticeBuddy
              reaction={buddyReaction}
              typing={inputValue.length > 0 && !feedback}
              typingTick={typingTick}
              className="absolute -top-2 end-0 z-20 size-16 @3xl:hidden"
            />
          </div>
        </div>
        {/* Stars to collect on the way to the trophy; misses stay visible as pink marks. */}
        <StarTrack
          total={totalWords}
          current={wordIndex}
          outcomes={outcomes}
          label={t('eduStudent.practice.progress', { current: Math.min(wordIndex + 1, totalWords), total: totalWords })}
        />
      </div>

      {/* Main content */}
      {/*
        On a wide screen the buddy gets its own column beside the round, big
        enough to read its reactions; on a phone it lives in the header corner.
      */}
      <div className="mx-auto max-w-2xl @3xl:grid @3xl:max-w-4xl @3xl:grid-cols-[minmax(0,1fr)_15rem] @3xl:items-center @3xl:gap-8">
      <div className="space-y-6">
        {/*
          The streak used to be a flat orange pill reading "4x streak". It is
          now a fire that visibly grows through four stages and stings when it
          reaches a new one — the one tense mechanic in this drill, finally
          audible. `streak-display` stays as the testid for existing coverage.
        */}
        {currentStreak > 0 && (
          <div data-testid="streak-display" className="flex justify-center">
            <StreakFlame streak={currentStreak} />
          </div>
        )}

        {/* Definition card */}
        <div className="relative [perspective:900px]">
        <AdaptiveAnimatePresence mode="wait">
          <AdaptiveMotion.div
            key={wordIndex}
            // Each new word flips in like a dealt card, on a spring.
            initial={{ rotateX: -75, opacity: 0, y: 14 }}
            animate={{ rotateX: 0, opacity: 1, y: 0 }}
            exit={{ rotateX: 60, opacity: 0, y: -10, transition: { duration: 0.14, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 320, damping: 24, mass: 0.8 }}
            data-testid="definition-card"
            className={cn(
              'p-8 rounded-neo',
              // Cream edge, not black: a black border on navy measures 1.23:1,
              // so the prompt card had no visible edge at all.
              'bg-neo-navy-light edu-sky:bg-edu-surface border-[3px] border-neo-cream edu-sky:border-edu-line',
              'shadow-hard-cyan-xl edu-sky:shadow-edu-lip',
              'min-h-[120px] flex items-center justify-center'
            )}
          >
            <p className="font-neo-body text-neo-white edu-sky:text-edu-ink text-2xl text-center">
              {/*
                A word with no definition is not a broken round — Spelling's
                prompt is the audio. "No words to practice" over a live 8-word
                drill read as a failure that had not happened.
              */}
              {currentWord?.definition || t('student.practiceFun.listenAndSpell')}
            </p>
            <WordContextRow
              partOfSpeech={(sortedWords[wordIndex] as Partial<EnrichedVocabularyWord>)?.partOfSpeech}
              example={(sortedWords[wordIndex] as Partial<EnrichedVocabularyWord>)?.examples?.[0]?.text}
            />
          </AdaptiveMotion.div>
        </AdaptiveAnimatePresence>
        </div>

        {/* Hint display */}
        <div
          data-testid="hint-display"
          className="flex flex-col items-center gap-3"
        >
          {/*
            Blanks come from the SORTED list. Reading the unsorted prop here
            counted the slots off a different word entirely, and the optional
            chain stopped one level too early: an entry with no `word` threw
            and took the whole round down with it.
          */}
          <div ref={tilesRef} className="relative flex w-full justify-center">
            {/* A right answer sends a "+1 star" up toward the trail. */}
            {feedback?.correct && (
              <span
                aria-hidden="true"
                data-testid="spelling-fly-up"
                style={candyKey('gold', 3)}
                className="pointer-events-none absolute -top-2 left-1/2 z-10 flex items-center motion-reduce:hidden gap-1 rounded-full px-2.5 py-1 font-neo-display text-base font-black text-neo-navy motion-safe:animate-[lc-fly-up_900ms_cubic-bezier(.2,.8,.3,1)_both]"
              >
                +1
                <Star className="size-4 fill-neo-navy" strokeWidth={2.5} />
              </span>
            )}
            <SpellingTiles
              length={sortedWords[wordIndex]?.word?.length ?? 0}
              hint={currentHint}
              typed={inputValue}
              state={feedback ? (feedback.correct ? 'correct' : 'wrong') : 'typing'}
              answer={feedback?.correctWord}
            />
          </div>
          <div className="flex items-center justify-center gap-3">
          {sortedWords[wordIndex] && (
            <PronunciationButton
              word={sortedWords[wordIndex].word}
              lang={language}
              size="sm"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sfx.hint();
              getHint();
            }}
            disabled={!!feedback || isComplete || hintSpent}
            data-testid="hint-button"
            style={candyKey('gold')}
            className="size-11 rounded-full p-0 text-neo-navy hover:bg-transparent hover:text-neo-navy hover:brightness-105 active:translate-y-0.5 disabled:opacity-40"
          >
            <Lightbulb className="w-5 h-5" strokeWidth={2.5} />
          </Button>
          </div>
        </div>

        <div data-testid="spelling-answer-zone" className="relative min-h-[152px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setTypingTick((n) => n + 1);
            }}
            disabled={!!feedback || isComplete}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-testid="spelling-input"
            aria-label={t('education.practice.spellTheWord')}
            className={cn(
              'px-6 py-3.5 rounded-neo text-center',
              'border-[4px] border-neo-black',
              'bg-neo-cream text-neo-black',
              'font-neo-display text-2xl font-black tracking-[0.12em] placeholder:font-neo-body placeholder:text-lg placeholder:font-normal placeholder:tracking-normal',
              'shadow-hard-lime',
              'focus:outline-hidden focus:ring-4 focus:ring-neo-purple',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity]'
            )}
            placeholder={t('education.practice.typeWord')}
          />
          <button
            type="submit"
            disabled={!!feedback || isComplete || !inputValue.trim()}
            className={cn(
              'px-6 py-4 rounded-neo',
              // Lime + black, the same primary the picker's PLAY uses. White on
              // neo-purple measures 4.23:1 — under AA — and dropped further the
              // moment `disabled:opacity-50` faded the label with the fill.
              'bg-neo-lime hover:bg-neo-lime/90',
              'border-[3px] border-black',
              // A chunky key with a real press: a deep ink lip that the button sinks into.
              'shadow-[0_6px_0_0_#0b1530,inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-5px_0_rgba(0,0,0,0.18)]',
              'active:translate-y-[5px] active:shadow-[0_1px_0_0_#0b1530]',
              'font-neo-display text-black text-2xl font-black uppercase tracking-wide',
              // Disabled drains the FILL and keeps a readable label and a
              // visible edge, instead of fading the whole control.
              'disabled:bg-neo-navy-light edu-sky:disabled:bg-edu-tile disabled:text-neo-cream edu-sky:disabled:text-edu-ink disabled:border-neo-cream edu-sky:disabled:border-edu-line',
              'disabled:shadow-none disabled:cursor-not-allowed',
              'transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity]'
            )}
          >
            {t('education.practice.submit')}
          </button>
        </form>
        {feedback && (
          <div
            data-testid="feedback-display"
            role="status"
            className={cn(
              'absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-neo border-[3px] border-neo-black p-2 text-center shadow-hard-lg sm:gap-2 sm:p-3',
              'motion-safe:animate-[lc-verdict-in_260ms_cubic-bezier(.34,1.56,.64,1)]',
              feedback.correct ? 'bg-neo-lime text-neo-black' : 'bg-neo-pink text-neo-black motion-safe:animate-neo-shake'
            )}
          >
            <style>{'@keyframes lc-verdict-in{0%{transform:scale(.85) rotate(-2deg)}100%{transform:scale(1) rotate(0)}}@keyframes lc-rays{to{transform:rotate(360deg)}}'}</style>
            {/* Sunburst behind a right answer: slow spin, still for reduced motion. */}
            {feedback.correct && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[180%] -translate-x-1/2 -translate-y-1/2 opacity-40"
              >
                <span
                  className="block size-full rounded-full motion-safe:animate-[lc-rays_9s_linear_infinite]"
                  style={{ background: 'repeating-conic-gradient(from 0deg, #ffffff 0deg 10deg, transparent 10deg 24deg)' }}
                />
              </span>
            )}
            <p className="flex items-center gap-2 font-neo-display text-xl font-black uppercase sm:text-2xl">
              {feedback.correct ? <Check className="size-7" strokeWidth={3.5} /> : <X className="size-7" strokeWidth={3.5} />}
              {feedback.correct ? praise : t('education.practice.incorrect')}
            </p>
            {feedback.correct ? (
              <p className="font-neo-display text-xl font-black tracking-wider" dir="auto">{feedback.correctWord}</p>
            ) : (
              <>
                {/* Their spelling, struck through, on the same row as the right one: the card has no room for another line. */}
                <p className="flex flex-wrap items-baseline justify-center gap-2 font-neo-body text-sm font-bold">
                  {feedback.attempt ? (
                    <span data-testid="feedback-attempt">
                      <span className="sr-only">{t('eduStudent.practice.youWrote')} </span>
                      <s dir="auto" className="font-neo-display text-base font-black tracking-[0.1em] decoration-[3px] opacity-80">{feedback.attempt.length > 16 ? `${feedback.attempt.slice(0, 16)}…` : feedback.attempt}</s>
                    </span>
                  ) : null}
                  <span>{t('eduStudent.practice.answerIs')}</span>
                  <span dir="auto" className="rounded-neo border-[3px] border-neo-black bg-neo-cream px-2 py-0.5 font-neo-display text-xl font-black tracking-[0.15em] text-neo-black shadow-hard-sm sm:text-2xl">
                    {feedback.correctWord}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={handleNext}
                  autoFocus
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-neo border-[3px] border-neo-black bg-neo-navy edu-sky:bg-edu-surface px-4 py-1.5 font-neo-display text-base font-black uppercase text-neo-lime edu-sky:text-edu-lime-ink shadow-hard transition-transform active:translate-y-0.5 active:shadow-none sm:mt-1 sm:px-5 sm:py-2 sm:text-lg"
                >
                  {wordIndex + 1 >= totalWords ? t('eduStudent.practice.finish') : t('eduStudent.practice.next')}
                  <DirectionalIcon icon={ArrowRight} className="size-5" />
                </button>
              </>
            )}
          </div>
        )}
        </div>
        <p className="hidden text-center font-neo-body text-sm font-bold text-neo-cream/70 edu-sky:text-edu-ink/70 @3xl:block">
          {t('eduStudent.practice.enterHint')}
        </p>
      </div>
      <PracticeBuddy
        reaction={buddyReaction}
        typing={inputValue.length > 0 && !feedback}
        typingTick={typingTick}
        className="hidden size-60 @3xl:flex"
      />
      </div>
    </div>
  );
}

const PLAY_KEYFRAMES =
  '@keyframes lc-fly-up{0%{transform:translate(-50%,0) scale(.5);opacity:0}20%{transform:translate(-50%,-14px) scale(1.15);opacity:1}100%{transform:translate(-50%,-150px) scale(.8);opacity:0}}';

export default SpellingChallengePractice;
