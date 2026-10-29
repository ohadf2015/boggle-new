import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastResultsSummary } from '../BlastResultsSummary';
import type { BlastResultsData } from '../types';

vi.mock('../../results/useBlastResultsReveal', () => ({ useBlastResultsReveal: vi.fn() }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr' }),
}));

// Stub the unlock hook so we don't touch the Zustand store or sonner.
vi.mock('../hooks/useBlastBadgeUnlocks', () => ({
  useBlastBadgeUnlocks: vi.fn(() => []),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

import { useBlastBadgeUnlocks } from '../hooks/useBlastBadgeUnlocks';
import { trackGrowthEvent } from '@/utils/growthTracking';

const t = (key: string, fallbackOrVars?: string | Record<string, string | number>, extra?: Record<string, string | number>) => {
  const vars = typeof fallbackOrVars === 'string' ? extra : fallbackOrVars;
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
    expect(screen.getByTestId('blast-results-secondary-words').textContent).toContain('3');
    // Waves live on the journey track, not as a loose count that disagrees with checkpoint runs.
    expect(screen.queryByTestId('blast-results-secondary-waves')).toBeNull();
  });

  it('keeps the play-again footer pinned to the window bottom so it never needs a scroll', () => {
    render(
      <BlastResultsSummary results={makeResults()} t={t} onPlayAgain={noop} onQuit={noop} />,
    );
    const footer = screen.getByTestId('blast-results-cta-footer');
    expect(footer.className).toContain('sticky');
    expect(footer.className).toContain('bottom-0');
  });

  it('draws the run as a wave track with the failed wave marked and the next boss ahead', () => {
    const waveResults = [
      { waveNumber: 1, score: 2000, wordsFound: 1, clearPercentage: 92, reward: { stars: 3 as const, coins: 25, chestBonus: 12 } },
      { waveNumber: 2, score: 3000, wordsFound: 2, clearPercentage: 70 },
    ];
    render(
      <BlastResultsSummary results={makeResults({ wavesCompleted: 1, waveResults, clearPercentage: 70 })} t={t} onPlayAgain={noop} onQuit={noop} />,
    );
    const nodes = screen.getAllByTestId('blast-journey-node');
    expect(nodes.map((n) => [n.dataset.wave, n.dataset.status])).toEqual([['1', 'cleared'], ['2', 'failed']]);
    expect(screen.getByTestId('blast-journey-milestone').dataset.wave).toBe('5');
  });

  it('marks the wave pass bar on the clear meter from the real wave bar, not 90', () => {
    render(<BlastResultsSummary results={makeResults()} t={t} onPlayAgain={noop} onQuit={noop} />);
    // default fixture ended on wave 2, whose bar is 85%
    expect(screen.getByTestId('blast-results-clear-meter').dataset.pass).toBe('85');
    expect(screen.getByTestId('blast-results-fail-banner').textContent).toContain('blast.results.failHintPct');
    expect(screen.getByTestId('blast-results-fail-banner').textContent).toContain('85');
  });

  it('spells the best word as letter tiles', () => {
    render(<BlastResultsSummary results={makeResults({ bestWord: 'fish' })} t={t} onPlayAgain={noop} onQuit={noop} />);
    const tiles = screen.getByTestId('blast-results-best-word').querySelectorAll('[data-letter]');
    expect(Array.from(tiles).map((el) => el.textContent).join('')).toBe('FISH');
  });

  it('shows badges before the brag card', () => {
    (useBlastBadgeUnlocks as any).mockReturnValueOnce([{ id: 'firstBlast', icon: 'Sparkles', label: 'First Blast', isNew: true }]);
    render(<BlastResultsSummary results={makeResults({ percentile: 60 })} t={t} onPlayAgain={noop} onQuit={noop} />);
    const badges = screen.getByTestId('blast-results-badges');
    expect(badges.compareDocumentPosition(screen.getByTestId('blast-brag-card')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('states the one wave goal on the clear meter', () => {
    render(<BlastResultsSummary results={makeResults({ passPct: 85 })} t={t} onPlayAgain={noop} onQuit={noop} />);
    expect(screen.getByTestId('blast-results-goal').textContent).toBe('blast.objective.clearPercent 85');
    expect(screen.queryByTestId('blast-objective-summary')).toBeNull();
  });

  it('shows the new-best ribbon when the saved best arrives after first paint', () => {
    const base = makeResults({ finalScore: 7000, clearPercentage: 70 });
    const { rerender } = render(<BlastResultsSummary results={base} t={t} onPlayAgain={noop} onQuit={noop} />);
    expect(screen.queryByTestId('blast-results-new-best')).toBeNull();
    rerender(<BlastResultsSummary results={{ ...base, previousBest: 6000 }} t={t} onPlayAgain={noop} onQuit={noop} />);
    expect(screen.getByTestId('blast-results-new-best')).toBeDefined();
    expect(screen.getByTestId('blast-results-fail-banner')).toBeDefined();
  });

  it('hides the brag card until backend percentile resolves', () => {
    const { rerender } = render(
      <BlastResultsSummary
        results={makeResults({ percentile: undefined })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    // Card is now the BragCard — keyed off percentile availability.
    expect(screen.queryByTestId('blast-brag-card')).toBeNull();

    rerender(
      <BlastResultsSummary
        results={makeResults({ percentile: 88 })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    const card = screen.getByTestId('blast-brag-card');
    // Interpolated "beats {pct}" line carries the raw percentile value.
    expect(card.textContent).toContain('88');
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

  it('picks the results mascot pose by outcome tier', () => {
    const { rerender } = render(
      <BlastResultsSummary
        results={makeResults({ finalScore: 9000, previousBest: 6000, clearPercentage: 95 })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    const celebrating = screen.getByTestId('blast-results-mascot') as HTMLImageElement;
    expect(celebrating.dataset.tier).toBe('newBest');
    expect(celebrating.src).toContain('/blast/results/mascot-celebrate.webp');

    rerender(
      <BlastResultsSummary
        results={makeResults({ finalScore: 200, previousBest: 6000, clearPercentage: 50 })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    // Failing after clearing waves reads as progress, not defeat.
    expect((screen.getByTestId('blast-results-mascot') as HTMLImageElement).dataset.tier).toBe('mid');

    rerender(
      <BlastResultsSummary
        results={makeResults({
          finalScore: 200, previousBest: 6000, clearPercentage: 50, wavesCompleted: 0,
          waveResults: [{ waveNumber: 1, score: 200, wordsFound: 2, clearPercentage: 50 }],
        })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    const sad = screen.getByTestId('blast-results-mascot') as HTMLImageElement;
    expect(sad.dataset.tier).toBe('low');
    expect(sad.src).toContain('/blast/results/mascot-sad.webp');
  });

  it('shows coin, diamond and bomb chips, defaulting diamonds to 0', () => {
    render(
      <BlastResultsSummary
        results={{ ...makeResults({ sessionCoins: 14 }), bombsPopped: 3 }}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    expect(screen.getByTestId('blast-stat-coins').textContent).toContain('14');
    expect(screen.getByTestId('blast-stat-diamonds').textContent).toContain('0');
    expect(screen.getByTestId('blast-stat-bombs').textContent).toContain('3');
  });

  it('teases the next goal with a near-miss nudge when close to the best', () => {
    render(
      <BlastResultsSummary
        results={makeResults({ finalScore: 5900, previousBest: 6000, clearPercentage: 95 })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    const goal = screen.getByTestId('blast-results-next-goal');
    expect(goal.dataset.kind).toBe('personalBest');
    expect(goal.textContent).toContain('blast.results.reveal.goalBest 101');
    expect(screen.getByTestId('blast-results-near-miss')).toBeDefined();
  });

  it('names the leaderboard rival when the engine sends one', () => {
    render(
      <BlastResultsSummary
        results={{ ...makeResults({ finalScore: 5000, clearPercentage: 95 }), rival: { name: 'Maya', score: 5120 } }}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    expect(screen.getByTestId('blast-results-next-goal').textContent).toContain('Maya');
  });

  it('shows fail banner + hides stars when clearPercentage < 90', () => {
    render(
      <BlastResultsSummary
        // 27/36 = 75%; ceil(36*0.9)=33 → 6 tiles short
        results={makeResults({
          passPct: 90,
          clearPercentage: 75,
          stars: 1,
          tilesCleared: 27,
          totalTiles: 36,
        })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    const banner = screen.getByTestId('blast-results-fail-banner');
    expect(banner).toBeDefined();
    // Sprint 1 clarity guard: copy now leads with concrete shortfall instead
    // of percentages — "Just N tiles short!" reads sharper.
    const reason = screen.getByTestId('blast-fail-reason');
    expect(reason.textContent).toContain('blast.results.tilesShort');
    expect(reason.textContent).toContain('6');
    expect(banner.textContent).toContain('blast.results.failHintPct');
    // Stars row suppressed on fail; star-label key should not render.
    expect(screen.queryByText('blast.stars1')).toBeNull();
    // Header flips to fail copy.
    expect(screen.getByText('blast.results.waveFailed')).toBeDefined();
  });

  it('hides fail banner and shows stars when clearPercentage >= 90', () => {
    render(
      <BlastResultsSummary
        results={makeResults({ clearPercentage: 95, stars: 3 })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    expect(screen.queryByTestId('blast-results-fail-banner')).toBeNull();
    expect(screen.getByText('blast.stars3')).toBeDefined();
    expect(screen.queryByText('blast.results.waveFailed')).toBeNull();
  });

  // Sprint 3 polish: target_word goal acknowledgement closes the loop on
  // semantic-goal feedback regardless of fail/success.
  it('renders sticky CTA footer containing play-again + home', () => {
    render(
      <BlastResultsSummary
        results={makeResults()}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    const footer = screen.getByTestId('blast-results-cta-footer');
    expect(footer).toBeDefined();
    // Footer is the actual parent of the CTAs (not just the document).
    expect(footer.contains(screen.getByTestId('play-again-button'))).toBe(true);
    expect(footer.contains(screen.getByText('common.home'))).toBe(true);
    expect(footer.contains(screen.getByTestId('blast-results-leaderboard-link'))).toBe(true);
    expect(footer.querySelectorAll('[data-reveal="cta"]')).toHaveLength(1);
  });

  it('uses tryAgain copy on play-again button when wave failed', () => {
    render(
      <BlastResultsSummary
        results={makeResults({ clearPercentage: 50 })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    const btn = screen.getByTestId('play-again-button');
    expect(btn.textContent).toContain('blast.results.tryAgain');
    expect(btn.textContent).not.toContain('blast.playAgain');
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

describe('BlastResultsSummary — neo-brutalist polish', () => {
  const noop = () => {};
  const win = (o = {}) => makeResults({ clearPercentage: 95, stars: 3, ...o });
  const fail = (o = {}) => makeResults({ clearPercentage: 50, ...o });

  it('renders a celebratory confetti burst on a winning run', () => {
    render(
      <BlastResultsSummary results={win()} t={t} onPlayAgain={noop} onQuit={noop} />,
    );
    expect(screen.getByTestId('blast-results-confetti')).toBeDefined();
  });

  it('does NOT render confetti on a failed run', () => {
    render(
      <BlastResultsSummary results={fail()} t={t} onPlayAgain={noop} onQuit={noop} />,
    );
    expect(screen.queryByTestId('blast-results-confetti')).toBeNull();
  });

  it('score card uses a solid surface, not a soft gradient', () => {
    render(
      <BlastResultsSummary results={win()} t={t} onPlayAgain={noop} onQuit={noop} />,
    );
    const card = screen.getByTestId('blast-results-score-card');
    expect(card.className).not.toMatch(/bg-linear|bg-gradient/);
    expect(card.className).toContain('bg-neo-navy-light');
  });

  it('new-record ribbon uses a solid lime fill, not a gradient', () => {
    render(
      <BlastResultsSummary
        results={win({ finalScore: 9000, previousBest: 6000 })}
        t={t}
        onPlayAgain={noop}
        onQuit={noop}
      />,
    );
    const card = screen.getByTestId('blast-results-score-card');
    expect(card.innerHTML).not.toMatch(/from-neo-lime via-yellow/);
  });

  it('star-rating label uses full-contrast yellow (no opacity fade)', () => {
    render(
      <BlastResultsSummary results={win()} t={t} onPlayAgain={noop} onQuit={noop} />,
    );
    const label = screen.getByText('blast.stars3');
    expect(label.className).toContain('text-neo-yellow');
    expect(label.className).not.toMatch(/text-neo-yellow\//);
  });
});

describe('BlastResultsSummary — telemetry', () => {
  const noop = () => {};

  it('fires canonical results_viewed on mount', () => {
    vi.clearAllMocks();
    render(
      <BlastResultsSummary results={makeResults({ finalScore: 5000 })} t={t} onPlayAgain={noop} onQuit={noop} />,
    );
    expect(trackGrowthEvent).toHaveBeenCalledWith('results_viewed', expect.objectContaining({ mode: 'blast', score: 5000 }));
  });
});
