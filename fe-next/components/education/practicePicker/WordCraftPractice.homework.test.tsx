import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { buildInitialState, type WordCraftState } from '@/lib/word-craft/useWordCraftGame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}(${Object.values(params).join(',')})` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGameEnd: vi.fn(), trackGameStart: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

const gameViews: Array<{ seed: number; lesson: { resume?: WordCraftState | null; onState?: (s: WordCraftState) => void } }> = [];
vi.mock('@/components/word-craft/WordCraftGameScreen', () => ({
  WordCraftGameView: (props: (typeof gameViews)[number]) => {
    gameViews.push(props);
    return <div data-testid="stub-game-view" />;
  },
}));

import WordCraftPractice from './WordCraftPractice';
import { emitWordCraftGameEnd } from '@/components/word-craft/wordCraftTelemetry';
import { loadRunSnapshot, saveRunSnapshot } from '@/lib/word-craft/runSnapshot';

const LESSON = ['cat', 'dog', 'tree'];
const RUN_KEY = 'guest-abc:L1';

function finish(words: string[]) {
  act(() => {
    emitWordCraftGameEnd(
      { player: { score: 80 }, bot: { score: 60 }, turn: 'over', history: [{ who: 'player', words }] } as unknown as WordCraftState,
      { hotseat: false },
    );
  });
}

function midRun(): WordCraftState {
  return { ...buildInitialState({ seed: 777, locale: 'en', viewportDims: { size: 9, bagSize: 60 } }), turn: 'player' };
}

beforeEach(() => {
  localStorage.clear();
  gameViews.length = 0;
});

describe('WordCraftPractice as homework', () => {
  it('Given the server stamped the assignment, When the round ends, Then the card says the homework is done', async () => {
    const onComplete = vi.fn().mockResolvedValue({ completed: true, assignmentCompleted: true });
    render(<WordCraftPractice words={LESSON} language="en" onComplete={onComplete} onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    finish(['CAT']);
    expect(await screen.findByTestId('wordcraft-homework-done')).toHaveTextContent('wordcraftReview.homeworkDone');
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ vocabularyWordsFound: ['CAT'] }));
  });

  it('Given practice with no assignment behind it, When the round ends, Then no homework claim is shown', async () => {
    const onComplete = vi.fn().mockResolvedValue({ completed: true, assignmentCompleted: false });
    render(<WordCraftPractice words={LESSON} language="en" onComplete={onComplete} onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    finish(['CAT']);
    await screen.findByTestId('wordcraft-practice-complete');
    await act(async () => {});
    expect(screen.queryByTestId('wordcraft-homework-done')).toBeNull();
  });

  it('Given the server recorded only an attempt, When the round ends, Then the student is nudged to play again', async () => {
    const onComplete = vi.fn().mockResolvedValue({ completed: false, assignmentCompleted: false });
    render(<WordCraftPractice words={LESSON} language="en" onComplete={onComplete} onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    finish(['CAT']);
    expect(await screen.findByTestId('wordcraft-practice-nudge')).toBeInTheDocument();
    expect(screen.queryByTestId('wordcraft-homework-done')).toBeNull();
  });

  it('Given a guest mid-run, When each move lands, Then the round is kept on the device', () => {
    render(<WordCraftPractice words={LESSON} language="en" onComplete={vi.fn()} onBack={vi.fn()} runKey={RUN_KEY} />);
    fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
    const state = midRun();
    act(() => gameViews.at(-1)!.lesson.onState!(state));
    expect(loadRunSnapshot(RUN_KEY)?.player.rack).toEqual(state.player.rack);
  });

  it('Given a guest reloads mid-run, When the page comes back, Then the same board resumes without the intro', () => {
    const state = midRun();
    saveRunSnapshot(RUN_KEY, state);
    render(<WordCraftPractice words={LESSON} language="en" onComplete={vi.fn()} onBack={vi.fn()} runKey={RUN_KEY} />);
    expect(screen.queryByTestId('wordcraft-practice-intro')).toBeNull();
    expect(screen.getByTestId('stub-game-view')).toBeInTheDocument();
    const view = gameViews.at(-1)!;
    expect(view.seed).toBe(777);
    expect(view.lesson.resume?.board).toEqual(state.board);
    expect(view.lesson.resume?.player.rack).toEqual(state.player.rack);
  });

  it('Given a resumed round ends, When the student plays again, Then the old round is gone and a fresh one deals', async () => {
    saveRunSnapshot(RUN_KEY, midRun());
    render(<WordCraftPractice words={LESSON} language="en" onComplete={vi.fn()} onBack={vi.fn()} runKey={RUN_KEY} />);
    finish(['CAT']);
    await screen.findByTestId('wordcraft-practice-complete');
    expect(loadRunSnapshot(RUN_KEY)).toBeNull();
    fireEvent.click(screen.getByTestId('practice-completion-again'));
    expect(gameViews.at(-1)!.lesson.resume).toBeUndefined();
  });

  it('Given a stored round for another lesson, When this lesson opens, Then it starts on the intro', () => {
    saveRunSnapshot('guest-abc:L2', midRun());
    render(<WordCraftPractice words={LESSON} language="en" onComplete={vi.fn()} onBack={vi.fn()} runKey={RUN_KEY} />);
    expect(screen.getByTestId('wordcraft-practice-intro')).toBeInTheDocument();
  });
});
