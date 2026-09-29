/**
 * Flashcard feedback must speak the same language as every other drill:
 * a sound on every grade (the mode used to grade in silence) and the brand's
 * two meaning-colors — lime for "got it", pink for "not yet" — never raw
 * green/red Tailwind. "Firm but not scary" is a color decision too.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FlashcardReview from '../FlashcardReview';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const playSound = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));
vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => ({ socket: null }),
}));
vi.mock('@/hooks/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({ speak: vi.fn(), isSpeaking: false }),
}));
vi.mock('../PronunciationButton', () => ({ PronunciationButton: () => null }));
vi.mock('../FlashcardSwipeStack', () => ({ FlashcardSwipeStack: () => <div /> }));

const WORDS: VocabularyWord[] = [
  { word: 'hesitant', definition: 'not sure about doing something', canIntegrate: true },
  { word: 'reluctant', definition: 'unwilling', canIntegrate: true },
];

/** Grading buttons stay disabled until the card is flipped to its answer side. */
function flipFirstCard() {
  fireEvent.click(screen.getByText('education.practice.tapToFlip'));
}

beforeEach(() => vi.clearAllMocks());

describe('FlashcardReview grading feedback', () => {
  it('plays the right-answer sound on "Got It"', () => {
    render(<FlashcardReview words={WORDS} onComplete={vi.fn()} onBack={vi.fn()} />);
    flipFirstCard();
    fireEvent.click(screen.getByText('education.practice.gotIt'));
    expect(playSound).toHaveBeenCalledWith('wordAccepted', expect.objectContaining({ requiresGameActive: false }));
  });

  it('plays the soft wrong sound on "Don\'t Know"', () => {
    render(<FlashcardReview words={WORDS} onComplete={vi.fn()} onBack={vi.fn()} />);
    flipFirstCard();
    fireEvent.click(screen.getByText('education.practice.dontKnow'));
    expect(playSound).toHaveBeenCalledWith('wordRejected', expect.objectContaining({ requiresGameActive: false }));
  });

  it('marks the grade buttons with the brand meaning-colors, not raw green/red', () => {
    render(<FlashcardReview words={WORDS} onComplete={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('education.practice.gotIt').closest('button')).toHaveClass('bg-neo-lime');
    expect(screen.getByText('education.practice.dontKnow').closest('button')).toHaveClass('bg-neo-pink');
  });
});
