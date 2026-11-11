import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emitMascotEvent, _resetMascotBus } from '@/lib/blast/mascotBus';

vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => false }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
import { render, screen, act } from '@testing-library/react';

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

describe('PracticeModeStage — shared mascot', () => {
  beforeEach(() => {
    _resetMascotBus();
    localStorage.clear();
  });

  it('pops the education mascot when a drill reports a right answer', () => {
    render(
      <PracticeModeStage
        mode="spelling"
        variant={null}
        focus={null}
        lessonName="Week 3"
        language="en"
        words={WORDS}
        onFinish={onFinish}
        onBack={onBack}
        xpSessionData={xp}
      />,
    );
    expect(screen.queryByTestId('edu-mascot-reaction')).toBeNull();
    act(() => emitMascotEvent({ kind: 'word-submitted', wordLength: 5, gemLetterUsed: false }));
    expect(screen.getByTestId('edu-mascot-reaction')).toBeTruthy();
  });
});
