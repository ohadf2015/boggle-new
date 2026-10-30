import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a) }));
vi.mock('@/components/results/UniqueWordsSection', () => ({
  __esModule: true,
  default: ({ currentUsername }: { currentUsername: string }) => <div data-testid="unique-words" data-user={currentUsername} />,
}));
vi.mock('@/components/results/MissedWords', () => ({
  __esModule: true,
  default: ({ missedWords }: { missedWords: unknown[] }) => <div data-testid="missed-words" data-count={missedWords.length} />,
}));

import { MpDetailsWords, useDetailsViewed } from '../MpDetailsWords';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const w = (word: string, score: number, extra: { validated?: boolean; isDuplicate?: boolean } = {}) => ({
  word, score, validated: extra.validated ?? true, isDuplicate: extra.isDuplicate ?? false,
});

describe('MpDetailsWords (my words: found, only-me, missed)', () => {
  it('Given my counted words, Then they are listed best first, without rejected or duplicate words', () => {
    render(
      <MpDetailsWords
        myWords={[w('cat', 3), w('quartz', 24), w('zzz', 9, { validated: false }), w('dog', 5, { isDuplicate: true })]}
        allPlayerWords={{ me: [], leo: [] }}
        username="me"
        missedWords={[]}
        language="en"
        t={t}
      />,
    );
    const chips = screen.getAllByTestId('mp-details-found-word').map((el) => el.textContent);
    expect(chips).toEqual(['QUARTZ+24', 'CAT+3']);
  });

  it('Given no counted words, Then an empty note shows instead of a list', () => {
    render(<MpDetailsWords myWords={[]} allPlayerWords={{}} username="me" missedWords={[]} language="en" t={t} />);
    expect(screen.getByText('mpUi.results.detailsNoWords')).toBeTruthy();
    expect(screen.queryAllByTestId('mp-details-found-word')).toHaveLength(0);
  });

  it('Given other players and missed words, Then the only-me and missed lists render', () => {
    render(
      <MpDetailsWords
        myWords={[w('cat', 3)]}
        allPlayerWords={{ me: [w('cat', 3)], leo: [w('dog', 3)] }}
        username="me"
        missedWords={[{ word: 'owl', score: 4, foundBy: [] }]}
        language="en"
        t={t}
      />,
    );
    expect(screen.getByTestId('unique-words').dataset.user).toBe('me');
    expect(screen.getByTestId('missed-words').dataset.count).toBe('1');
  });

  it('Given a solo round, Then no only-me list', () => {
    render(<MpDetailsWords myWords={[w('cat', 3)]} allPlayerWords={{ me: [w('cat', 3)] }} username="me" missedWords={[]} language="en" t={t} />);
    expect(screen.queryByTestId('unique-words')).toBeNull();
    expect(screen.queryByTestId('missed-words')).toBeNull();
  });

  it('Given Hebrew, Then final letters are applied', () => {
    render(<MpDetailsWords myWords={[w('שלומ', 8)]} allPlayerWords={{}} username="me" missedWords={[]} language="he" t={t} />);
    expect(screen.getByTestId('mp-details-found-word').textContent).toContain('שלום');
  });
});

describe('useDetailsViewed (canonical results_viewed when DETAILS opens)', () => {
  beforeEach(() => trackGrowthEvent.mockClear());

  function Probe({ mode, score }: { mode?: string; score: number }) {
    useDetailsViewed(mode, score);
    return null;
  }

  it('fires results_viewed once with mode and score', () => {
    const { rerender } = render(<Probe mode="classic" score={42} />);
    rerender(<Probe mode="classic" score={50} />);
    expect(trackGrowthEvent).toHaveBeenCalledTimes(1);
    expect(trackGrowthEvent).toHaveBeenCalledWith('results_viewed', { mode: 'classic', score: 42 });
  });

  it('falls back to "unknown" mode', () => {
    render(<Probe score={0} />);
    expect(trackGrowthEvent).toHaveBeenCalledWith('results_viewed', { mode: 'unknown', score: 0 });
  });
});
