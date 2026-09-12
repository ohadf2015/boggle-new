/**
 * Warmup is a live tile on the practice picker, and it was the last mode still
 * ending on the flat trophy card every other mode has left behind: a glyph, a
 * score and two grey outline buttons. A student who finishes it gets the same
 * payoff as one who finishes Blitz — stars, a mascot, a stinger and one big
 * forward action.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WarmupRound from '../WarmupRound';
import type { VocabularyWord } from '@/lib/supabase/education';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.values(params).join(',')})` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound,
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

vi.mock('@/components/GridComponent', () => ({
  default: () => <div data-testid="grid" />,
}));

const words: VocabularyWord[] = [
  { word: 'happy', canIntegrate: true },
  { word: 'brave', canIntegrate: true },
];

const renderIt = (extra: Record<string, unknown> = {}) =>
  render(
    <WarmupRound
      lessonName="Unit 3"
      words={words}
      language="en"
      onComplete={vi.fn()}
      onBack={vi.fn()}
      {...extra}
    />
  );

const finish = () => {
  const done = screen
    .getAllByRole('button')
    .find((button) => /education\.practice\.finish|common\.done/.test(button.textContent ?? ''));
  expect(done).toBeDefined();
  fireEvent.click(done as HTMLElement);
};

describe('WarmupRound completion', () => {
  it('GIVEN a finished warmup WHEN the round ends THEN the shared completion moment shows', () => {
    renderIt();
    finish();
    expect(screen.getByTestId('practice-completion')).toBeInTheDocument();
    expect(screen.getByTestId('practice-completion-stars')).toBeInTheDocument();
  });

  it('GIVEN a finished warmup WHEN the round ends THEN a stinger plays past the game gate', () => {
    playSound.mockClear();
    renderIt();
    finish();
    expect(playSound).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ requiresGameActive: false })
    );
  });

  it('GIVEN a next mode WHEN the round ends THEN the one big forward action is NEXT', () => {
    renderIt({ onNext: vi.fn(), nextLabel: 'Blitz' });
    finish();
    expect(screen.getByTestId('practice-completion-next')).toBeInTheDocument();
  });
});
