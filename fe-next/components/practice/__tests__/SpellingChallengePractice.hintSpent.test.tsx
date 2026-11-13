import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellingChallengePractice } from '../SpellingChallengePractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn() }),
}));

describe('SpellingChallengePractice spent hint', () => {
  const words = [{ word: 'cat', definition: 'a small pet', canIntegrate: true }] as VocabularyWord[];

  it('GIVEN letters left to reveal WHEN the card shows THEN the hint button is live', () => {
    render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByTestId('hint-button')).toBeEnabled();
  });

  it('GIVEN every letter is revealed WHEN the student looks at the hint button THEN it is switched off', () => {
    render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />);
    const hint = screen.getByTestId('hint-button');
    fireEvent.click(hint);
    fireEvent.click(hint);
    expect(screen.getByTestId('hint-display')).toHaveTextContent('cat');
    expect(hint).toBeDisabled();
  });
});
