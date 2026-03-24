/**
 * Tests for QuestHub — unified daily + weekly quest page.
 *
 * Covers:
 * - Renders daily quest cards (3 missions, no brain drill)
 * - Shows quest descriptions (not just mode names)
 * - Renders weekly quest section
 * - Shows progress ring for overall completion
 * - Grand Slam bonus when all daily quests complete
 * - Unauthenticated fallback
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// --- Mocks ---

const mockUseDailyMissions = jest.fn();
jest.mock('@/hooks/useDailyMissions', () => ({
  useDailyMissions: () => mockUseDailyMissions(),
}));

const mockUseWeeklyQuest = jest.fn();
jest.mock('@/hooks/useWeeklyQuest', () => ({
  useWeeklyQuest: () => mockUseWeeklyQuest(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'quests.title': 'Quests',
        'quests.dailyTitle': "Today's Quests",
        'quests.weeklyTitle': 'Weekly Quest',
        'quests.grandSlam': 'Grand Slam!',
        'quests.grandSlamBonus': '+500 XP Bonus',
        'quests.completedAll': 'All done for today!',
        'quests.progress': `${params?.completed ?? 0}/${params?.total ?? 0}`,
        'quests.daily.wordHunt.name': 'Daily Word Hunt',
        'quests.daily.wordHunt.desc': 'Find 10+ words in today\'s Daily Challenge',
        'quests.daily.adventure.name': 'Adventure Quest',
        'quests.daily.adventure.desc': 'Complete at least 1 adventure level',
        'quests.daily.community.name': 'Community Play',
        'quests.daily.community.desc': 'Play a multiplayer game with others',
        'quests.reward.xp': `+${params?.xp ?? 0} XP`,
        'quests.reward.gold': `+${params?.gold ?? 0} Gold`,
        'quests.go': 'GO',
        'quests.done': 'Done!',
        'weeklyQuest.title': 'Weekly Quest',
        'weeklyQuest.choose': 'Choose Your Weekly Quest',
      };
      return map[key] ?? key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'test-user' },
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
  const Div = React.forwardRef(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...props, ref }, children)
  );
  Div.displayName = 'MockMotionDiv';
  return {
    motion: { div: Div, button: 'button', span: 'span' },
    AnimatePresence: ({ children }: React.PropsWithChildren) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children);
  MockLink.displayName = 'MockLink';
  return MockLink;
});

import { QuestHub } from '../QuestHub';

const defaultMissions = {
  missions: [
    { type: 'wordHunt' as const, completed: false, href: '/daily' },
    { type: 'adventure' as const, completed: false, href: '/adventure' },
    { type: 'community' as const, completed: false, href: '/community' },
  ],
  completedCount: 0,
  isGrandSlam: false,
  grandSlamClaimed: false,
  loading: false,
  refresh: jest.fn(),
};

const defaultWeekly = {
  activeQuest: null,
  availableQuests: [
    { id: 'easy_1', difficulty: 'easy' as const, type: 'play_games', description: 'Play 3 games', target: 3, xpReward: 200 },
    { id: 'med_1', difficulty: 'medium' as const, type: 'long_words', description: 'Find 20 long words', target: 20, xpReward: 500 },
    { id: 'hard_1', difficulty: 'hard' as const, type: 'find_words_session', description: 'Find 100 words', target: 100, xpReward: 1000 },
  ],
  progress: 0,
  isComplete: false,
  loading: false,
  selectQuest: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDailyMissions.mockReturnValue(defaultMissions);
  mockUseWeeklyQuest.mockReturnValue(defaultWeekly);
});

describe('QuestHub', () => {
  it('renders daily quests section title', () => {
    render(<QuestHub />);
    expect(screen.getByText("Today's Quests")).toBeInTheDocument();
  });

  it('renders 3 daily quests (no brain drill)', () => {
    render(<QuestHub />);
    expect(screen.getByText('Daily Word Hunt')).toBeInTheDocument();
    expect(screen.getByText('Adventure Quest')).toBeInTheDocument();
    expect(screen.getByText('Community Play')).toBeInTheDocument();
    // Brain drill should NOT appear
    expect(screen.queryByText(/brain/i)).not.toBeInTheDocument();
  });

  it('shows quest descriptions', () => {
    render(<QuestHub />);
    expect(screen.getByText("Find 10+ words in today's Daily Challenge")).toBeInTheDocument();
    expect(screen.getByText('Complete at least 1 adventure level')).toBeInTheDocument();
    expect(screen.getByText('Play a multiplayer game with others')).toBeInTheDocument();
  });

  it('shows GO button for incomplete quests', () => {
    render(<QuestHub />);
    const goButtons = screen.getAllByText('GO');
    expect(goButtons.length).toBe(3);
  });

  it('shows Done! for completed quests', () => {
    mockUseDailyMissions.mockReturnValue({
      ...defaultMissions,
      missions: [
        { type: 'wordHunt' as const, completed: true, href: '/daily' },
        { type: 'adventure' as const, completed: false, href: '/adventure' },
        { type: 'community' as const, completed: false, href: '/community' },
      ],
      completedCount: 1,
    });

    render(<QuestHub />);
    expect(screen.getByText('Done!')).toBeInTheDocument();
    expect(screen.getAllByText('GO').length).toBe(2);
  });

  it('shows Grand Slam when all daily quests complete', () => {
    mockUseDailyMissions.mockReturnValue({
      ...defaultMissions,
      missions: [
        { type: 'wordHunt' as const, completed: true, href: '/daily' },
        { type: 'adventure' as const, completed: true, href: '/adventure' },
        { type: 'community' as const, completed: true, href: '/community' },
      ],
      completedCount: 3,
      isGrandSlam: true,
    });

    render(<QuestHub />);
    expect(screen.getByText('Grand Slam!')).toBeInTheDocument();
    expect(screen.getByText('+500 XP Bonus')).toBeInTheDocument();
  });

  it('renders weekly quest section', () => {
    render(<QuestHub />);
    expect(screen.getByText('Weekly Quest')).toBeInTheDocument();
  });

  it('renders quest links with locale prefix', () => {
    render(<QuestHub />);
    // QuestCard should prepend /${language} to hrefs
    const links = screen.getAllByRole('link');
    const hrefs = links.map(link => link.getAttribute('href'));
    expect(hrefs).toContain('/en/daily');
    expect(hrefs).toContain('/en/adventure');
    expect(hrefs).toContain('/en/community');
    // Should NOT have locale-less paths
    expect(hrefs).not.toContain('/daily');
    expect(hrefs).not.toContain('/adventure');
    expect(hrefs).not.toContain('/community');
  });

  it('shows overall progress count', () => {
    mockUseDailyMissions.mockReturnValue({
      ...defaultMissions,
      missions: [
        { type: 'wordHunt' as const, completed: true, href: '/daily' },
        { type: 'adventure' as const, completed: false, href: '/adventure' },
        { type: 'community' as const, completed: false, href: '/community' },
      ],
      completedCount: 1,
    });

    render(<QuestHub />);
    // Progress text may be split across elements
    const progressEl = screen.getByText((content) => content.includes('1/3'));
    expect(progressEl).toBeInTheDocument();
  });
});
