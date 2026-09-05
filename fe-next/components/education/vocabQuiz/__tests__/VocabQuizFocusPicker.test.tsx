/**
 * Live Vocab Quiz — teacher focus picker.
 *
 * The requirement this covers: the teacher must see, BEFORE starting, how many
 * questions each focus can make from the words they picked. With today's real
 * data (definitions only, no synonyms/antonyms/examples in any lesson) three of
 * the four focuses are empty, so the disabled state and its explanation are the
 * normal path, not an edge case.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VocabQuizFocusPicker } from '../VocabQuizFocusPicker';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { VOCAB_FOCUSES } from '@/lib/education/vocabFocus';

/** Mirrors the real `t(path, params)` call shape used by these components. */
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const word = (over: Partial<VocabularyWord> & { word: string }): VocabularyWord => ({
  canIntegrate: true,
  ...over,
});

/** Six words with definitions only — the shape of every real lesson today. */
const DEFINITIONS_ONLY: VocabularyWord[] = [
  word({ word: 'abandon', definition: 'to leave behind for good' }),
  word({ word: 'brittle', definition: 'hard but easily broken' }),
  word({ word: 'candid', definition: 'honest and direct' }),
  word({ word: 'dwindle', definition: 'to shrink little by little' }),
  word({ word: 'endure', definition: 'to keep going through hardship' }),
  word({ word: 'frantic', definition: 'wild with worry or hurry' }),
];

/**
 * Every focus the shared builder supports, filled in. Kept exhaustive on
 * purpose: the picker is driven off `VOCAB_FOCUSES`, so a fixture that covers
 * only some focuses would make "fully enriched" look partly locked.
 */
const ENRICHED: VocabularyWord[] = DEFINITIONS_ONLY.slice(0, 5).map((w, i) => ({
  ...w,
  synonyms: [`syn${i}`],
  antonyms: [`ant${i}`],
  example: `The ${w.word} example sentence.`,
  meanings: [`sense A of ${w.word}`, `sense B of ${w.word}`],
  morphology: { root: `root${i}`, rootMeaning: `meaning of root${i}`, prefix: `pre${i}`, suffix: `suf${i}` },
}));

function setup(words: VocabularyWord[], overrides: Record<string, unknown> = {}) {
  const onFocusChange = vi.fn();
  const onQuestionCountChange = vi.fn();
  const onSecondsChange = vi.fn();
  render(
    <VocabQuizFocusPicker
      words={words}
      focus="any"
      questionCount={10}
      secondsPerQuestion={20}
      onFocusChange={onFocusChange}
      onQuestionCountChange={onQuestionCountChange}
      onSecondsChange={onSecondsChange}
      t={t}
      {...overrides}
    />
  );
  return { onFocusChange, onQuestionCountChange, onSecondsChange };
}

describe('VocabQuizFocusPicker', () => {
  it('shows a real question count on every focus the lesson supports', () => {
    setup(ENRICHED);
    // Five enriched words → five questions for every focus the builder offers.
    expect(screen.getAllByText('vocabQuiz.setup.questionsAvailable:5')).toHaveLength(VOCAB_FOCUSES.length);
    // ...and the mixed chip totals them.
    expect(
      screen.getByText(`vocabQuiz.setup.questionsAvailable:${VOCAB_FOCUSES.length * 5}`)
    ).toBeInTheDocument();
  });

  it('disables a focus the lesson has no data for instead of hiding it', () => {
    setup(DEFINITIONS_ONLY);
    expect(screen.getByRole('radio', { name: /vocabQuiz\.focus\.synonym/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /vocabQuiz\.focus\.antonym/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /vocabQuiz\.focus\.context/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /vocabQuiz\.focus\.definition/ })).toBeEnabled();
  });

  it('tells the teacher WHERE to add the missing data, not just that it is missing', () => {
    setup(DEFINITIONS_ONLY);
    expect(screen.getByText('vocabQuiz.setup.enrichHint')).toBeInTheDocument();
  });

  it('does not nag when every focus is already available', () => {
    setup(ENRICHED);
    expect(screen.queryByText('vocabQuiz.setup.enrichHint')).not.toBeInTheDocument();
  });

  it('warns that no quiz is possible at all when the words carry no data', () => {
    setup([word({ word: 'lonely' }), word({ word: 'bare' })]);
    expect(screen.getByText('vocabQuiz.setup.noQuestions')).toBeInTheDocument();
  });

  it('reports the focus the teacher picks', async () => {
    const { onFocusChange } = setup(ENRICHED);
    await userEvent.click(screen.getByRole('radio', { name: /vocabQuiz\.focus\.antonym/ }));
    expect(onFocusChange).toHaveBeenCalledWith('antonym');
  });

  it('says so when the lesson cannot fill the requested round length', () => {
    // Six definitions but a twenty-question round requested.
    setup(DEFINITIONS_ONLY, { focus: 'definition', questionCount: 20 });
    expect(screen.getByText('vocabQuiz.setup.cappedNotice:6')).toBeInTheDocument();
  });

  it('stays quiet when the lesson can fill the requested round', () => {
    setup(DEFINITIONS_ONLY, { focus: 'definition', questionCount: 5 });
    expect(screen.queryByText(/vocabQuiz\.setup\.cappedNotice/)).not.toBeInTheDocument();
  });

  it('lets the teacher set the round length and the per-question clock', async () => {
    const { onQuestionCountChange, onSecondsChange } = setup(ENRICHED);
    await userEvent.click(screen.getByRole('radio', { name: '15' }));
    expect(onQuestionCountChange).toHaveBeenCalledWith(15);
    await userEvent.click(screen.getByRole('radio', { name: 'vocabQuiz.setup.seconds:30' }));
    expect(onSecondsChange).toHaveBeenCalledWith(30);
  });

  it('marks the selected focus for assistive tech', () => {
    setup(ENRICHED, { focus: 'synonym' });
    expect(screen.getByRole('radio', { name: /vocabQuiz\.focus\.synonym/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /vocabQuiz\.focus\.any/ })).toHaveAttribute('aria-checked', 'false');
  });
});
