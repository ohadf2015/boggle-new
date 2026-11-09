import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordShowdownPanel } from '../WordShowdownPanel';

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

const t = (k: string, p?: Record<string, string | number>) =>
  p ? `${k}:${JSON.stringify(p)}` : k;

describe('WordShowdownPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders real unique chips from match data and caps at 5', () => {
    const allPlayerWords = {
      me: [
        { word: 'planet', validated: true, isDuplicate: false },
        { word: 'plant', validated: true, isDuplicate: false },
        { word: 'plan', validated: true, isDuplicate: false },
        { word: 'pan', validated: true, isDuplicate: false },
        { word: 'pa', validated: true, isDuplicate: false },
        { word: 'zzzzzz', validated: true, isDuplicate: false },
      ],
      rival: [{ word: 'other', validated: true, isDuplicate: false }],
    };
    render(
      <WordShowdownPanel
        allPlayerWords={allPlayerWords as never}
        username="me"
        bestMissed={null}
        playerCount={2}
        t={t}
      />,
    );
    expect(screen.getByTestId('mp-word-showdown')).toBeTruthy();
    expect(screen.getAllByTestId('mp-showdown-unique-chip')).toHaveLength(5);
    expect(screen.queryByText('pa')).toBeNull(); // shortest dropped by longest-first cap
  });

  it('returns null when there are no unique words', () => {
    const allPlayerWords = {
      me: [{ word: 'same', validated: true, isDuplicate: false }],
      rival: [{ word: 'same', validated: true, isDuplicate: false }],
    };
    const { container } = render(
      <WordShowdownPanel
        allPlayerWords={allPlayerWords as never}
        username="me"
        bestMissed={{ word: 'missed', letters: 6, points: 10 }}
        t={t}
      />,
    );
    expect(container.querySelector('[data-testid="mp-word-showdown"]')).toBeNull();
  });

  it('hides under classroom hideOutcome', () => {
    const allPlayerWords = {
      me: [{ word: 'unique', validated: true, isDuplicate: false }],
      rival: [{ word: 'other', validated: true, isDuplicate: false }],
    };
    const { container } = render(
      <WordShowdownPanel
        allPlayerWords={allPlayerWords as never}
        username="me"
        bestMissed={null}
        hideOutcome
        t={t}
      />,
    );
    expect(container.querySelector('[data-testid="mp-word-showdown"]')).toBeNull();
  });
});
