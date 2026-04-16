import { vi, describe, test, expect, beforeEach, type MockedFunction } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CrazyGamesRouteGuard } from '@/components/CrazyGamesRouteGuard';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { usePathname, useRouter } from 'next/navigation';

vi.mock('@/components/CrazyGamesSDK');
vi.mock('next/navigation');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

const mockCG = useCrazyGames as MockedFunction<typeof useCrazyGames>;
const mockPath = usePathname as MockedFunction<typeof usePathname>;
const mockRouter = useRouter as unknown as MockedFunction<() => { replace: (p: string) => void }>;
const replace = vi.fn();

function cg(on: boolean, loading = false) {
  return {
    isOnCrazyGamesPlatform: on,
    isAvailable: on,
    environment: on ? 'crazygames' : null,
    isLoading: loading,
    deviceType: 'desktop',
    isLandscape: true,
    viewportSize: { width: 1024, height: 768 },
  } as unknown as ReturnType<typeof useCrazyGames>;
}

describe('CrazyGamesRouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.mockReturnValue({ replace });
  });

  test('redirects to /{locale}/multiplayer when on CG and path is not multiplayer', () => {
    mockCG.mockReturnValue(cg(true));
    mockPath.mockReturnValue('/en/daily');
    render(<CrazyGamesRouteGuard />);
    expect(replace).toHaveBeenCalledWith('/en/multiplayer');
  });

  test('redirects from homepage /{locale} on CG', () => {
    mockCG.mockReturnValue(cg(true));
    mockPath.mockReturnValue('/en');
    render(<CrazyGamesRouteGuard />);
    expect(replace).toHaveBeenCalledWith('/en/multiplayer');
  });

  test('does not redirect when already on /{locale}/multiplayer', () => {
    mockCG.mockReturnValue(cg(true));
    mockPath.mockReturnValue('/en/multiplayer');
    render(<CrazyGamesRouteGuard />);
    expect(replace).not.toHaveBeenCalled();
  });

  test('does not redirect on /{locale}/multiplayer/sub-path', () => {
    mockCG.mockReturnValue(cg(true));
    mockPath.mockReturnValue('/en/multiplayer/room/ABC');
    render(<CrazyGamesRouteGuard />);
    expect(replace).not.toHaveBeenCalled();
  });

  test('does not redirect when not on CrazyGames', () => {
    mockCG.mockReturnValue(cg(false));
    mockPath.mockReturnValue('/en/daily');
    render(<CrazyGamesRouteGuard />);
    expect(replace).not.toHaveBeenCalled();
  });

  test('does not redirect while CG SDK is loading', () => {
    mockCG.mockReturnValue(cg(true, true));
    mockPath.mockReturnValue('/en/daily');
    render(<CrazyGamesRouteGuard />);
    expect(replace).not.toHaveBeenCalled();
  });
});
