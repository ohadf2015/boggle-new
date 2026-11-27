/**
 * Every solo mode's per-word answers must reach onFinish, which is what
 * completePracticeSession sends to the word memory.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';

const WR = vi.hoisted(() => [
  { word: 'cat', correct: true, kind: 'recall' },
  { word: 'dog', correct: false, kind: 'recall' },
]);

const finisher = vi.hoisted(() => (results: Record<string, unknown>) => {
  const Finish = ({ onComplete }: { onComplete: (r: Record<string, unknown>) => void }) => (
    <button type="button" data-testid="finish" onClick={() => onComplete(results)} />
  );
  return Finish;
});

vi.mock('next/dynamic', () => ({
  default: () => finisher({ vocabularyWordsFound: ['CAT'], wordsFound: ['CAT'], wordResults: WR }),
}));
vi.mock('@/components/education/practicePicker/WordTowerPractice', () => ({
  default: finisher({ vocabularyWordsFound: ['DOG'] }),
}));
vi.mock('@/components/practice/ProducePractice', () => ({
  ProducePractice: finisher({ focus: 'definition', total: 2, correct: 1, wordResults: WR }),
}));
vi.mock('@/lib/education/vocabFocus', () => ({ availableFocuses: () => ['definition'] }));
vi.mock('@/lib/education/produceQuestions', () => ({ PRODUCE_FOCUSES: ['definition'] }));
vi.mock('@/components/practice', () => ({
  FlashcardReview: finisher({ correct: 1, total: 2, wordResults: WR }),
  WordListPreview: () => null,
  WordMatchingPractice: finisher({ correct: 1, total: 2, wordResults: WR }),
  SpellingChallengePractice: finisher({ correct: 1, total: 2, wordResults: WR }),
  TimedBlitzPractice: finisher({ wordsFound: 1, wordsAttempted: 2, wordResults: WR }),
  VocabFocusPractice: finisher({ focus: 'definition', total: 2, correct: 1, wordResults: WR }),
  SoloPracticeBoard: finisher({ vocabularyWordsFound: ['CAT', 'DOG'], wordsFound: ['CAT', 'DOG', 'SUN'] }),
  WarmupRound: finisher({ vocabularyWordsFound: ['dog'], wordsFound: ['dog', 'sun'] }),
}));

import PracticeModeStage from '../PracticeModeStage';
import type { PracticeType } from '@/hooks/usePracticeSession';
import type { PracticeVariant } from '@/lib/education/practicePicker';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const WORDS: VocabularyWord[] = [
  { word: 'Cat', definition: 'a pet', canIntegrate: true },
  { word: 'dog', definition: 'a loyal pet', canIntegrate: true },
];

function finish(mode: PracticeType, variant: PracticeVariant | null = null) {
  const onFinish = vi.fn();
  render(
    <PracticeModeStage
      mode={mode}
      variant={variant}
      focus={null}
      lessonName="Pets"
      language="en"
      words={WORDS}
      onFinish={onFinish}
      onBack={vi.fn()}
      xpSessionData={{ sessionXpEarned: 0, sessionMasteryMessage: null }}
    />,
  );
  fireEvent.click(screen.getByTestId('finish'));
  return onFinish.mock.calls[0];
}

describe('PracticeModeStage word results', () => {
  it.each([
    ['flashcard', null, 'flashcard'],
    ['matching', null, 'matching'],
    ['spelling', null, 'spelling'],
    ['blitz', null, 'blitz'],
    ['vocab_focus', null, 'vocab_focus'],
    ['vocab_focus', 'produce', 'vocab_focus'],
    ['solo_board', 'wordcraft', 'solo_board'],
  ] as const)('Given a %s (%s) round with a wrong answer, When it finishes, Then its word results are forwarded', (mode, variant, type) => {
    const [sentType, payload] = finish(mode, variant);
    expect(sentType).toBe(type);
    expect(payload.wordResults).toEqual(WR);
  });

  it('Given a board round, When it finishes, Then each lesson word found is a find entry in the teacher spelling', () => {
    const [, payload] = finish('solo_board');
    expect(payload.wordResults).toEqual([
      { word: 'Cat', correct: true, kind: 'find' },
      { word: 'dog', correct: true, kind: 'find' },
    ]);
  });

  it('Given a warmup, When it finishes, Then only found lesson words are reported, unfound ones not at all', () => {
    const [, payload] = finish('warmup');
    expect(payload.wordResults).toEqual([{ word: 'dog', correct: true, kind: 'find' }]);
  });

  it('Given a Word Tower round, When it finishes, Then its found lesson words are find entries', () => {
    const [, payload] = finish('solo_board', 'word_tower');
    expect(payload.wordResults).toEqual([{ word: 'dog', correct: true, kind: 'find' }]);
  });
});
