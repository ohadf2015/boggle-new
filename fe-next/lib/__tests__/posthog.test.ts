/**
 * lib/posthog.ts — server key resolution (brain P0 38ac1a51): fall back across
 * the env names prod has actually carried, and go LOUD when none is set —
 * a silent null is what made the Teacher Pro return step invisible.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getPostHogServer, _resetPostHogServer } from '../posthog';

const KEYS = ['NEXT_PUBLIC_POSTHOG_KEY', 'POSTHOG_PROJECT_KEY', 'POSTHOG_API_KEY'] as const;

describe('getPostHogServer key resolution', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    _resetPostHogServer();
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    _resetPostHogServer();
  });

  it('returns null and logs a loud error ONCE when no key is configured', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(getPostHogServer()).toBeNull();
      expect(getPostHogServer()).toBeNull();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(String(errorSpy.mock.calls[0][0])).toContain('NEXT_PUBLIC_POSTHOG_KEY');
      expect(String(errorSpy.mock.calls[0][0])).toContain('POSTHOG_API_KEY');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('uses NEXT_PUBLIC_POSTHOG_KEY when present', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_primary';
    expect(getPostHogServer()).not.toBeNull();
  });

  it('falls back to POSTHOG_API_KEY when the public name is absent (prod carried it under this name)', () => {
    process.env.POSTHOG_API_KEY = 'phc_fallback';
    expect(getPostHogServer()).not.toBeNull();
  });

  it('falls back to POSTHOG_PROJECT_KEY when neither canonical name is set', () => {
    process.env.POSTHOG_PROJECT_KEY = 'phc_project';
    expect(getPostHogServer()).not.toBeNull();
  });

  it('is a singleton per process', () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_primary';
    expect(getPostHogServer()).toBe(getPostHogServer());
  });
});
