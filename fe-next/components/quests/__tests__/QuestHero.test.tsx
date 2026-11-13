import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { tMock } from './questTestMocks';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: tMock, language: 'en', dir: 'ltr' }),
}));
vi.mock('framer-motion', async () => (await import('./questTestMocks')).motionMock());
vi.mock('@/hooks/useReducedMotion', () => ({ __esModule: true, default: vi.fn(() => false) }));

import { QuestHero } from '../QuestHero';

const filledSegments = () =>
  screen.getAllByTestId('quest-hero-segment').filter((s) => s.getAttribute('data-filled') === 'true').length;

describe('QuestHero', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-12T23:59:58Z'));
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    [0, 'quests.hero.fresh', 'hello-nobg', 'idle'],
    [1, 'quests.hero.one', 'bridge-cheer-nobg', 'idle'],
    [2, 'quests.hero.two', 'streak-supernova-nobg', 'wobble'],
    [3, 'quests.hero.done', 'victory-nobg', 'open'],
  ])('given %i of 3 done, then line, mascot, segments and chest match', (completed, line, mascot, chest) => {
    render(<QuestHero completed={completed} total={3} />);
    expect(screen.getByText(line)).toBeInTheDocument();
    expect(screen.getByTestId('quest-hero-mascot').getAttribute('src')).toContain(mascot);
    expect(screen.getAllByTestId('quest-hero-segment')).toHaveLength(3);
    expect(filledSegments()).toBe(completed);
    expect(screen.getByTestId('quest-hero-chest').getAttribute('data-state')).toBe(chest);
  });

  it('given one done, then the count reads 1 of 3', () => {
    render(<QuestHero completed={1} total={3} />);
    expect(screen.getByText('quests.progress|1,3')).toBeInTheDocument();
  });

  it('given the clock, then the reset countdown ticks every second and stops on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(<QuestHero completed={0} total={3} />);
    expect(screen.getByText('quests.resetIn|00:00:02')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('quests.resetIn|00:00:01')).toBeInTheDocument();

    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
