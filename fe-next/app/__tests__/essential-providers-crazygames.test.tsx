/**
 * Regression: CrazyGamesProvider must mount globally so SIGN IN / SIGN UP
 * chrome on non-game routes (landing, blog, etc.) reacts to CG embed status.
 * Previously the provider sat inside GameSpecificProviders → noop on landing
 * → external auth buttons leaked into CrazyGames iframe previews.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { CrazyGamesProvider, useCrazyGames } from '@/components/CrazyGamesSDK';

const ESSENTIAL_PROVIDERS_SRC = readFileSync(
  join(process.cwd(), 'app', 'essential-providers.tsx'),
  'utf-8',
);
const GAME_PROVIDERS_SRC = readFileSync(
  join(process.cwd(), 'app', 'providers.tsx'),
  'utf-8',
);

describe('CrazyGamesProvider mount location', () => {
  it('is wired into EssentialProviders so chrome on every route can gate on it', () => {
    expect(ESSENTIAL_PROVIDERS_SRC).toMatch(/from ['"]@\/components\/CrazyGamesSDK['"]/);
    expect(ESSENTIAL_PROVIDERS_SRC).toMatch(/<CrazyGamesProvider>/);
    expect(ESSENTIAL_PROVIDERS_SRC).toMatch(/<\/CrazyGamesProvider>/);
  });

  it('is NOT also mounted inside GameSpecificProviders (would split context)', () => {
    expect(GAME_PROVIDERS_SRC).not.toMatch(/<CrazyGamesProvider>/);
  });

  it('useCrazyGames returns live provider context (isLoading=true initially) when wrapped', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CrazyGamesProvider>{children}</CrazyGamesProvider>
    );
    const { result } = renderHook(() => useCrazyGames(), { wrapper });
    // Live provider boots with isLoading=true; the noop is isLoading=false.
    expect(result.current.isLoading).toBe(true);
  });

  it('useCrazyGames returns noop (isLoading=false, isOnCrazyGamesPlatform=false) without provider', () => {
    const { result } = renderHook(() => useCrazyGames());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isOnCrazyGamesPlatform).toBe(false);
  });
});
