import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Override the global stub from vitest.setup.ts — this file tests the real component.
vi.unmock('@/components/DesktopGameNav');

import { DesktopGameNav } from '@/components/DesktopGameNav';

let mockIsInGame = false;
let mockIsOnCG = false;
let mockIsVeteran = true;
let mockPathname = '/en';
const mockPush = vi.fn();

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
  useRouter: () => ({ push: mockPush }),
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
    mockPush.mockClear();
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

describe('DesktopGameNav navigation targets', () => {
  beforeEach(() => {
    mockIsInGame = false;
    mockIsOnCG = false;
    mockIsVeteran = true;
    mockPathname = '/en';
    mockPush.mockClear();
  });

  // Regression: the "Quick Play" tab used to router.push('/<lang>/singleplayer'),
  // a soft-deleted route whose only job is a server-side permanentRedirect (308)
  // to /multiplayer?quickPlay=true. Soft-navigating into a force-dynamic route that
  // immediately throws a redirect failed the client RSC fetch → browser-level
  // "page couldn't load". Point the tab at the canonical destination directly so
  // there is no redirect hop. (Class 3 — asymmetric path through a redirect stub.)
  it('routes Quick Play straight to the multiplayer quick-play flow (no /singleplayer redirect hop)', () => {
    const { getByText } = render(<DesktopGameNav />);
    fireEvent.click(getByText('nav.singleplayer'));
    expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?quickPlay=true');
    expect(mockPush).not.toHaveBeenCalledWith('/en/singleplayer');
  });

  it('routes the remaining tabs to their real pages', () => {
    const cases: Array<[string, string]> = [
      ['nav.home', '/en'],
      ['nav.play', '/en/multiplayer'],
      ['nav.daily', '/en/daily'],
      ['nav.leaderboard', '/en/leaderboard'],
      ['nav.friends', '/en/friends'],
    ];
    for (const [label, expected] of cases) {
      mockPush.mockClear();
      const { getByText, unmount } = render(<DesktopGameNav />);
      fireEvent.click(getByText(label));
      expect(mockPush).toHaveBeenCalledWith(expected);
      unmount();
    }
  });
});
