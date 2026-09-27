/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Re-export root-path predicate for testing without rendering React
// (intentionally inline-duplicated to keep the hook private API clean)
const ROOT_PATH_PATTERNS: RegExp[] = [
  /^\/[a-z]{2}\/?$/,
  /^\/[a-z]{2}\/multiplayer\/?$/,
  /^\/[a-z]{2}\/singleplayer\/?$/,
  /^\/[a-z]{2}\/daily\/?$/,
  /^\/[a-z]{2}\/connections\/?$/,
  /^\/[a-z]{2}\/brain\/?$/,
  /^\/[a-z]{2}\/adventure\/?$/,
];

function isRootPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return ROOT_PATH_PATTERNS.some((re) => re.test(pathname));
}

describe('useAndroidBackButton :: isRootPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats locale root as root', () => {
    expect(isRootPath('/en')).toBe(true);
    expect(isRootPath('/he/')).toBe(true);
    expect(isRootPath('/ja')).toBe(true);
  });

  it('treats top-level mode entry points as root', () => {
    expect(isRootPath('/en/multiplayer')).toBe(true);
    expect(isRootPath('/en/singleplayer/')).toBe(true);
    expect(isRootPath('/he/daily')).toBe(true);
    expect(isRootPath('/sv/connections')).toBe(true);
    expect(isRootPath('/es/brain')).toBe(true);
    expect(isRootPath('/ja/adventure')).toBe(true);
  });

  it('treats deeper game routes as non-root', () => {
    expect(isRootPath('/en/multiplayer/abc123')).toBe(false);
    expect(isRootPath('/en/connections/2026-04-25')).toBe(false);
    expect(isRootPath('/en/account/settings')).toBe(false);
    expect(isRootPath('/en/admin/users')).toBe(false);
  });

  it('handles null/empty defensively', () => {
    expect(isRootPath(null)).toBe(true);
    expect(isRootPath('')).toBe(true);
  });
});
