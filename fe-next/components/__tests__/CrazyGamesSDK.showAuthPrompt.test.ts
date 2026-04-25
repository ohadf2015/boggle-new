/**
 * CrazyGamesSDK — showAuthPrompt guard (Sentry JAVASCRIPT-NEXTJS-128/129)
 *
 * CrazyGames HTML5 SDK throws `userAlreadySignedIn` (and prints a branded
 * console.error) when `user.showAuthPrompt()` is invoked while the user is
 * already authenticated. Our wrapper must avoid the prompt in that case to
 * silence both Sentry issues.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('CrazyGamesSDK — showAuthPrompt guard', () => {
  const sdkSource = readFileSync(
    resolve(__dirname, '../CrazyGamesSDK.tsx'),
    'utf8',
  );

  it('checks getUser() before invoking showAuthPrompt', () => {
    expect(sdkSource).toMatch(
      /showAuthPrompt\s*=\s*useCallback[\s\S]*?sdkUser\.getUser\(\)[\s\S]*?sdkUser\.showAuthPrompt\(\)/,
    );
  });

  it('catches userAlreadySignedIn and returns current user instead', () => {
    expect(sdkSource).toMatch(/code\s*===\s*['"]userAlreadySignedIn['"]/);
  });

  it('returns null on unhandled SDK errors instead of rejecting', () => {
    expect(sdkSource).toMatch(
      /showAuthPrompt\s*=\s*useCallback[\s\S]*?catch\s*\([\s\S]*?return null;[\s\S]*?\},\s*\[isAvailable\]\)/,
    );
  });
});
