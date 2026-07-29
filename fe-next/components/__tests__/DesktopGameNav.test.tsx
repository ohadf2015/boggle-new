import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Override the global stub from vitest.setup.ts — this file tests the real component.
vi.unmock('@/components/DesktopGameNav');

import { DesktopGameNav } from '@/components/DesktopGameNav';

let mockIsInGame = false;
let mockIsOnCG = false;
let mockIsVeteran = true;
let mockPathname = '/en';

vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({ isInGame: mockIsInGame }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: mockIsOnCG }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/hooks/useIsPracticeVeteran', () => ({
  useIsPracticeVeteran: () => mockIsVeteran,
}));

describe('DesktopGameNav practice gate', () => {
  beforeEach(() => {
    mockIsInGame = false;
    mockIsOnCG = false;
    mockIsVeteran = true;
    mockPathname = '/en';
  });

  it('renders for veterans on home', () => {
    const { container } = render(<DesktopGameNav />);
    expect(container.querySelector('nav')).not.toBeNull();
  });

  it('hides for non-veterans on home page (still doing practice)', () => {
    mockIsVeteran = false;
    mockPathname = '/en';
    const { container } = render(<DesktopGameNav />);
    expect(container.querySelector('nav')).toBeNull();
  });

  it('hides for non-veterans inside singleplayer/practice route', () => {
    mockIsVeteran = false;
    mockPathname = '/en/singleplayer';
    const { container } = render(<DesktopGameNav />);
    expect(container.querySelector('nav')).toBeNull();
  });

  it('still hides during active gameplay (existing isInGame gate)', () => {
    mockIsInGame = true;
    const { container } = render(<DesktopGameNav />);
    expect(container.querySelector('nav')).toBeNull();
  });

  it('still hides on CrazyGames platform', () => {
    mockIsOnCG = true;
    const { container } = render(<DesktopGameNav />);
    expect(container.querySelector('nav')).toBeNull();
  });

  it('renders for non-veterans on non-practice routes (leaderboard/friends still reachable)', () => {
    mockIsVeteran = false;
    mockPathname = '/en/leaderboard';
    const { container } = render(<DesktopGameNav />);
    expect(container.querySelector('nav')).not.toBeNull();
  });
});
