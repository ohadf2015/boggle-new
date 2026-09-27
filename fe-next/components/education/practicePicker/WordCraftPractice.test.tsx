/**
 * WordCraftPractice — Word Craft played as classroom homework.
 *
 * The wrapper's job is the seam between the lesson and the stock game: show
 * the lesson words, host the real game view, and when the game ends hand the
 * lesson words the student actually built back to the practice session. The
 * game itself is stubbed; the stub finishes a game through the REAL
 * `emitWordCraftGameEnd`, the same call the game view makes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { WordCraftState } from '@/lib/word-craft/useWordCraftGame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.values(params).join(',')})` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGameEnd: vi.fn(), trackGameStart: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

const gameViewProps = vi.fn();
vi.mock('@/components/word-craft/WordCraftGameScreen', () => ({
  WordCraftGameView: (props: Record<string, unknown>) => {
    gameViewProps(props);
    return <div data-testid="stub-game-view" />;
  },
}));

import WordCraftPractice from './WordCraftPractice';
import { emitWordCraftGameEnd } from '@/components/word-craft/wordCraftTelemetry';

const LESSON = ['cat', 'dog', 'tree'];
const onComplete = vi.fn();
const onBack = vi.fn();

beforeEach(() => {
  onComplete.mockReset();
  onBack.mockReset();
  gameViewProps.mockReset();
});

const renderIt = () =>
  render(<WordCraftPractice words={LESSON} language="en" onComplete={onComplete} onBack={onBack} />);

function finish(history: Array<{ who: 'player' | 'bot'; words: string[] }>, player = 80, bot = 60) {
  act(() => {
    emitWordCraftGameEnd(
      { player: { score: player }, bot: { score: bot }, turn: 'over', history } as unknown as WordCraftState,
      { hotseat: false },
    );
  });
}

describe('WordCraftPractice', () => {
  it('Given the intro, When shown, Then it lists the lesson words and offers one PLAY', () => {
    renderIt();
    expect(screen.getByText('CAT')).toBeTruthy();
    expect(screen.getByText('TREE')).toBeTruthy();
    expect(screen.queryByTestId('stub-game-view')).toBeNull();
    expect(screen.getByTestId('wordcraft-practice-play')).toBeTruthy();
  });

  it('Given PLAY, When tapped, Then the real game opens solo vs an easy bot', async () => {
    renderIt();
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    await screen.findByTestId('stub-game-view');
    expect(gameViewProps).toHaveBeenCalledWith(
      expect.objectContaining({ hotseat: false, duel: null, difficulty: 'easy' }),
    );
  });

  it('Given a finished game, When it ends, Then only the lesson words the player built are reported', async () => {
    renderIt();
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    await screen.findByTestId('stub-game-view');
    finish([
      { who: 'player', words: ['CAT', 'SUN'] },
      { who: 'bot', words: ['DOG'] },
    ]);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0][0]).toEqual({
      vocabularyWordsFound: ['CAT'], wordsFound: ['CAT', 'SUN'], score: 80, botScore: 60, won: true,
    });
    expect(await screen.findByTestId('wordcraft-practice-complete')).toBeTruthy();
  });

  it('Given the game view unmounted, When a later game ends elsewhere, Then nothing is reported', () => {
    const { unmount } = renderIt();
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    unmount();
    finish([{ who: 'player', words: ['CAT'] }]);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('Given the intro, When back is tapped, Then it leaves', () => {
    renderIt();
    fireEvent.click(screen.getByLabelText('common.back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('Given a 0-0 game, When it ends, Then the result reads as a tie, not a bot win', async () => {
    renderIt();
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    await screen.findByTestId('stub-game-view');
    finish([{ who: 'player', words: ['CAT'] }], 0, 0);
    expect(await screen.findByText('education.wordcraftAssignment.tie')).toBeTruthy();
  });

  it('Given PLAY, When the game opens, Then it is dealt in the LESSON language with the lesson words seeded and Back returning to the lesson', async () => {
    render(<WordCraftPractice words={['שלום', 'ספר']} language="he" onComplete={onComplete} onBack={onBack} />);
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    await screen.findByTestId('stub-game-view');
    const props = gameViewProps.mock.calls.at(-1)![0] as { lesson: { locale: string; targets: string[]; onExit: () => void }; modifierOverride: string };
    expect(props.lesson.locale).toBe('he');
    expect(props.lesson.targets).toEqual(['ספר', 'שלומ']);
    expect(props.modifierOverride).toBe('none');
    props.lesson.onExit();
    expect(onBack).toHaveBeenCalled();
  });

  it('Given a Russian lesson (no Word Craft bag), When the game opens, Then it falls back to the UI locale and seeds nothing', async () => {
    render(<WordCraftPractice words={['ёлка']} language="ru" onComplete={onComplete} onBack={onBack} />);
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    await screen.findByTestId('stub-game-view');
    const props = gameViewProps.mock.calls.at(-1)![0] as { lesson: { locale: string; targets: string[] } };
    expect(props.lesson).toEqual(expect.objectContaining({ locale: 'en', targets: [] }));
  });

  it('Given a round passed with no words, When it ends, Then it still reports (as an attempt) but nudges to build a lesson word and offers another go', async () => {
    renderIt();
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    await screen.findByTestId('stub-game-view');
    finish([{ who: 'player', words: [] }, { who: 'bot', words: ['DOG'] }], 0, 12);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('wordcraft-practice-nudge')).toBeTruthy();
    expect(screen.getByText('education.wordcraftAssignment.needLessonWord(3)')).toBeTruthy();
    expect(screen.queryByTestId('wordcraft-practice-complete')).toBeNull();
    fireEvent.click(screen.getByTestId('wordcraft-practice-retry'));
    expect(await screen.findByTestId('stub-game-view')).toBeTruthy();
  });

  it('Given three valid non-lesson words, When it ends, Then it counts as done', async () => {
    renderIt();
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    await screen.findByTestId('stub-game-view');
    finish([{ who: 'player', words: ['SUN', 'RUN'] }, { who: 'player', words: ['FUN'] }]);
    expect(await screen.findByTestId('wordcraft-practice-complete')).toBeTruthy();
  });
});
