import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  claimStaleBuildReload,
  clientBuildIdentity,
  getStaleBuildReloadGuard,
  isBuildStale,
  shouldAutoReloadStaleBuild,
  tabOpenMs,
  STALE_BUILD_MIN_TAB_OPEN_MS,
  STALE_BUILD_RELOAD_GUARD_KEY,
  STALE_BUILD_RELOAD_MIN_INTERVAL_MS,
} from '../staleBuildAutoReload';

describe('isBuildStale', () => {
  it('compares commits when both are known', () => {
    expect(
      isBuildStale({
        clientCommit: 'aaa',
        serverCommit: 'bbb',
        clientBuildTime: 't1',
        serverBuildTime: 't1', // buildTime agrees — commit still wins
      }),
    ).toBe(true);
  });

  it('commit match means not stale even if buildTime differs', () => {
    expect(
      isBuildStale({
        clientCommit: 'aaa',
        serverCommit: 'aaa',
        clientBuildTime: 't1',
        serverBuildTime: 't2',
      }),
    ).toBe(false);
  });

  it('falls back to buildTime when the server commit is unknown', () => {
    expect(
      isBuildStale({
        clientCommit: 'aaa',
        serverCommit: 'unknown',
        clientBuildTime: 't1',
        serverBuildTime: 't2',
      }),
    ).toBe(true);
  });

  it('falls back to buildTime when the client commit is missing', () => {
    expect(
      isBuildStale({
        clientCommit: undefined,
        serverCommit: 'bbb',
        clientBuildTime: 't1',
        serverBuildTime: 't1',
      }),
    ).toBe(false);
  });

  it('never reports stale when both signals are missing (fail-safe)', () => {
    expect(
      isBuildStale({
        clientCommit: undefined,
        serverCommit: 'unknown',
        clientBuildTime: undefined,
        serverBuildTime: undefined,
      }),
    ).toBe(false);
  });
});

describe('shouldAutoReloadStaleBuild', () => {
  const base = {
    stale: true,
    visible: true,
    isInGame: false,
    tabOpenMs: STALE_BUILD_MIN_TAB_OPEN_MS + 1,
    lastReloadAt: null,
    now: 1_000_000_000,
  };

  it('allows a stale, old, visible, idle tab', () => {
    expect(shouldAutoReloadStaleBuild(base)).toBe(true);
  });

  it('refuses when the build matches', () => {
    expect(shouldAutoReloadStaleBuild({ ...base, stale: false })).toBe(false);
  });

  it('never reloads a hidden tab', () => {
    expect(shouldAutoReloadStaleBuild({ ...base, visible: false })).toBe(false);
  });

  it('never reloads mid-game', () => {
    expect(shouldAutoReloadStaleBuild({ ...base, isInGame: true })).toBe(false);
  });

  it('refuses tabs younger than the minimum open age', () => {
    expect(
      shouldAutoReloadStaleBuild({ ...base, tabOpenMs: STALE_BUILD_MIN_TAB_OPEN_MS - 1 }),
    ).toBe(false);
  });

  it('refuses inside the 30-minute loop-guard window', () => {
    expect(
      shouldAutoReloadStaleBuild({
        ...base,
        lastReloadAt: base.now - STALE_BUILD_RELOAD_MIN_INTERVAL_MS + 1000,
      }),
    ).toBe(false);
  });

  it('allows again once the loop-guard window has passed', () => {
    expect(
      shouldAutoReloadStaleBuild({
        ...base,
        lastReloadAt: base.now - STALE_BUILD_RELOAD_MIN_INTERVAL_MS,
      }),
    ).toBe(true);
  });
});

describe('sessionStorage loop guard', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('first claim wins, second claim inside 30 min loses, after 30 min wins again', () => {
    const t0 = 5_000_000;
    expect(claimStaleBuildReload(t0)).toBe(true);
    expect(getStaleBuildReloadGuard()).toBe(t0);
    expect(claimStaleBuildReload(t0 + 60_000)).toBe(false);
    expect(claimStaleBuildReload(t0 + STALE_BUILD_RELOAD_MIN_INTERVAL_MS)).toBe(true);
  });

  it('ignores a corrupt stored value', () => {
    sessionStorage.setItem(STALE_BUILD_RELOAD_GUARD_KEY, 'not-a-number');
    expect(getStaleBuildReloadGuard()).toBeNull();
    expect(claimStaleBuildReload(123)).toBe(true);
  });
});

describe('clientBuildIdentity / tabOpenMs', () => {
  it('reads the baked-in commit and build time', () => {
    const id = clientBuildIdentity({
      NEXT_PUBLIC_SENTRY_RELEASE: 'sha123',
      NEXT_PUBLIC_BUILD_TIME: '2026-10-27T00:00:00Z',
    } as NodeJS.ProcessEnv);
    expect(id).toEqual({ commit: 'sha123', buildTime: '2026-10-27T00:00:00Z' });
  });

  it('default path reads NEXT_PUBLIC_* via literal process.env access (Next only inlines that form)', () => {
    const src = readFileSync(join(__dirname, '..', 'staleBuildAutoReload.ts'), 'utf8');
    expect(src).toContain('process.env.NEXT_PUBLIC_SENTRY_RELEASE');
    expect(src).toContain('process.env.NEXT_PUBLIC_BUILD_TIME');
    expect(src).not.toMatch(/env\??:\s*NodeJS\.ProcessEnv\s*=\s*process\.env/);
  });

  it('default path reads the runtime process.env', () => {
    const prev = process.env.NEXT_PUBLIC_SENTRY_RELEASE;
    process.env.NEXT_PUBLIC_SENTRY_RELEASE = 'from-env';
    try {
      expect(clientBuildIdentity().commit).toBe('from-env');
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SENTRY_RELEASE;
      else process.env.NEXT_PUBLIC_SENTRY_RELEASE = prev;
    }
  });

  it('tabOpenMs derives age from performance.timeOrigin', () => {
    const age = tabOpenMs(() => performance.timeOrigin + 60_000);
    expect(age).toBe(60_000);
  });
});
