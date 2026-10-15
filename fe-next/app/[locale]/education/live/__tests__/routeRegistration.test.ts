import { describe, it, expect } from 'vitest';
import { needsGameProviders } from '@/app/conditional-providers';
import { resolveEducationNav } from '@/components/education/shell/navItems';
import { isQuietChromeSurface } from '@/components/education/shell/quietChromeRoutes';
import { isAdFreeRoute } from '@/lib/admob-routes';
import { isHeavyGamePath, rendersSiteChrome } from '@/lib/perf/heavyGamePath';

const LIVE = ['/en/education/live', '/he/education/live', '/education/live'];

describe('edu live route registration', () => {
  it.each(LIVE)('given %s, when providers resolve, then the socket/game stack mounts', (path) => {
    expect(needsGameProviders(path)).toBe(true);
  });

  it.each(LIVE)('given %s, when the edu shell resolves, then it shows no tab chrome', (path) => {
    expect(resolveEducationNav(path)).toBeNull();
  });

  it.each(LIVE)('given %s, when quiet chrome is checked, then install prompts stay away', (path) => {
    expect(isQuietChromeSurface(path)).toBe(true);
  });

  it.each(LIVE)('given %s, when ads ask, then it is ad-free without any query flag', (path) => {
    expect(isAdFreeRoute(path, new URLSearchParams('room=AB12'))).toBe(true);
    expect(isAdFreeRoute(path, null)).toBe(true);
  });

  it.each(LIVE)('given %s, when the layout decides site chrome, then it is a full-screen game', (path) => {
    expect(isHeavyGamePath(path)).toBe(true);
    expect(rendersSiteChrome(path)).toBe(false);
  });

  it('given a sibling edu page, when checked, then it is not swept into the game route', () => {
    expect(needsGameProviders('/en/education/lists')).toBe(false);
    expect(isHeavyGamePath('/en/education/lists')).toBe(false);
  });
});
