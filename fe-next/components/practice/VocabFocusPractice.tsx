'use client';

/**
 * VocabFocusPractice — targeted vocabulary practice.
 *
 * One 4-choice question at a time for a single skill the teacher (or the
 * student) picked: definition matching, synonyms, antonyms or context clues.
 * Immediate feedback after every tap, a progress bar, and the shared
 * PracticeResultsCard at the end. Question sets come from
 * `lib/education/vocabFocus` and are deterministic per seed.
 */

import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { ArrowLeft, Check, X, BookOpen, Sparkles, ArrowLeftRight, Quote, Layers, Blocks } from 'lucide-react';
import PracticeResultsCard from './PracticeResultsCard';
import {
  buildFocusQuestions,
  BLANK,
  DEFAULT_QUESTION_COUNT,
  type VocabFocus,
} from '@/lib/education/vocabFocus';
import type { VocabularyWord } from '@/lib/supabase/education/types';

export interface VocabFocusResults {
  correct: number;
  total: number;
  accuracy: number;
  focus: VocabFocus;
}

export interface VocabFocusPracticeProps {
  words: VocabularyWord[];
  focus: VocabFocus;
  onComplete: (results: VocabFocusResults) => void;
  onBack: () => void;
  /** XP session data to display on results screen (optional) */
  xpSessionData?: {
    sessionXpEarned: number;
    sessionMasteryMessage: string | null;
  };
  /** Questions per round (capped at the number of usable words). */
  questionCount?: number;
  /** Fixed seed for a reproducible question set (tests). Defaults to the clock. */
  seed?: number | string;
  /**
   * Lesson language. Only English lessons top thin distractor pools up from the
   * built-in banks, so pass it through or those questions never build.
   */
  language?: string;
}

const FOCUS_STYLE: Record<VocabFocus, { bg: string; icon: React.ReactNode }> = {
  definition: { bg: 'bg-neo-cyan', icon: <BookOpen className="w-5 h-5" /> },
  synonym: { bg: 'bg-neo-lime', icon: <Sparkles className="w-5 h-5" /> },
  antonym: { bg: 'bg-neo-pink', icon: <ArrowLeftRight className="w-5 h-5" /> },
  context: { bg: 'bg-neo-yellow', icon: <Quote className="w-5 h-5" /> },
  multiple_meaning: { bg: 'bg-neo-purple', icon: <Layers className="w-5 h-5" /> },
  roots_affixes: { bg: 'bg-neo-cyan', icon: <Blocks className="w-5 h-5" /> },
};

const DEFAULT_FOCUS_STYLE = FOCUS_STYLE.definition;

/** Focuses whose prompt is a phrase or a sentence, not a single word. */
const LONG_PROMPT_FOCUSES: readonly VocabFocus[] = ['definition', 'context', 'multiple_meaning'];

/** Render a prompt, drawing the `___` blank as a chunky underline. */
function PromptText({ text }: { text: string }) {
  if (!text.includes(BLANK)) return <>{text}</>;
  const parts = text.split(BLANK);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="inline-block min-w-[3ch] border-b-4 border-neo-black align-baseline">{BLANK}</span>
          )}
        </Fragment>
      ))}
    </>
  );
}

export function VocabFocusPractice({
  words,
  focus,
  onComplete,
  onBack,
  xpSessionData,
  questionCount = DEFAULT_QUESTION_COUNT,
  seed,
  language,
}: VocabFocusPracticeProps) {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  const [round, setRound] = useState(0);
  const [baseSeed] = useState<number | string>(() => seed ?? Date.now());
  const questions = useMemo(
    // First round uses the seed as given (reproducible); restarts reseed.
    () => buildFocusQuestions(words, focus, {
      count: questionCount,
      seed: round === 0 ? baseSeed : `${baseSeed}-${round}`,
      language,
    }),
    [words, focus, questionCount, baseSeed, round, language]
  );

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  // Session clock — set in an effect so render stays pure (react-hooks/purity)
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    if (startedAt.current === null) startedAt.current = Date.now();
  }, []);

  const total = questions.length;
  const question = questions[index];
  const isLast = index === total - 1;
  const answered = selected !== null;
  const wasCorrect = answered && selected === question?.answerIndex;

  const handleChoose = useCallback(
    (choiceIndex: number) => {
      if (answered || !question) return;
      setSelected(choiceIndex);
      if (choiceIndex === question.answerIndex) setCorrectCount((c) => c + 1);
    },
    [answered, question]
  );

  const handleNext = useCallback(() => {
    if (!answered) return;
    if (isLast) {
      const seconds = Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000);
      setTimeSpent(seconds);
      setShowResults(true);
      onComplete({ correct: correctCount, total, accuracy: total ? correctCount / total : 0, focus });
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }, [answered, isLast, correctCount, total, focus, onComplete]);

  const handleRestart = useCallback(() => {
    setRound((r) => r + 1);
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setShowResults(false);
    setTimeSpent(0);
    startedAt.current = Date.now();
  }, []);

  const style = FOCUS_STYLE[focus] ?? DEFAULT_FOCUS_STYLE;

  // Not enough teacher data for this focus
  if (total === 0) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full rounded-neo border-3 border-black shadow-hard bg-neo-cream p-6 text-center">
          <h2 className="text-2xl font-neo-display text-neo-black mb-2">{t(`education.vocabFocus.focus.${focus}`)}</h2>
          <p className="font-neo-body text-neo-black/80 mb-6 text-pretty">{t(`education.vocabFocus.notEnough.${focus}`)}</p>
          <Button
            onClick={onBack}
            aria-label={t('common.back')}
            className="min-h-12 bg-neo-cyan text-neo-black font-neo-display border-3 border-black shadow-hard hover:shadow-hard-lg"
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5 me-2" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <PracticeResultsCard
          correct={correctCount}
          total={total}
          xpEarned={xpSessionData?.sessionXpEarned}
          masteryMessage={xpSessionData?.sessionMasteryMessage ?? undefined}
          timeSpent={timeSpent}
          onRestart={handleRestart}
          onBack={onBack}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-navy p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label={t('common.back')}
            className="text-neo-white hover:text-neo-white hover:bg-neo-white/10 min-h-11 min-w-11"
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex items-center justify-center w-8 h-8 rounded-neo border-2 border-black text-neo-black', style.bg)}>
                {style.icon}
              </span>
              <h2 className="text-xl font-neo-display text-neo-white truncate">
                {t(`education.vocabFocus.focus.${focus}`)}
              </h2>
            </div>
            <p className="text-sm font-neo-body text-neo-white/80">{t(`education.vocabFocus.instructions.${focus}`)}</p>
          </div>
          <span className="text-sm font-neo-display text-neo-white tabular-nums shrink-0">
            {t('education.vocabFocus.progress', { current: index + 1, total })}
          </span>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-label={t('education.vocabFocus.progressLabel')}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index}
          className="h-3 w-full rounded-neo border-2 border-black bg-neo-black/30 overflow-hidden mb-6"
        >
          <AdaptiveMotion.div
            className={cn('h-full', style.bg)}
            animate={{ width: `${(index / total) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Prompt */}
        <div
          key={`prompt-${round}-${index}`}
          className={cn('rounded-neo border-3 border-black shadow-hard p-6 mb-4', style.bg)}
        >
          <p className="text-xs font-neo-body font-bold uppercase tracking-wide text-neo-black/60 mb-2">
            {t(`education.vocabFocus.promptLabel.${focus}`)}
          </p>
          <p
            data-testid="focus-prompt"
            className={cn(
              'font-neo-display text-neo-black text-balance',
              LONG_PROMPT_FOCUSES.includes(focus) ? 'text-xl sm:text-2xl leading-snug' : 'text-3xl sm:text-4xl'
            )}
          >
            <PromptText text={question.prompt} />
          </p>
        </div>

        {/* Choices */}
        <div data-testid="focus-choices" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.choices.map((choice, i) => {
            const state = !answered
              ? 'idle'
              : i === question.answerIndex
                ? 'correct'
                : i === selected
                  ? 'wrong'
                  : 'idle';
            return (
              <button
                key={`${round}-${index}-${i}`}
                type="button"
                onClick={() => handleChoose(i)}
                disabled={answered}
                data-state={state}
                className={cn(
                  'min-h-16 px-4 py-3 rounded-neo border-3 border-black font-neo-display text-lg text-start',
                  'transition-all shadow-hard active:shadow-hard-pressed active:translate-y-0.5',
                  'disabled:cursor-default',
                  state === 'idle' && 'bg-neo-cream text-neo-black hover:bg-neo-white',
                  state === 'idle' && answered && 'opacity-60',
                  state === 'correct' && 'bg-neo-lime text-neo-black animate-neo-pulse',
                  state === 'wrong' && 'bg-neo-pink text-neo-black animate-neo-shake'
                )}
              >
                <span className="flex items-center gap-2">
                  {state === 'correct' && <Check className="w-5 h-5 shrink-0" aria-hidden="true" />}
                  {state === 'wrong' && <X className="w-5 h-5 shrink-0" aria-hidden="true" />}
                  <span className="flex-1">{choice}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {answered && (
          <AdaptiveMotion.div
            data-testid="focus-feedback"
            data-result={wasCorrect ? 'correct' : 'wrong'}
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            className={cn(
              'mt-4 rounded-neo border-3 border-black shadow-hard p-4',
              wasCorrect ? 'bg-neo-lime' : 'bg-neo-pink'
            )}
          >
            <p className="font-neo-display text-xl text-neo-black flex items-center gap-2">
              {wasCorrect ? <Check className="w-6 h-6" aria-hidden="true" /> : <X className="w-6 h-6" aria-hidden="true" />}
              {wasCorrect ? t('education.vocabFocus.correct') : t('education.vocabFocus.wrong')}
            </p>
            {!wasCorrect && (
              <p className="font-neo-body font-bold text-neo-black mt-1">
                {t('education.vocabFocus.answerWas', { answer: question.answer })}
              </p>
            )}
            {question.definition && (
              <p className="font-neo-body text-neo-black/80 mt-1 text-pretty">
                <span className="font-bold">{question.word}</span>
                {' — '}
                <span>{question.definition}</span>
              </p>
            )}
            <Button
              onClick={handleNext}
              autoFocus
              className="mt-3 w-full min-h-12 bg-neo-black text-neo-white font-neo-display text-lg border-3 border-black shadow-hard hover:bg-neo-navy"
            >
              {isLast ? t('education.vocabFocus.finish') : t('education.vocabFocus.next')}
            </Button>
          </AdaptiveMotion.div>
        )}
      </div>
    </div>
  );
}

export default VocabFocusPractice;
