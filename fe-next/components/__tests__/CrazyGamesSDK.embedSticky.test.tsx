import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CrazyGamesProvider, useCrazyGames } from '../CrazyGamesSDK';

function Probe() {
  const { isOnCrazyGamesPlatform, environment, isLoading } = useCrazyGames();
  return (
    <>
      <span data-testid="platform">{String(isOnCrazyGamesPlatform)}</span>
      <span data-testid="env">{String(environment)}</span>
      <span data-testid="loading">{String(isLoading)}</span>
    </>
  );
}

describe('CrazyGamesProvider — embed status is sticky', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete (window as unknown as { __crazyGamesEnvironment?: string }).__crazyGamesEnvironment;
    // Embed inside crazygames.com — sync detection seeds isInCrazyGamesIframe=true.
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

  it('keeps isOnCrazyGamesPlatform=true even when SDK reports environment=disabled (CG QA preview case)', async () => {
    // Stub SDK that resolves with env='disabled' (CG QA tool / ?disableAds=true behavior).
    (window as unknown as { CrazyGames: unknown }).CrazyGames = {
      SDK: {
        init: vi.fn().mockResolvedValue(undefined),
        getEnvironment: vi.fn().mockResolvedValue('disabled'),
        game: { isInstantMultiplayer: false, sdkGameLoadingStop: vi.fn() },
      },
    };

    render(
      <CrazyGamesProvider>
        <Probe />
      </CrazyGamesProvider>,
    );

    // Sticky flag from sync detection makes platform=true on first paint…
    expect(screen.getByTestId('platform').textContent).toBe('true');

    // …and stays true after the async SDK init downgrades env to 'disabled'.
    await waitFor(() => expect(screen.getByTestId('env').textContent).toBe('disabled'));
    expect(screen.getByTestId('platform').textContent).toBe('true');
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('platform').textContent).toBe('true');
  });

  it('calls sdkGameLoadingStop when iframe sticky is true even if SDK env=disabled (portal loader fix)', async () => {
    // Regression: portal loader (kawaii mascot) hangs when SDK init resolves env='disabled'
    // because the prior gate required env==='crazygames'. Iframe-sticky path must still dismiss
    // the portal loader.
    const stopSpy = vi.fn();
    (window as unknown as { __crazyGamesReady?: boolean }).__crazyGamesReady = true;
    (window as unknown as { CrazyGames: unknown }).CrazyGames = {
      SDK: {
        init: vi.fn().mockResolvedValue(undefined),
        getEnvironment: vi.fn().mockResolvedValue('disabled'),
        game: { isInstantMultiplayer: false, sdkGameLoadingStop: stopSpy },
      },
    };

    render(
      <CrazyGamesProvider>
        <Probe />
      </CrazyGamesProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(stopSpy).toHaveBeenCalled();
  });

  it('calls sdkGameLoadingStop when env=crazygames (happy path)', async () => {
    const stopSpy = vi.fn();
    (window as unknown as { __crazyGamesReady?: boolean }).__crazyGamesReady = true;
    (window as unknown as { CrazyGames: unknown }).CrazyGames = {
      SDK: {
        init: vi.fn().mockResolvedValue(undefined),
        getEnvironment: vi.fn().mockResolvedValue('crazygames'),
        game: { isInstantMultiplayer: false, sdkGameLoadingStop: stopSpy },
        user: { getUser: vi.fn().mockResolvedValue(null) },
      },
    };

    render(
      <CrazyGamesProvider>
        <Probe />
      </CrazyGamesProvider>,
    );

    await waitFor(() => expect(stopSpy).toHaveBeenCalledTimes(1));
  });

  it('logs a warning when sdkGameLoadingStop throws (was silently swallowed before)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (window as unknown as { __crazyGamesReady?: boolean }).__crazyGamesReady = true;
    (window as unknown as { CrazyGames: unknown }).CrazyGames = {
      SDK: {
        init: vi.fn().mockResolvedValue(undefined),
        getEnvironment: vi.fn().mockResolvedValue('crazygames'),
        game: {
          isInstantMultiplayer: false,
          sdkGameLoadingStop: vi.fn(() => { throw new Error('SDK in bad state'); }),
        },
        user: { getUser: vi.fn().mockResolvedValue(null) },
      },
    };

    render(
      <CrazyGamesProvider>
        <Probe />
      </CrazyGamesProvider>,
    );

    await waitFor(() => expect(warnSpy).toHaveBeenCalled());
    expect(warnSpy.mock.calls[0][0]).toMatch(/sdkGameLoadingStop/i);
  });
});
