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

// Fix rotation to specific quest IDs for all tests
vi.mock('@/shared/dailyQuestPool', async () => {
  const actual = await vi.importActual<typeof import('@/shared/dailyQuestPool')>('@/shared/dailyQuestPool');
  return {
    ...actual,
    getDailyQuests: vi.fn().mockReturnValue([
      {
        id: 'long_word_6',
        type: 'longWord',
        target: 6,
        family: 'skill',
        titleKey: 'quests.daily.long_word_6.title',
        descKey: 'quests.daily.long_word_6.desc',
        href: '/daily',
        icon: '📏',
      },
      {
        id: 'mp_win',
        type: 'mpWin',
        target: 1,
        family: 'pvp',
        titleKey: 'quests.daily.mp_win.title',
        descKey: 'quests.daily.mp_win.desc',
        href: '/multiplayer',
        icon: '👑',
      },
      {
        id: 'play_brain',
        type: 'playMode',
        target: 1,
        family: 'discovery',
        titleKey: 'quests.daily.play_brain.title',
        descKey: 'quests.daily.play_brain.desc',
        href: '/brain',
        icon: '🧠',
        mode: 'brain',
      },
    ]),
  };
});

const baseMissions = [
  {
    slot: 0,
    questId: 'long_word_6',
    type: 'longWord' as const,
    family: 'skill' as const,
    target: 6,
    titleKey: 'quests.daily.long_word_6.title',
    descKey: 'quests.daily.long_word_6.desc',
    icon: '📏',
    completed: false,
    href: '/daily',
  },
  {
    slot: 1,
    questId: 'mp_win',
    type: 'mpWin' as const,
    family: 'pvp' as const,
    target: 1,
    titleKey: 'quests.daily.mp_win.title',
    descKey: 'quests.daily.mp_win.desc',
    icon: '👑',
    completed: false,
    href: '/multiplayer',
  },
  {
    slot: 2,
    questId: 'play_brain',
    type: 'playMode' as const,
    family: 'discovery' as const,
    target: 1,
    titleKey: 'quests.daily.play_brain.title',
    descKey: 'quests.daily.play_brain.desc',
    icon: '🧠',
    completed: false,
    href: '/brain',
  },
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

    // Mocked quests: [long_word_6, mp_win, play_brain]
    // Component uses mission.titleKey which should render via t()
    expect(screen.getByText('quests.daily.long_word_6.title')).toBeTruthy();
    expect(screen.getByText('quests.daily.mp_win.title')).toBeTruthy();
    expect(screen.getByText('quests.daily.play_brain.title')).toBeTruthy();
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

    // The component should render all missions as completed (strikethrough + checkmark)
    // Find the strikethrough text spans (they have line-through class)
    const strikethroughElements = document.querySelectorAll('span.line-through');
    expect(strikethroughElements.length).toBe(3);
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
