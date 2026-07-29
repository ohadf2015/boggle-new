import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const trackSpy = vi.fn();
vi.mock('@/utils/growthTracking', async () => {
  const actual = await vi.importActual<typeof import('@/utils/growthTracking')>('@/utils/growthTracking');
  return { ...actual, trackGrowthEvent: (...args: unknown[]) => trackSpy(...args) };
});

import { CrazyGamesProvider, useCrazyGames } from '../CrazyGamesSDK';

function Probe() {
  const { showAuthPrompt, isLoading } = useCrazyGames();
  return (
    <button
      data-testid="trigger"
      data-loading={String(isLoading)}
      onClick={() => { void showAuthPrompt(); }}
    >
      go
    </button>
  );
}

// Without per-outcome tracking, CG auth was an opaque coin-flip in PostHog —
// 0 signups for CG cohort over 90d, but no signal for whether CG SDK auth was
// dismissed, errored, or never invoked. cg_auth_prompt_outcome closes the gap
// without breaking CG ToS (which forbids external email/OAuth as fallback).
describe('CrazyGamesSDK — showAuthPrompt outcome telemetry', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    trackSpy.mockClear();
    delete (window as unknown as { __crazyGamesEnvironment?: string }).__crazyGamesEnvironment;
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

  function stubSDK(opts: { existing?: unknown; promptResult?: unknown; promptThrows?: unknown }) {
    (window as unknown as { CrazyGames: unknown }).CrazyGames = {
      SDK: {
        init: vi.fn().mockResolvedValue(undefined),
        getEnvironment: vi.fn().mockResolvedValue('crazygames'),
        game: { isInstantMultiplayer: false, sdkGameLoadingStop: vi.fn() },
        user: {
          getUser: vi.fn().mockResolvedValue(opts.existing ?? null),
          showAuthPrompt: opts.promptThrows
            ? vi.fn().mockRejectedValue(opts.promptThrows)
            : vi.fn().mockResolvedValue(opts.promptResult ?? null),
        },
      },
    };
  }

  it('emits cg_auth_prompt_outcome=success when SDK returns a user', async () => {
    stubSDK({ promptResult: { username: 'tester' } });
    render(<CrazyGamesProvider><Probe /></CrazyGamesProvider>);
    await waitFor(() => expect(screen.getByTestId('trigger').dataset.loading).toBe('false'));

    screen.getByTestId('trigger').click();

    await waitFor(() => {
      const call = trackSpy.mock.calls.find((c) => c[0] === 'cg_auth_prompt_outcome');
      expect(call).toBeTruthy();
      expect((call?.[1] as { result?: string })?.result).toBe('success');
    });
  });

  it('emits cg_auth_prompt_outcome=dismiss when SDK returns null', async () => {
    stubSDK({ promptResult: null });
    render(<CrazyGamesProvider><Probe /></CrazyGamesProvider>);
    await waitFor(() => expect(screen.getByTestId('trigger').dataset.loading).toBe('false'));

    screen.getByTestId('trigger').click();

    await waitFor(() => {
      const call = trackSpy.mock.calls.find((c) => c[0] === 'cg_auth_prompt_outcome');
      expect((call?.[1] as { result?: string })?.result).toBe('dismiss');
    });
  });

  it('emits cg_auth_prompt_outcome=already_signed_in when SDK throws userAlreadySignedIn', async () => {
    stubSDK({
      existing: null,
      promptThrows: { code: 'userAlreadySignedIn' },
    });
    // After throw we re-fetch existing user; stub returns null so result still dismiss-ish, but outcome must distinguish
    render(<CrazyGamesProvider><Probe /></CrazyGamesProvider>);
    await waitFor(() => expect(screen.getByTestId('trigger').dataset.loading).toBe('false'));

    screen.getByTestId('trigger').click();

    await waitFor(() => {
      const call = trackSpy.mock.calls.find((c) => c[0] === 'cg_auth_prompt_outcome');
      expect((call?.[1] as { result?: string })?.result).toBe('already_signed_in');
    });
  });
});
