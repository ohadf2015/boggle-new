import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

const registerSpy = vi.fn();
vi.mock('@/utils/posthogEngagement', async () => {
  const actual = await vi.importActual<typeof import('@/utils/posthogEngagement')>('@/utils/posthogEngagement');
  return {
    ...actual,
    setPostHogSuperProps: (props: Record<string, unknown>) => registerSpy(props),
  };
});

import { CrazyGamesProvider } from '../CrazyGamesSDK';

// Verifies every PostHog event auto-carries `is_cg` so funnel queries don't have
// to chain referrer/url filters that break on cross-domain bounce. Pre-fix the
// only CG signal was `platform='crazygames'` — and detectPlatform() ran only at
// PostHogProvider mount + a single 2s recheck, missing slow CG iframe inits.
describe('CrazyGamesProvider — is_cg super-property', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    registerSpy.mockClear();
    delete (window as unknown as { __crazyGamesEnvironment?: string }).__crazyGamesEnvironment;
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
    delete (window as unknown as { CrazyGames?: unknown }).CrazyGames;
    vi.restoreAllMocks();
  });

  it('registers is_cg=true when CG iframe sticky is detected', () => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname: 'embed.example.com', ancestorOrigins: ['https://www.crazygames.com'] },
      configurable: true,
    });

    render(<CrazyGamesProvider><span /></CrazyGamesProvider>);

    const calls = registerSpy.mock.calls.map((c) => c[0] as Record<string, unknown>);
    const cgCall = calls.find((c) => 'is_cg' in c);
    expect(cgCall?.is_cg).toBe(true);
  });

  it('does NOT register is_cg=true when not on CG', () => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname: 'lexiclash.live', ancestorOrigins: [] },
      configurable: true,
    });
    Object.defineProperty(document, 'referrer', { value: '', configurable: true });

    render(<CrazyGamesProvider><span /></CrazyGamesProvider>);

    const calls = registerSpy.mock.calls.map((c) => c[0] as Record<string, unknown>);
    const cgTrueCall = calls.find((c) => c.is_cg === true);
    expect(cgTrueCall).toBeUndefined();
  });
});
