import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { WordShowdownPanel } from '../WordShowdownPanel';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a),
}));

const words = {
  me: [{ word: 'unique', validated: true, isDuplicate: false }],
  rival: [{ word: 'other', validated: true, isDuplicate: false }],
};

describe('WordShowdownPanel impression once-guard', () => {
  beforeEach(() => trackGrowthEvent.mockClear());

  it('fires word_showdown_shown once when scores re-render for the same match', () => {
    const t = (k: string) => k;
    const { rerender } = render(
      <WordShowdownPanel
        allPlayerWords={words as never}
        username="me"
        bestMissed={null}
        mode="classic"
        playerCount={2}
        t={t}
      />,
    );
    rerender(
      <WordShowdownPanel
        allPlayerWords={{
          ...words,
          me: [
            ...words.me,
            { word: 'another', validated: true, isDuplicate: false },
          ],
        } as never}
        username="me"
        bestMissed={null}
        mode="classic"
        playerCount={2}
        t={t}
      />,
    );
    expect(trackGrowthEvent.mock.calls.filter((c) => c[0] === 'word_showdown_shown')).toHaveLength(1);
  });
});
