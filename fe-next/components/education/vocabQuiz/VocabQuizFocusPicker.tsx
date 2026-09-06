/**
 * Live Vocab Quiz — the teacher's focus picker.
 *
 * The whole point of this control is the NUMBER on each chip. As of 2026-09-05
 * every real lesson in the database has definitions and nothing else: 124 of
 * 133 words carry a definition, and not one carries a synonym, antonym or
 * example sentence. A picker that silently offered all four skills would let a
 * teacher pick "synonyms", press start in front of a class, and get a
 * definition round with no explanation.
 *
 * So each focus shows how many questions it can actually build from THIS
 * lesson, an unavailable focus is disabled rather than hidden, and the helper
 * text says where to add the missing data — not merely that it is missing.
 */

'use client';

import { useMemo } from 'react';
import {
  BookOpen, ArrowLeftRight, Split, AlignLeft, Shuffle, Timer, ListOrdered, Layers, Puzzle, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { focusAvailability } from '@/lib/education/vocabQuizQuestions';
import { VOCAB_FOCUSES } from '@/lib/education/vocabFocus';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  VOCAB_QUIZ_MIN_QUESTION_COUNT,
  VOCAB_QUIZ_DEFAULT_QUESTION_COUNT,
  type PracticeFocusSetting,
  type VocabFocus,
  type TranslateFn,
} from '@/shared/types/vocabQuiz';

/**
 * Icons per focus. The LIST of focuses comes from `VOCAB_FOCUSES` rather than
 * being hardcoded here: another skill added to the shared question builder must
 * show up as a chip with a real count, not silently vanish from the picker
 * while still counting toward the "some skills are locked" hint.
 */
const FOCUS_ICONS: Partial<Record<VocabFocus, typeof BookOpen>> = {
  definition: BookOpen,
  synonym: ArrowLeftRight,
  antonym: Split,
  context: AlignLeft,
  multiple_meaning: Layers,
  roots_affixes: Puzzle,
};

const FOCUS_CHIPS: { key: VocabFocus; icon: typeof BookOpen }[] = VOCAB_FOCUSES.map((key) => ({
  key,
  icon: FOCUS_ICONS[key] ?? HelpCircle,
}));

const QUESTION_COUNTS = [5, 10, 15, 20] as const;
const SECONDS_CHOICES = [10, 20, 30, 45] as const;

export interface VocabQuizFocusPickerProps {
  /** The teacher's selected lesson words, with whatever per-word data they hold. */
  words: VocabularyWord[];
  /**
   * The lesson's language. The server builds with it too, so passing it keeps
   * the counts the teacher sees identical to the round they actually get.
   */
  language?: string;
  focus: PracticeFocusSetting;
  questionCount: number;
  secondsPerQuestion: number;
  onFocusChange: (focus: PracticeFocusSetting) => void;
  onQuestionCountChange: (count: number) => void;
  onSecondsChange: (seconds: number) => void;
  t: TranslateFn;
}

export function VocabQuizFocusPicker({
  words,
  language,
  focus,
  questionCount,
  secondsPerQuestion,
  onFocusChange,
  onQuestionCountChange,
  onSecondsChange,
  t,
}: VocabQuizFocusPickerProps) {
  const availability = useMemo(() => focusAvailability(words, { language }), [words, language]);
  const anyCount = useMemo(
    () => Object.values(availability).reduce((sum, n) => sum + n, 0),
    [availability]
  );
  const bestSingle = useMemo(() => Math.max(...Object.values(availability), 0), [availability]);

  // What the round will really be: the chosen focus if it can fill one, else
  // the definition fallback the engine applies.
  const plannedCount =
    focus === 'any' ? Math.min(questionCount, anyCount) : Math.min(questionCount, availability[focus] || availability.definition || 0);

  const chipClass = (selected: boolean, enabled: boolean) =>
    cn(
      'flex flex-col items-start gap-1 px-4 py-3 rounded-neo border-neo border-neo-black transition-all text-start',
      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
      !enabled && 'opacity-45 cursor-not-allowed',
      selected && enabled
        ? 'bg-neo-cyan text-neo-black shadow-hard'
        : 'bg-neo-navy/50 text-neo-white shadow-hard-sm',
      enabled && !selected && 'hover:bg-neo-navy'
    );

  return (
    <div className="space-y-6">
      <div>
        <div id="vocab-quiz-focus-label" className="block text-neo-white font-bold mb-1">
          {t('vocabQuiz.setup.focusTitle')}
        </div>
        <p className="text-sm text-neo-white/70 font-neo-body mb-3">
          {t('vocabQuiz.setup.focusDescription')}
        </p>

        <div role="radiogroup" aria-labelledby="vocab-quiz-focus-label" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <button
            type="button"
            role="radio"
            aria-checked={focus === 'any'}
            disabled={anyCount === 0}
            onClick={() => onFocusChange('any')}
            className={chipClass(focus === 'any', anyCount > 0)}
          >
            <span className="flex items-center gap-2 font-bold text-sm">
              <Shuffle className="w-5 h-5" aria-hidden />
              {t('vocabQuiz.focus.any')}
            </span>
            <span className="text-xs opacity-80">
              {t('vocabQuiz.setup.questionsAvailable', { count: anyCount })}
            </span>
          </button>

          {FOCUS_CHIPS.map(({ key, icon: Icon }) => {
            const count = availability[key];
            const enabled = count > 0;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={focus === key}
                disabled={!enabled}
                onClick={() => onFocusChange(key)}
                className={chipClass(focus === key, enabled)}
              >
                <span className="flex items-center gap-2 font-bold text-sm">
                  <Icon className="w-5 h-5" aria-hidden />
                  {t(`vocabQuiz.focus.${key}`)}
                </span>
                <span className="text-xs opacity-80">
                  {enabled
                    ? t('vocabQuiz.setup.questionsAvailable', { count })
                    : t('vocabQuiz.setup.focusLocked')}
                </span>
              </button>
            );
          })}
        </div>

        {/* The one message that matters most with today's lesson data: WHERE to
            add what is missing, not just that it is missing. */}
        {bestSingle === 0 ? (
          <p className="mt-3 p-3 rounded-neo border border-neo-red/40 bg-neo-red/10 text-neo-white font-neo-body text-sm">
            {t('vocabQuiz.setup.noQuestions')}
          </p>
        ) : (
          Object.values(availability).some((n) => n === 0) && (
            <p className="mt-3 p-3 rounded-neo border border-neo-cyan/30 bg-neo-cyan/10 text-neo-white font-neo-body text-sm">
              {t('vocabQuiz.setup.enrichHint')}
            </p>
          )
        )}
      </div>

      <div>
        <div id="vocab-quiz-count-label" className="block text-neo-white font-bold mb-3">
          <ListOrdered className="w-5 h-5 inline me-2 text-neo-lime" />
          {t('vocabQuiz.setup.questionCount')}
        </div>
        <div role="radiogroup" aria-labelledby="vocab-quiz-count-label" className="grid grid-cols-4 gap-3">
          {QUESTION_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              role="radio"
              aria-checked={questionCount === count}
              onClick={() => onQuestionCountChange(count)}
              className={cn(
                'px-4 py-3 font-bold rounded-neo border-neo border-neo-black transition-all',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2',
                questionCount === count
                  ? 'bg-neo-lime text-neo-black shadow-hard'
                  : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
              )}
            >
              {count}
            </button>
          ))}
        </div>
        {plannedCount > 0 && plannedCount < questionCount && (
          <p className="mt-2 text-sm text-neo-white/70 font-neo-body">
            {t('vocabQuiz.setup.cappedNotice', { count: plannedCount })}
          </p>
        )}
      </div>

      <div>
        <div id="vocab-quiz-seconds-label" className="block text-neo-white font-bold mb-3">
          <Timer className="w-5 h-5 inline me-2 text-neo-pink" />
          {t('vocabQuiz.setup.secondsPerQuestion')}
        </div>
        <div role="radiogroup" aria-labelledby="vocab-quiz-seconds-label" className="grid grid-cols-4 gap-3">
          {SECONDS_CHOICES.map((seconds) => (
            <button
              key={seconds}
              type="button"
              role="radio"
              aria-checked={secondsPerQuestion === seconds}
              onClick={() => onSecondsChange(seconds)}
              className={cn(
                'px-4 py-3 font-bold rounded-neo border-neo border-neo-black transition-all',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-pink focus-visible:ring-offset-2',
                secondsPerQuestion === seconds
                  ? 'bg-neo-pink text-neo-white shadow-hard'
                  : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
              )}
            >
              {t('vocabQuiz.setup.seconds', { seconds })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { VOCAB_QUIZ_MIN_QUESTION_COUNT, VOCAB_QUIZ_DEFAULT_QUESTION_COUNT };
export default VocabQuizFocusPicker;
