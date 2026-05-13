/**
 * Tests for DailyMissionsHub component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailyMissionsHub } from '../DailyMissionsHub';

// Mock hooks
const mockUseDailyMissions = vi.fn();
vi.mock('@/hooks/useDailyMissions', () => ({
  useDailyMissions: () => mockUseDailyMissions(),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{{${k}}}`, v);
        }
        return result;
      }
      return key;
    },
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Fix rotation to [wordHunt, multiplayer, brainDrills] for all tests
vi.mock('@/shared/dailyQuestPool', async () => {
  const actual = await vi.importActual<typeof import('@/shared/dailyQuestPool')>('@/shared/dailyQuestPool');
  return {
    ...actual,
    getDailyQuestModes: vi.fn().mockReturnValue(['wordHunt', 'multiplayer', 'brainDrills']),
  };
});

const baseMissions = [
  { type: 'wordHunt' as const, completed: false, href: '/daily' },
  { type: 'multiplayer' as const, completed: false, href: '/multiplayer' },
  { type: 'brainDrills' as const, completed: false, href: '/brain' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAuthenticated: true });
  mockUseDailyMissions.mockReturnValue({
    missions: baseMissions,
    completedCount: 0,
    isGrandSlam: false,
    grandSlamClaimed: false,
    loading: false,
    refresh: vi.fn(),
  });
});

describe('DailyMissionsHub', () => {
  it('renders nothing for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    const { container } = render(<DailyMissionsHub />);

    expect(container.innerHTML).toBe('');
  });

  it('renders loading skeleton when loading', () => {
    mockUseDailyMissions.mockReturnValue({
      missions: baseMissions,
      completedCount: 0,
      isGrandSlam: false,
      grandSlamClaimed: false,
      loading: true,
      refresh: vi.fn(),
    });

    render(<DailyMissionsHub />);

    const loader = document.querySelector('[aria-busy="true"]');
    expect(loader).toBeTruthy();
  });

  it('renders the title', () => {
    render(<DailyMissionsHub />);

    expect(screen.getByText('dailyMissions.title')).toBeTruthy();
  });

  it('renders all 3 mission rows from rotation', () => {
    render(<DailyMissionsHub />);

    // rotation mock: [wordHunt, multiplayer, brainDrills]
    expect(screen.getByText('dailyMissions.wordHunt')).toBeTruthy();
    expect(screen.getByText('dailyMissions.multiplayer')).toBeTruthy();
    expect(screen.getByText('dailyMissions.brainDrills')).toBeTruthy();
  });

  it('renders progress text', () => {
    render(<DailyMissionsHub />);

    expect(screen.getByText('dailyMissions.progress')).toBeTruthy();
  });

  it('renders grand slam description when not all complete', () => {
    render(<DailyMissionsHub />);

    expect(screen.getByText('dailyMissions.grandSlamDesc')).toBeTruthy();
  });

  it('renders grand slam badge when all missions complete', () => {
    mockUseDailyMissions.mockReturnValue({
      missions: baseMissions.map(m => ({ ...m, completed: true })),
      completedCount: 3,
      isGrandSlam: true,
      grandSlamClaimed: false,
      loading: false,
      refresh: vi.fn(),
    });

    render(<DailyMissionsHub />);

    expect(screen.getByText('dailyMissions.grandSlam')).toBeTruthy();
    expect(screen.getByText('dailyMissions.grandSlamBonus')).toBeTruthy();
  });

  it('shows claimed state when grand slam already claimed', () => {
    mockUseDailyMissions.mockReturnValue({
      missions: baseMissions.map(m => ({ ...m, completed: true })),
      completedCount: 3,
      isGrandSlam: true,
      grandSlamClaimed: true,
      loading: false,
      refresh: vi.fn(),
    });

    render(<DailyMissionsHub />);

    // Should show "Grand Slam! Completed!" text
    const texts = screen.getAllByText(/dailyMissions\.(grandSlam|completed)/);
    expect(texts.length).toBeGreaterThanOrEqual(1);
  });

  it('mission rows have correct links', () => {
    render(<DailyMissionsHub />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map(l => l.getAttribute('href'));
    // rotation mock: [wordHunt, multiplayer, brainDrills]
    expect(hrefs).toContain('/en/daily');
    expect(hrefs).toContain('/en/multiplayer');
    expect(hrefs).toContain('/en/brain');
  });
});
