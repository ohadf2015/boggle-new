'use client';

/**
 * ProducePractice — the student is given a meaning and TYPES the word.
 *
 * Every other vocabulary surface here shows four options. This one shows none.
 * That is the entire point: retrieval practice benefits recall and production,
 * and shows no reliable benefit over plain restudy on recognition tasks, so a
 * drill built entirely from four-choice questions teaches choosing between four
 * things. Producing the word from its meaning is the half that was missing.
 *
 * Three design commitments, each of which has a test naming it:
 *
 *  - NO CHOICES, and the answer is never in the DOM before the student commits.
 *    A word sitting in the markup is a word that can be read off the page.
 *  - AN EXPOSURE BEAT before a word's first ask. Cold retrieval of a word never
 *    met is not practice, it is a blank. New words come as a block, each
 *    introduced, before any review word is mixed in (see buildProduceQuestions).
 *  - A HINT LADDER that costs points but never zeroes them. Scaffolded
 *    retrieval is the mechanism; if hints could reduce a correct answer to
 *    nothing, the rational move would be to guess instead of ask.
 *
 * Scoring carries no time term at all — see `produceScore`.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { ArrowLeft, BookOpen, Sparkles, ArrowLeftRight, Quote, Lightbulb } from 'lucide-react';
import PracticeResultsCard from './PracticeResultsCard';
import { usePracticeSfx } from '@/components/education/practice/usePracticeSfx';
import { BLANK } from '@/lib/education/vocabFocus';
import {
  buildProduceQuestions,
  PRODUCE_DEFAULT_QUESTION_COUNT,
  type ProduceFocus,
} from '@/lib/education/produceQuestions';
import {
  checkProducedAnswer,
  produceScore,
  produceHint,
  type ProduceVerdict,
} from '@/lib/education/produceAnswer';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { Language } from '@/shared/types/game';

export interface ProduceResults {
  correct: number;
  nearMisses: number;
  total: number;
  accuracy: number;
  points: number;
  hintsUsed: number;
  focus: ProduceFocus;
}

export interface ProducePracticeProps {
  words: VocabularyWord[];
  focus: ProduceFocus;
  onComplete: (results: ProduceResults) => void;
  onBack: () => void;
  /** Words this student has produced before — they skip the exposure beat. */
  knownWords?: readonly string[];
  questionCount?: number;
  seed?: number | string;
  language?: Language;
  onNext?: () => void;
  nextLabel?: string;
}

/** Accent per cue. Black label on an accent fill is the combination that passes. */
const FOCUS_STYLE: Record<ProduceFocus, { bg: string; icon: React.ReactNode }> = {
  definition: { bg: 'bg-neo-cyan', icon: <BookOpen className="w-5 h-5" /> },
  synonym: { bg: 'bg-neo-lime', icon: <Sparkles className="w-5 h-5" /> },
  antonym: { bg: 'bg-neo-pink', icon: <ArrowLeftRight className="w-5 h-5" /> },
  context: { bg: 'bg-neo-yellow', icon: <Quote className="w-5 h-5" /> },
};

const VERDICT_STYLE: Record<ProduceVerdict, string> = {
  correct: 'bg-neo-lime text-neo-black',
  'near-miss': 'bg-neo-yellow text-neo-black',
  wrong: 'bg-neo-red text-neo-white',
};

export function ProducePractice({
  words,
  focus,
  onComplete,
  onBack,
  knownWords,
  questionCount = PRODUCE_DEFAULT_QUESTION_COUNT,
  seed,
  language = 'en',
  onNext,
  nextLabel,
}: ProducePracticeProps) {
  const { t, dir } = useLanguage();
  const sfx = usePracticeSfx();
  const isRTL = dir === 'rtl';

  const [round, setRound] = useState(0);
  const [baseSeed] = useState<number | string>(() => seed ?? Date.now());
  const questions = useMemo(
    () =>
      buildProduceQuestions(words, focus, {
        count: questionCount,
        seed: round === 0 ? baseSeed : `${baseSeed}-${round}`,
        knownWords,
        language,
      }),
    [words, focus, questionCount, baseSeed, round, knownWords, language]
  );

  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [verdict, setVerdict] = useState<ProduceVerdict | null>(null);
  // How many rungs the student has ASKED for on this question. Zero means no
  // hint is on screen: the ladder must never hand out its first rung for free,
  // or every answer is scored as unaided while the length was already showing.
  const [hintsTaken, setHintsTaken] = useState(0);
  const [exposureCleared, setExposureCleared] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [nearMissCount, setNearMissCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [hintsTotal, setHintsTotal] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    if (startedAt.current === null) startedAt.current = Date.now();
  }, []);

  const total = questions.length;
  const question = questions[index];
  const isLast = index === total - 1;

  // The other words on the teacher's list, so a one-letter slip can never be
  // forgiven into a DIFFERENT word the class is also learning.
  const otherWords = useMemo(
    () => questions.filter((q) => q.word !== question?.word).map((q) => q.word),
    [questions, question]
  );

  const needsExposure = !!question?.firstExposure && !exposureCleared;
  // `hint` is the rung currently displayed (none until one is asked for);
  // `nextHint` is what the next tap would reveal, and its absence ends the ladder.
  const hint = question && hintsTaken > 0 ? produceHint(question.word, hintsTaken - 1, language) : null;
  const nextHint = question ? produceHint(question.word, hintsTaken, language) : null;

  const handleSubmit = useCallback(() => {
    if (!question || verdict !== null) return;
    const result = checkProducedAnswer(typed, question.word, { language, otherWords });
    setVerdict(result);
    const earned = produceScore(result, hintsTaken);
    setPoints((p) => p + earned);
    if (result === 'correct') {
      sfx.correct();
      setCorrectCount((c) => c + 1);
    } else if (result === 'near-miss') {
      setNearMissCount((n) => n + 1);
    } else {
      sfx.wrong();
    }
  }, [question, verdict, typed, language, otherWords, hintsTaken, sfx]);

  const handleHint = useCallback(() => {
    if (!question || verdict !== null) return;
    if (!produceHint(question.word, hintsTaken, language)) return;
    setHintsTaken((h) => h + 1);
    setHintsTotal((h) => h + 1);
  }, [question, verdict, hintsTaken, language]);

  const handleNext = useCallback(() => {
    if (verdict === null) return;
    if (isLast) {
      const seconds = Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000);
      setTimeSpent(seconds);
      setShowResults(true);
      onComplete({
        correct: correctCount,
        nearMisses: nearMissCount,
        total,
        accuracy: total ? correctCount / total : 0,
        points,
        hintsUsed: hintsTotal,
        focus,
      });
      return;
    }
    sfx.advance();
    setIndex((i) => i + 1);
    setTyped('');
    setVerdict(null);
    setHintsTaken(0);
    setExposureCleared(false);
  }, [verdict, isLast, correctCount, nearMissCount, total, points, hintsTotal, focus, onComplete, sfx]);

  const handleRestart = useCallback(() => {
    setRound((r) => r + 1);
    setIndex(0);
    setTyped('');
    setVerdict(null);
    setHintsTaken(0);
    setExposureCleared(false);
    setCorrectCount(0);
    setNearMissCount(0);
    setPoints(0);
    setHintsTotal(0);
    setShowResults(false);
    setTimeSpent(0);
    startedAt.current = Date.now();
  }, []);

  const style = FOCUS_STYLE[focus] ?? FOCUS_STYLE.definition;

  if (total === 0) {
    return (
      <div
        data-testid="produce-empty"
        className="min-h-full bg-neo-navy flex items-center justify-center p-4"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="max-w-md w-full rounded-neo border-[3px] border-black shadow-hard bg-neo-cream p-6 text-center">
          <h2 className="text-2xl font-neo-display text-neo-black mb-2">
            {t('education.produce.title')}
          </h2>
          <p className="font-neo-body text-neo-black/80 mb-6 text-pretty">
            {t(`education.produce.notEnough.${focus}`)}
          </p>
          <Button
            onClick={onBack}
            aria-label={t('common.back')}
            className="min-h-12 bg-neo-cyan text-neo-black font-neo-display border-[3px] border-black shadow-hard hover:shadow-hard-lg"
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
      <PracticeResultsCard
        correct={correctCount}
        total={total}
        timeSpent={timeSpent}
        hintsUsed={hintsTotal}
        onRestart={handleRestart}
        onBack={onBack}
        onNext={onNext}
        nextLabel={nextLabel}
      />
    );
  }

  return (
    <div className="min-h-full bg-neo-navy p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-xl mx-auto">
        {/* Header: cue type + progress */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            onClick={onBack}
            aria-label={t('common.back')}
            className="min-h-11 min-w-11 bg-neo-cream text-neo-black border-[3px] border-black shadow-hard"
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
          </Button>
          <span
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-neo border-[3px] border-black shadow-hard font-neo-display text-neo-black',
              style.bg
            )}
          >
            {style.icon}
            {t(`education.produce.cue.${focus}`)}
          </span>
          <span className="ms-auto font-neo-body text-neo-cream" data-testid="produce-progress">
            {index + 1} / {total}
          </span>
        </div>

        {needsExposure ? (
          /* ---- Exposure beat: meet the word before being asked for it ---- */
          <div
            data-testid="produce-exposure"
            className="rounded-neo border-[3px] border-black shadow-hard bg-neo-cream p-6 text-center"
          >
            <p className="font-neo-body text-neo-black/70 mb-2">
              {t('education.produce.newWord')}
            </p>
            <p className="text-3xl font-neo-display text-neo-black mb-3">{question.word}</p>
            {question.definition && (
              <p className="font-neo-body text-neo-black/80 mb-6 text-pretty">
                {question.definition}
              </p>
            )}
            <Button
              data-testid="produce-exposure-continue"
              onClick={() => setExposureCleared(true)}
              className="min-h-12 w-full bg-neo-lime text-neo-black font-neo-display border-[3px] border-black shadow-hard hover:shadow-hard-lg"
            >
              {t('education.produce.gotIt')}
            </Button>
          </div>
        ) : (
          <>
            {/* ---- The cue ---- */}
            <div className="rounded-neo border-[3px] border-black shadow-hard bg-neo-cream p-6 mb-4">
              <p className="text-xl font-neo-body text-neo-black text-pretty">
                {question.prompt.split(BLANK).map((part, i, all) => (
                  <span key={i}>
                    {part}
                    {i < all.length - 1 && (
                      <span className="inline-block min-w-[3ch] border-b-4 border-neo-black align-baseline">
                        {BLANK}
                      </span>
                    )}
                  </span>
                ))}
              </p>
            </div>

            {/* ---- Hint ladder ---- */}
            <div className="flex items-center gap-3 mb-4">
              <Button
                data-testid="produce-hint"
                onClick={handleHint}
                disabled={verdict !== null || !nextHint}
                aria-label={t('education.produce.hint')}
                className="min-h-11 bg-neo-yellow text-neo-black font-neo-display border-[3px] border-black shadow-hard disabled:opacity-50"
              >
                <Lightbulb className="w-5 h-5 me-2" />
                {t('education.produce.hint')}
              </Button>
              {hint && (
                <span
                  data-testid="produce-hint-display"
                  className="font-neo-display text-neo-cream tracking-widest"
                >
                  {hint.kind === 'length'
                    ? t('education.produce.hintLength', '{count} letters', { count: hint.length })
                    : hint.revealed}
                </span>
              )}
            </div>

            {/* ---- The answer box ---- */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <input
                data-testid="produce-input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={verdict !== null}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label={t('education.produce.inputLabel')}
                placeholder={t('education.produce.placeholder')}
                className="w-full min-h-14 px-4 text-2xl font-neo-display text-neo-black bg-neo-white rounded-neo border-[3px] border-black shadow-hard focus:outline-none focus:shadow-hard-lg"
              />
              {verdict === null && (
                <Button
                  data-testid="produce-submit"
                  type="submit"
                  className="mt-4 min-h-12 w-full bg-neo-lime text-neo-black font-neo-display border-[3px] border-black shadow-hard hover:shadow-hard-lg"
                >
                  {t('education.produce.check')}
                </Button>
              )}
            </form>

            {/* ---- Verdict ---- */}
            {verdict !== null && (
              <div className="mt-4">
                <div
                  data-testid="produce-verdict"
                  className={cn(
                    'rounded-neo border-[3px] border-black shadow-hard p-4 font-neo-display text-center',
                    VERDICT_STYLE[verdict]
                  )}
                >
                  {verdict}
                  <span className="sr-only">{t(`education.produce.verdict.${verdict}`)}</span>
                </div>
                {verdict !== 'correct' && (
                  <p className="mt-3 text-center font-neo-body text-neo-cream">
                    {t('education.produce.theWordWas')}{' '}
                    <strong data-testid="produce-correct-spelling" className="font-neo-display">
                      {question.word}
                    </strong>
                  </p>
                )}
                <Button
                  data-testid="produce-next"
                  onClick={handleNext}
                  className="mt-4 min-h-12 w-full bg-neo-cyan text-neo-black font-neo-display border-[3px] border-black shadow-hard hover:shadow-hard-lg"
                >
                  {isLast ? t('education.produce.finish') : t('common.next')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProducePractice;
