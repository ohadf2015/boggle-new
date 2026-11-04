import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { WordCraftState } from '@/lib/word-craft/useWordCraftGame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}(${Object.values(params).join(',')})` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGameEnd: vi.fn(), trackGameStart: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/word-craft/WordCraftGameScreen', () => ({
  WordCraftGameView: () => <div data-testid="stub-game-view" />,
}));

import WordCraftPractice from './WordCraftPractice';
import { emitWordCraftGameEnd } from '@/components/word-craft/wordCraftTelemetry';
import { loadLeitnerState } from '@/lib/education/missedWordsLeitnerStore';
import { reviewKey } from '@/lib/education/missedWordsReview';

const LESSON = ['cat', 'dog', 'tree'];

function finish(history: Array<{ who: 'player' | 'bot'; words: string[] }>, player = 80, bot = 60) {
  act(() => {
    emitWordCraftGameEnd(
      { player: { score: player }, bot: { score: bot }, turn: 'over', history } as unknown as WordCraftState,
      { hotseat: false },
    );
  });
}

async function play(review?: { studentId: string; lessonId: string }) {
  render(<WordCraftPractice words={LESSON} language="en" onComplete={vi.fn()} onBack={vi.fn()} review={review} />);
  fireEvent.click(screen.getByTestId('wordcraft-practice-play'));
  await screen.findByTestId('stub-game-view');
}

beforeEach(() => localStorage.clear());

describe('WordCraftPractice → Missed Words Review', () => {
  it('Given a finished round, Then the lesson words the student did not build go to the front of their review', async () => {
    await play({ studentId: 'stu-1', lessonId: 'L1' });
    finish([{ who: 'player', words: ['CAT', 'SUN'] }, { who: 'bot', words: ['DOG'] }]);
    await screen.findByTestId('wordcraft-practice-complete');
    const state = loadLeitnerState('stu-1');
    expect(Object.keys(state).sort()).toEqual([reviewKey('L1', 'dog'), reviewKey('L1', 'tree')].sort());
    expect(state[reviewKey('L1', 'dog')].box).toBe(1);
  });

  it('Given missed words on a finished round, Then reviewing them is the big next step', async () => {
    await play({ studentId: 'stu-1', lessonId: 'L1' });
    finish([{ who: 'player', words: ['CAT', 'SUN'] }]);
    const next = await screen.findByTestId('practice-completion-next');
    expect(next.textContent).toContain('wordcraftReview.next(2)');
    fireEvent.click(next);
    expect(push).toHaveBeenCalledWith('/en/student/review?lesson=L1');
  });

  it('Given a round below the homework bar, Then the nudge still offers the missed words', async () => {
    await play({ studentId: 'stu-1', lessonId: 'L1' });
    finish([{ who: 'player', words: [] }], 0, 12);
    await screen.findByTestId('wordcraft-practice-nudge');
    expect(screen.getByTestId('wordcraft-missed-review').textContent).toContain('wordcraftReview.cta(3)');
  });

  it('Given every lesson word built, Then there is nothing to review', async () => {
    await play({ studentId: 'stu-1', lessonId: 'L1' });
    finish([{ who: 'player', words: ['CAT', 'DOG', 'TREE'] }]);
    await screen.findByTestId('wordcraft-practice-complete');
    expect(screen.queryByTestId('wordcraft-missed-review')).toBeNull();
    expect(loadLeitnerState('stu-1')).toEqual({});
  });

  it('Given a student with no account to review under, Then nothing is saved and no link is shown', async () => {
    await play(undefined);
    finish([{ who: 'player', words: ['CAT', 'SUN'] }]);
    await screen.findByTestId('wordcraft-practice-complete');
    expect(screen.queryByTestId('wordcraft-missed-review')).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});
