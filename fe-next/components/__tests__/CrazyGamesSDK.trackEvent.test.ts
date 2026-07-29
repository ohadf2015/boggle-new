/**
 * CrazyGames SDK — trackEvent wrapper (source-level contract)
 *
 * Full-launch QA asks games to emit `trackEvent` at key moments. A source
 * contract is the least invasive check: it locks the wrapper exists and is
 * wired into the context without booting the full provider (which needs
 * viewport/scroll/SDK-init mocks).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CRAZYGAMES_NOOP_CONTEXT } from '@/types/crazygames';

describe('CrazyGamesSDK — trackEvent wrapper', () => {
  const sdkSource = readFileSync(
    resolve(__dirname, '../CrazyGamesSDK.tsx'),
    'utf8',
  );
  const typesSource = readFileSync(
    resolve(__dirname, '../../types/crazygames.ts'),
    'utf8',
  );

  it('declares trackEvent in CrazyGamesContextType', () => {
    expect(typesSource).toMatch(/trackEvent:\s*\(eventName:\s*string\)\s*=>\s*void/);
  });

  it('exposes noop trackEvent via CRAZYGAMES_NOOP_CONTEXT', () => {
    expect(typeof CRAZYGAMES_NOOP_CONTEXT.trackEvent).toBe('function');
    expect(() => CRAZYGAMES_NOOP_CONTEXT.trackEvent('any')).not.toThrow();
  });

  it('defines trackEvent useCallback in provider', () => {
    expect(sdkSource).toMatch(/const\s+trackEvent\s*=\s*useCallback/);
  });

  it('invokes window.CrazyGames.SDK.game.trackEvent when available', () => {
    expect(sdkSource).toMatch(/window\.CrazyGames\.SDK\.game\.trackEvent\(/);
  });

  it('guards trackEvent call with typeof-function check (SDK version safety)', () => {
    expect(sdkSource).toMatch(/typeof\s+window\.CrazyGames\?\.SDK\?\.game\?\.trackEvent\s*===\s*['"]function['"]/);
  });

  it('exports trackEvent in the context value', () => {
    expect(sdkSource).toMatch(/value:\s*CrazyGamesContextType\s*=\s*\{[\s\S]*?trackEvent[\s\S]*?\}/);
  });
});
