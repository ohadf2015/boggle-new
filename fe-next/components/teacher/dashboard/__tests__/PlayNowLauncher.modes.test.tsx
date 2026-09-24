/**
 * Teacher HQ: "Start a game" leads with illustrated mode cards.
 *
 * The cards are a choice, not a step: one is always pre-selected (the mode the
 * armed words can carry), so START stays a single tap. The quiz card is only
 * on offer when the words have definitions to ask about.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockLessons = vi.fn();
const mockRecent = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown) => (typeof a === 'string' ? a : k),
    language: 'en',
  }),
}));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => mockLessons() }));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => mockRecent() }));

import { PlayNowLauncher } from '../PlayNowLauncher';

describe('<PlayNowLauncher> — mode cards', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockLessons.mockReturnValue({ lessons: [], isLoading: false, error: null });
    mockRecent.mockReturnValue({ recentConfigs: [], hasRecentConfig: false });
  });

  it('Given the hero, Then it is titled "Start a game" and offers four illustrated modes', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Start a game' })).toBeInTheDocument();
    const group = screen.getByRole('radiogroup');
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    radios.forEach((r) => {
      expect(group.contains(r)).toBe(true);
      expect(r.querySelector('img')?.getAttribute('src')).toMatch(/\/images\/education\/node-/);
    });
  });

  it('Given a starter pack with definitions, Then the quiz is pre-selected and one tap launches it', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    expect(screen.getByTestId('hq-mode-vocab-quiz')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ source: 'pack', mode: 'vocab-quiz' }));
  });

  it('When the teacher taps Blast, Then START launches Blast', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    fireEvent.click(screen.getByTestId('hq-mode-blast'));
    expect(screen.getByTestId('hq-mode-blast')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('hq-mode-vocab-quiz')).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ mode: 'blast' }));
  });

  it('Given pasted bare words, Then the quiz card is unavailable and a board mode is armed', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    fireEvent.click(screen.getByTestId('play-now-source-paste'));
    fireEvent.change(screen.getByTestId('play-now-paste-input'), {
      target: { value: 'photosynthesis, mitosis, osmosis' },
    });
    expect(screen.getByTestId('hq-mode-vocab-quiz')).toBeDisabled();
    expect(screen.getByTestId('hq-mode-classic')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ source: 'paste', mode: 'classic' }));
  });

  it('Given the teacher picked the quiz and then pasted bare words, Then it falls back instead of arming a dead quiz', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    fireEvent.click(screen.getByTestId('hq-mode-vocab-quiz'));
    fireEvent.click(screen.getByTestId('play-now-source-paste'));
    fireEvent.change(screen.getByTestId('play-now-paste-input'), { target: { value: 'a, b, c' } });
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ mode: 'classic' }));
  });

  it('Given a recent lesson with no definitions, When the teacher taps Vocab Quiz, Then a quiz-ready starter pack is armed instead of a dead card', () => {
    mockLessons.mockReturnValue({
      lessons: [{ id: 'l1', name: 'Weekly Vocabulary', language: 'en', words: [{ word: 'cat' }, { word: 'dog' }] }],
      isLoading: false,
      error: null,
    });
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    const quiz = screen.getByTestId('hq-mode-vocab-quiz');
    // The most-played mode is never greyed out on arrival.
    expect(quiz).not.toBeDisabled();
    expect(quiz).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(quiz);
    expect(quiz).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ source: 'pack', mode: 'vocab-quiz' }));
  });
});
