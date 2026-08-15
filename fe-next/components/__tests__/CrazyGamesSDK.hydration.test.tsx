import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CrazyGamesProvider, useCrazyGames } from '../CrazyGamesSDK';

/**
 * The FIRST client render must match the server's.
 *
 * THE DEFECT (Class 1 — dual source of truth, one resolving later): the
 * provider seeded `isInCrazyGamesIframe` and `environment` from
 * `detectCrazyGamesSync()` inside `useState` initialisers. That function reads
 * `window`, so it returns `false` during SSR and can return `true` on the very
 * first client render. Consumers branch on the result — `ChatBubble` returns
 * null on the platform, the leaderboard hides whole sections — so the first
 * client tree had elements the server HTML did not, which is React error #418.
 * React then discards the server markup and re-renders the page: a visible
 * flash, and a first tap that lands on nothing.
 *
 * Production (30d, lexiclash.live): 224 #418 events across 72 players — ~10% of
 * everyone — on `/`, `/en`, `/multiplayer` and `/daily` at once, which is the
 * signature of shared chrome rather than one page's component.
 *
 * The rule from `.claude/rules/60-recurring-pitfalls.md` is to render the
 * pessimistic state until every source has resolved. Here that means: start
 * false (what the server rendered), then adopt the detected value after mount.
 */
function Probe() {
  const { isOnCrazyGamesPlatform, environment } = useCrazyGames();
  return (
    <>
      <span data-testid="platform">{String(isOnCrazyGamesPlatform)}</span>
      <span data-testid="env">{String(environment)}</span>
    </>
  );
}

/** Records every render's value; index 0 is the render React diffs against SSR. */
function RenderRecorder({ sink }: { sink: string[] }) {
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  sink.push(String(isOnCrazyGamesPlatform));
  return <span data-testid="first">{String(isOnCrazyGamesPlatform)}</span>;
}

describe('CrazyGamesProvider — hydration safety', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete (window as unknown as { __crazyGamesEnvironment?: string }).__crazyGamesEnvironment;
    // Embedded inside crazygames.com — sync detection would return true.
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname: 'embed.example.com', ancestorOrigins: ['https://www.crazygames.com'] },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
    delete (window as unknown as { CrazyGames?: unknown }).CrazyGames;
    vi.restoreAllMocks();
  });

  it('first render reports OFF-platform, matching the server HTML', () => {
    const renders: string[] = [];
    render(
      <CrazyGamesProvider>
        <RenderRecorder sink={renders} />
      </CrazyGamesProvider>,
    );

    // Even though detectCrazyGamesSync() would say true, the initial render —
    // the one React diffs against the server markup — must say false.
    expect(renders[0]).toBe('false');
  });

  it('still adopts the embed status immediately after mount', async () => {
    render(
      <CrazyGamesProvider>
        <Probe />
      </CrazyGamesProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('platform').textContent).toBe('true');
    });
    expect(screen.getByTestId('env').textContent).toBe('crazygames');
  });
});
