import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PronunciationButton } from '../PronunciationButton';

const speak = vi.fn().mockResolvedValue(true);
vi.mock('@/hooks/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({ speak, isSpeaking: false }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('PronunciationButton inside a clickable parent (flashcard flip bug)', () => {
  it('speaks the word and does NOT bubble the click to the parent', () => {
    // Given a speaker button nested in a card that flips on click
    const flip = vi.fn();
    render(
      <div onClick={flip} data-testid="card">
        <PronunciationButton word="rhythm" lang="en-US" size="sm" />
      </div>
    );

    // When the speaker is clicked
    fireEvent.click(screen.getByRole('button'));

    // Then it pronounces and the card does not flip
    expect(speak).toHaveBeenCalledWith('rhythm', 'en-US');
    expect(flip).not.toHaveBeenCalled();
  });
});
