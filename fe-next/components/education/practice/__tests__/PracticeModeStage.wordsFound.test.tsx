/**
 * Word-goal homework is scored from PATCH words_found. SoloPracticeBoard and
 * WarmupRound already compute wordsFound — the stage must forward it.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('@/components/education/practicePicker/WordTowerPractice', () => ({
  default: () => null,
}));
vi.mock('@/components/practice/ProducePractice', () => ({
  ProducePractice: () => null,
}));
vi.mock('@/lib/education/vocabFocus', () => ({
  availableFocuses: () => ['definition'],
}));
vi.mock('@/lib/education/produceQuestions', () => ({
  PRODUCE_FOCUSES: ['definition'],
}));


vi.mock('@/components/practice', () => ({
  FlashcardReview: () => null,
  WordListPreview: () => null,
  WordMatchingPractice: () => null,
  SpellingChallengePractice: () => null,
  TimedBlitzPractice: () => null,
  VocabFocusPractice: () => null,
  ProducePractice: () => null,
  SoloPracticeBoard: ({
    onComplete,
  }: {
    onComplete: (r: { wordsFound: string[]; vocabularyWordsFound: string[]; score: number }) => void;
  }) => (
    <button
      type="button"
      data-testid="solo-finish"
      onClick={() =>
        onComplete({ wordsFound: ['CAT', 'DOG'], vocabularyWordsFound: ['CAT'], score: 12 })
      }
    />
  ),
  WarmupRound: ({
    onComplete,
  }: {
    onComplete: (r: { wordsFound: string[]; vocabularyWordsFound: string[]; score: number }) => void;
  }) => (
    <button
      type="button"
      data-testid="warmup-finish"
      onClick={() => onComplete({ wordsFound: ['SUN'], vocabularyWordsFound: [], score: 4 })}
    />
  ),
}));

import PracticeModeStage from '../PracticeModeStage';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const WORDS: VocabularyWord[] = [{ word: 'cat', canIntegrate: true }];
const onFinish = vi.fn();
const onBack = vi.fn();
const xp = { sessionXpEarned: 0, sessionMasteryMessage: null };

function mount(mode: 'solo_board' | 'warmup') {
  onFinish.mockReset();
  return render(
    <PracticeModeStage
      mode={mode}
      variant={null}
      focus={null}
      lessonName="Find 10 words"
      language="en"
      words={WORDS}
      onFinish={onFinish}
      onBack={onBack}
      xpSessionData={xp}
    />,
  );
}

describe('PracticeModeStage word-goal forwarding', () => {
  it('Given a plain solo_board round, When it finishes, Then wordsFound is forwarded', () => {
    mount('solo_board');
    fireEvent.click(document.querySelector('[data-testid="solo-finish"]')!);
    expect(onFinish).toHaveBeenCalledWith(
      'solo_board',
      expect.objectContaining({
        wordsFound: ['CAT', 'DOG'],
        vocabularyWordsFound: ['CAT'],
      }),
    );
  });

  it('Given a warmup round, When it finishes, Then wordsFound is forwarded on the solo_board path', () => {
    mount('warmup');
    fireEvent.click(document.querySelector('[data-testid="warmup-finish"]')!);
    expect(onFinish).toHaveBeenCalledWith(
      'solo_board',
      expect.objectContaining({
        wordsFound: ['SUN'],
      }),
    );
  });
});
