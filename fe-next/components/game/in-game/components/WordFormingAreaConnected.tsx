'use client';

import { memo } from 'react';
import WordFormingArea, { type WordFeedback } from '../../WordFormingArea';
import { useSelectionWord, useSelectionLetterCount } from '@/hooks/useSelectionStore';

interface WordFormingAreaConnectedProps {
  isTypingMode: boolean;
  typedWord: string;
  feedback: WordFeedback | null;
}

export const WordFormingAreaConnected = memo(function WordFormingAreaConnected({
  isTypingMode,
  typedWord,
  feedback,
}: WordFormingAreaConnectedProps) {
  const formedWord = useSelectionWord();
  const letterCount = useSelectionLetterCount();
  return (
    <WordFormingArea
      word={isTypingMode ? typedWord : formedWord}
      letterCount={isTypingMode ? typedWord.length : letterCount}
      feedback={feedback}
      compact
    />
  );
});
