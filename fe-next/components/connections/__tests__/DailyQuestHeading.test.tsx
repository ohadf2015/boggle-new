import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DailyQuestHeading from '../DailyQuestHeading';
import PyramidHeader from '../pyramid/PyramidHeader';
import { initPyramidState } from '@/lib/connections/pyramid/gameLogic';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${JSON.stringify(p)})` : k),
  }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const pyramid = {
  id: 'p',
  metaAnswer: 'STONE',
  metaHint: '',
  difficulty: 'medium',
  base: [
    { id: '1', word1: 'A', word2: 'B', bridge: 'STONE', difficulty: 'easy' },
    { id: '2', word1: 'C', word2: 'D', bridge: 'STONE', difficulty: 'easy' },
    { id: '3', word1: 'E', word2: 'F', bridge: 'STONE', difficulty: 'easy' },
  ],
} as unknown as Parameters<typeof initPyramidState>[0];

describe('Word Bridge in-game title', () => {
  it('Given the daily, Then the title is the daily mode name with its quest step', () => {
    render(<DailyQuestHeading />);
    expect(screen.getByRole('heading', { name: 'connections.daily.questTitle' })).toBeTruthy();
    expect(screen.getByTestId('daily-quest-step').textContent).toBe(
      'daily.journeyStepOf({"n":3,"total":4}) · daily.journeyOptional',
    );
  });

  it('Given a pyramid day, Then the header uses the daily title and draws no mascot (the riddle card has one)', () => {
    const { container } = render(<PyramidHeader daily state={initPyramidState(pyramid)} metaAnswer="STONE" />);
    expect(screen.getByTestId('daily-quest-heading')).toBeTruthy();
    expect(screen.queryByText('connections.pyramid.title')).toBeNull();
    // One picture: the mode art in the title. The mascot lives on the riddle card.
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });

  it('Given the standalone pyramid, Then it keeps its own title', () => {
    render(<PyramidHeader state={initPyramidState(pyramid)} metaAnswer="STONE" />);
    expect(screen.getByText('connections.pyramid.title')).toBeTruthy();
    expect(screen.queryByTestId('daily-quest-heading')).toBeNull();
  });
});
