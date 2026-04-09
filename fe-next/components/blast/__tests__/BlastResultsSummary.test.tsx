import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastResultsSummary } from '../BlastResultsSummary';
import type { BlastResultsData } from '../types';

// Render motion + animate-presence inline so children mount synchronously.
vi.mock('@/components/motion/AdaptiveMotion', () => {
  const passthrough = (Tag: string) => {
    const Comp = ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      void initial; void animate; void exit; void transition;
      // Render as a generic element so we don't need to validate Tag.
      return <div {...rest}>{children}</div>;
    };
    Comp.displayName = `MotionMock(${Tag})`;
    return Comp;
  };
  return {
    AdaptiveMotion: new Proxy({}, { get: (_, key) => passthrough(String(key)) }),
    AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Stub the unlock hook so we don't touch the Zustand store or sonner.
vi.mock('../hooks/useBlastBadgeUnlocks', () => ({
  useBlastBadgeUnlocks: vi.fn(() => []),
}));

import { useBlastBadgeUnlocks } from '../hooks/useBlastBadgeUnlocks';

const t = (key: string, vars?: Record<string, string | number>) => {
  if (!vars) return key;
  // Substitute {name} placeholders if present, otherwise append values so
  // tests can still assert on interpolated content even though the test
  // sees the raw key (not the translated string).
  let out = key;
  let substituted = false;
  for (const [k, v] of Object.entries(vars)) {
    const token = `{${k}}`;
    if (out.includes(token)) {
      out = out.split(token).join(String(v));
      substituted = true;
    }
  }
  if (!substituted) {
    out = `${out} ${Object.values(vars).join(' ')}`;
  }
  return out;
};

function makeResults(overrides: Partial<BlastResultsData> = {}): BlastResultsData {
  return {
    finalScore: 5000,
    tilesCleared: 30,
    totalTiles: 36,
    clearPercentage: 83,
    wordsFound: ['cat', 'dog', 'fish'],
    bestWord: 'fish',
    maxCombo: 4,
    stars: 2,
    wavesCompleted: 2,
    waveResults: [
      { waveNumber: 1, score: 2000, wordsFound: 1, clearPercentage: 80 },
      { waveNumber: 2, score: 3000, wordsFound: 2, clearPercentage: 85 },
    ],
    ...overrides,
  };
}

describe('BlastResultsSummary', () => {
  const noop = () => {};

  it('renders score and word/wave counts', () => {
    render(
      <BlastResultsSummary
        results={makeResults()}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    expect(screen.getByText('5,000')).toBeDefined();
    expect(screen.getByTestId('blast-results-score-card').textContent).toContain('3');
    expect(screen.getByTestId('blast-results-score-card').textContent).toContain('2');
  });

  it('hides the percentile band until backend responds', () => {
    const { rerender } = render(
      <BlastResultsSummary
        results={makeResults({ percentile: undefined })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    expect(screen.queryByTestId('blast-results-percentile')).toBeNull();

    rerender(
      <BlastResultsSummary
        results={makeResults({ percentile: 88 })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    const band = screen.getByTestId('blast-results-percentile');
    // 88th percentile → top 12% (100 - 88).
    expect(band.textContent).toContain('12');
  });

  it('shows PB delta + new-record ribbon only when previous best beaten', () => {
    const { rerender } = render(
      <BlastResultsSummary
        results={makeResults({ finalScore: 5000, previousBest: 6000 })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    expect(screen.queryByText(/blast.results.newRecord/)).toBeNull();

    rerender(
      <BlastResultsSummary
        results={makeResults({ finalScore: 7500, previousBest: 6000 })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    expect(screen.getByText('blast.results.newRecord')).toBeDefined();
    // Delta of 1500 should be rendered with a thousand-separator.
    expect(screen.getByTestId('blast-results-score-card').textContent).toContain('1,500');
  });

  it('renders unlocked badges with NEW ribbon for fresh ones', () => {
    (useBlastBadgeUnlocks as any).mockReturnValueOnce([
      { id: 'firstBlast', icon: 'Sparkles', label: 'First Blast', isNew: true },
      { id: 'comboChain', icon: 'Link', label: 'Combo Chain', isNew: false },
    ]);
    render(
      <BlastResultsSummary
        results={makeResults()}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    expect(screen.getByTestId('blast-badge-firstBlast')).toBeDefined();
    expect(screen.getByTestId('blast-badge-comboChain')).toBeDefined();
    // NEW ribbon only on the fresh one.
    const fresh = screen.getByTestId('blast-badge-firstBlast');
    expect(fresh.textContent).toContain('blast.results.newBadge');
    const old = screen.getByTestId('blast-badge-comboChain');
    expect(old.textContent).not.toContain('blast.results.newBadge');
  });

  it('invokes callbacks for play-again and quit', () => {
    const onPlayAgain = vi.fn();
    const onQuit = vi.fn();
    render(
      <BlastResultsSummary
        results={makeResults()}
        t={t}
        onPlayAgain={onPlayAgain}
        onQuit={onQuit}
      />,
    );
    fireEvent.click(screen.getByTestId('play-again-button'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('common.home'));
    expect(onQuit).toHaveBeenCalledTimes(1);
  });
});
