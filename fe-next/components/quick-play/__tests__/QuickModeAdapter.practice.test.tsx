/**
 * Quick Play must not inherit Daily Challenge behaviour.
 *
 * Word Hunt's quit dialog and its daily-only HUD (tier badge / tries counter)
 * are both gated on the `practice` prop. `DailyWordHuntSurvival` reads it to
 * choose `wordHunt.*` copy over the ad-gated `daily.*` copy ("You'll need to
 * watch an ad to play again today") — wrong inside a mode whose promise is
 * unlimited 60-second rounds.
 *
 * Those gates are tested at the component level, but nothing covered the LINK:
 * that this adapter actually threads `practice` down. A silently-unthreaded
 * prop looks correct in review and ships the daily copy anyway, so this asserts
 * the exact value the adapter passes.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickModeAdapter } from '../adapters/QuickModeAdapter';
import type { QuickRoundConfig } from '../types';

// next/dynamic resolves the real game chunks; swap it for a stub that surfaces
// the props it was handed so we can assert on them.
vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = (props: Record<string, unknown>) => (
      <div
        data-testid="dynamic-game"
        data-practice={String(props.practice)}
        data-quit-stays={String(props.quitStaysOnPage)}
      />
    );
    return Stub;
  },
}));

vi.mock('../adapters/BlastQuickRound', () => ({
  BlastQuickRound: () => <div data-testid="blast-stub" />,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false }),
}));

const noop = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => noop,
}));

function configFor(mode: QuickRoundConfig['mode']): QuickRoundConfig {
  return {
    mode,
    seed: 'test-seed',
    language: 'en',
    durationSec: 60,
    grid: [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I'],
    ],
    targetWord: 'BEACH',
    totalWords: 10,
    perfectScore: 100,
  };
}

describe('QuickModeAdapter — daily behaviour must not leak into Quick Play', () => {
  it('GIVEN word-hunt WHEN mounted THEN the game receives practice=true', () => {
    render(
      <QuickModeAdapter config={configFor('word-hunt')} onDone={vi.fn()} onQuit={vi.fn()} />
    );

    // Explicitly 'true' — an unthreaded prop stringifies to 'undefined' here,
    // which is precisely the regression this guards.
    expect(screen.getByTestId('dynamic-game')).toHaveAttribute('data-practice', 'true');
  });

  it('GIVEN word-hunt WHEN mounted THEN quitting stays on the page', () => {
    render(
      <QuickModeAdapter config={configFor('word-hunt')} onDone={vi.fn()} onQuit={vi.fn()} />
    );

    // Quick Play quits back to the hub rather than routing to /daily.
    expect(screen.getByTestId('dynamic-game')).toHaveAttribute('data-quit-stays', 'true');
  });
});
