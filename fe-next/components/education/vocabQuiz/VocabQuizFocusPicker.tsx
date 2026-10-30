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
  BookOpen, ArrowLeftRight, Split, AlignLeft, Shuffle, Timer, ListOrdered, Layers, Puzzle, HelpCircle, Gift, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { focusAvailability } from '@/lib/education/vocabQuizQuestions';
import { VOCAB_FOCUSES } from '@/lib/education/vocabFocus';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { CALM_SELECTED, CALM_IDLE, CALM_FOCUS } from '../lobby/LobbyChoiceRow';
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
  treasureChestsEnabled?: boolean;
  onFocusChange: (focus: PracticeFocusSetting) => void;
  onQuestionCountChange: (count: number) => void;
  onSecondsChange: (seconds: number) => void;
  onTreasureChestsChange?: (enabled: boolean) => void;
  t: TranslateFn;
}

export function VocabQuizFocusPicker({
  words,
  language,
  focus,
  questionCount,
  secondsPerQuestion,
  treasureChestsEnabled,
  onFocusChange,
  onQuestionCountChange,
  onSecondsChange,
  onTreasureChestsChange,
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
      'flex min-w-0 flex-col items-start gap-1 rounded-neo border-2 px-3 py-2.5 text-start transition-colors',
      CALM_FOCUS,
      !enabled && 'cursor-not-allowed opacity-60',
      selected && enabled ? CALM_SELECTED : enabled ? CALM_IDLE : 'border-neo-cream/35 bg-transparent text-neo-cream'
    );

  return (
    <div className="space-y-6">
      <div>
        <div id="vocab-quiz-focus-label" className="mb-1 block font-neo-display text-base font-bold text-neo-cream">
          {t('vocabQuiz.setup.focusTitle')}
        </div>
        <p className="mb-3 font-neo-body text-sm text-neo-cream/70">
          {t('vocabQuiz.setup.focusDescription')}
        </p>

        <div role="radiogroup" aria-labelledby="vocab-quiz-focus-label" className="grid grid-cols-2 gap-2 @md:grid-cols-3 @3xl:grid-cols-4">
          <button
            type="button"
            role="radio"
            aria-checked={focus === 'any'}
            disabled={anyCount === 0}
            onClick={() => onFocusChange('any')}
            className={chipClass(focus === 'any', anyCount > 0)}
          >
            <span className="flex min-w-0 items-center gap-2 break-words font-neo-display text-sm font-bold">
              <Shuffle className="size-4 shrink-0 text-neo-cream/70" aria-hidden />
              {focus === 'any' && anyCount > 0 && <Check className="order-last ms-auto size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
              {t('vocabQuiz.focus.any')}
            </span>
            <span className="text-xs text-neo-cream/80">
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
                <span className="flex min-w-0 items-center gap-2 break-words font-neo-display text-sm font-bold">
                  <Icon className="size-4 shrink-0 text-neo-cream/70" aria-hidden />
                  {focus === key && enabled && <Check className="order-last ms-auto size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
                  {t(`vocabQuiz.focus.${key}`)}
                </span>
                <span className="text-xs text-neo-cream/80">
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
          <div role="note" className="mt-3 rounded-neo border-2 border-neo-cream/35 bg-neo-navy-light p-3 font-neo-body text-sm text-neo-cream/85">
            {t('vocabQuiz.setup.noQuestions')}
          </div>
        ) : (
          Object.values(availability).some((n) => n === 0) && (
            <div role="note" className="mt-3 rounded-neo border-2 border-neo-cream/35 bg-neo-navy-light p-3 font-neo-body text-sm text-neo-cream/85">
              {t('vocabQuiz.setup.enrichHint')}
            </div>
          )
        )}
      </div>

      <div>
        <div id="vocab-quiz-count-label" className="mb-3 block font-neo-display text-base font-bold text-neo-cream">
          <ListOrdered className="me-2 inline size-4 text-neo-cream/70" />
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
                'inline-flex items-center justify-center gap-1.5 rounded-neo border-2 px-3 py-2.5 font-neo-display text-sm font-bold transition-colors',
                CALM_FOCUS,
                questionCount === count ? CALM_SELECTED : CALM_IDLE
              )}
            >
              {questionCount === count && <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
              {count}
            </button>
          ))}
        </div>
        {plannedCount > 0 && plannedCount < questionCount && (
          <p className="mt-2 font-neo-body text-sm text-neo-cream/70">
            {t('vocabQuiz.setup.cappedNotice', { count: plannedCount })}
          </p>
        )}
      </div>

      <div>
        <div id="vocab-quiz-seconds-label" className="mb-3 block font-neo-display text-base font-bold text-neo-cream">
          <Timer className="me-2 inline size-4 text-neo-cream/70" />
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
                'inline-flex items-center justify-center gap-1.5 rounded-neo border-2 px-3 py-2.5 font-neo-display text-sm font-bold transition-colors',
                CALM_FOCUS,
                secondsPerQuestion === seconds ? CALM_SELECTED : CALM_IDLE
              )}
            >
              {secondsPerQuestion === seconds && <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
              {t('vocabQuiz.setup.seconds', { seconds })}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced: Treasure Chests toggle — absent when the mode never deals chests */}
      {onTreasureChestsChange && (
        <div className="border-t-2 border-neo-cream/20 pt-6">
          <button
            type="button"
            role="switch"
            aria-checked={!!treasureChestsEnabled}
            onClick={() => onTreasureChestsChange?.(!treasureChestsEnabled)}
            className={cn(
              'flex w-full items-center gap-3 rounded-neo border-2 px-4 py-3 transition-colors',
              CALM_FOCUS,
              treasureChestsEnabled ? CALM_SELECTED : CALM_IDLE
            )}
          >
            <Gift className="size-4 shrink-0 text-neo-cream/70" aria-hidden />
            <span className="flex-1 text-start font-neo-display text-sm font-bold">
              {t('vocabQuiz.setup.treasureChests')}
            </span>
            <span
              className={cn(
                'shrink-0 rounded border-2 px-2 py-0.5 text-xs font-bold',
                treasureChestsEnabled ? 'border-neo-lime text-neo-cream' : 'border-neo-cream/35 text-neo-cream/70'
              )}
            >
              {treasureChestsEnabled ? t('vocabQuiz.setup.on') : t('vocabQuiz.setup.off')}
            </span>
          </button>
          <p className="mt-2 font-neo-body text-sm text-neo-cream/70">{t('vocabQuiz.setup.treasureChestsHint')}</p>
        </div>
      )}
    </div>
  );
}

export { VOCAB_QUIZ_MIN_QUESTION_COUNT, VOCAB_QUIZ_DEFAULT_QUESTION_COUNT };
export default VocabQuizFocusPicker;
