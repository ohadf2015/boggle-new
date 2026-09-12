/**
 * The hint row crashed the whole practice screen on a real lesson.
 *
 * Two faults in one expression: the blanks were counted off `words[wordIndex]`
 * — the UNSORTED prop — while the revealed letters came from the hook's
 * length-sorted copy, so the underscores belonged to a different word; and the
 * optional chain stopped at the array element, so an entry whose `word` was
 * missing threw `Cannot read properties of undefined (reading 'length')` and
 * the error boundary replaced the round with "LET'S GET YOU BACK!".
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellingChallengePractice } from '../SpellingChallengePractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn() }),
}));

describe('SpellingChallengePractice hint blanks', () => {
  it('GIVEN an unsorted list WHEN the first card shows THEN the blanks match the shown word', () => {
    // Sorted by length the first card is "ox" (2), not "elephant" (8).
    const words = [
      { word: 'elephant', definition: 'a big animal', canIntegrate: true },
      { word: 'ox', definition: 'a strong farm animal', canIntegrate: true },
    ] as VocabularyWord[];

    render(
      <SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />
    );

    const hint = screen.getByTestId('hint-display').textContent ?? '';
    const shown = hint.replace(/[^a-z_]/gi, '');
    expect(shown).toHaveLength(2);
  });

  it('GIVEN an entry with no word WHEN the round opens THEN it renders instead of crashing', () => {
    const words = [
      { definition: 'a gap in the data', canIntegrate: true },
      { word: 'ox', definition: 'a strong farm animal', canIntegrate: true },
    ] as unknown as VocabularyWord[];

    expect(() =>
      render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />)
    ).not.toThrow();
    expect(screen.getByTestId('hint-display')).toBeInTheDocument();
  });
});

describe('SpellingChallengePractice prompt without definitions', () => {
  it('GIVEN a word with no definition WHEN the card shows THEN it prompts instead of saying there is nothing to practise', () => {
    // Spelling is "hear it, then spell it": the definition is a bonus, not the
    // prompt. Printing "No words to practice" over a live 8-word round told the
    // student the drill was broken when it was working fine.
    const words = [{ word: 'star', canIntegrate: true }] as VocabularyWord[];
    render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />);

    const card = screen.getByTestId('definition-card');
    expect(card.textContent).not.toContain('noWords');
    expect(card.textContent).toContain('student.practiceFun.listenAndSpell');
  });
});

describe('SpellingChallengePractice submit button', () => {
  it('GIVEN an empty input WHEN the submit is disabled THEN it fades its FILL, not its text', () => {
    // `disabled:opacity-50` over `bg-neo-purple` with white text measured
    // 4.23:1 — below AA — because fading the button fades the label with it.
    // A disabled control still has to be readable and still has to be bordered.
    const words = [{ word: 'star', canIntegrate: true }] as VocabularyWord[];
    render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />);

    const submit = screen.getByRole('button', { name: /submit/i });
    expect(submit.className).not.toContain('disabled:opacity-');
    expect(submit.className).toContain('disabled:border-neo-cream');
  });
});
