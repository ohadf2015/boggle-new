/**
 * Tests for WeeklyQuestCard component
 *
 * Covers: no quest state, active quest, completed quest, loading
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock useWeeklyQuest
const mockUseWeeklyQuest = vi.fn();
vi.mock('@/hooks/useWeeklyQuest', () => ({
  useWeeklyQuest: () => mockUseWeeklyQuest(),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'weeklyQuest.title': 'Weekly Quest',
        'weeklyQuest.choose': 'Choose Your Weekly Quest',
        'weeklyQuest.active': 'Active Quest',
        'weeklyQuest.complete': 'Quest Complete!',
        'weeklyQuest.progress': `${params?.current ?? 0}/${params?.target ?? 0}`,
        'weeklyQuest.xpReward': `+${params?.xp ?? 0} XP`,
        'weeklyQuest.newQuestMonday': 'New quests available Monday',
      };
      return map[key] ?? key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const Div = React.forwardRef(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...props, ref }, children)
  );
  Div.displayName = 'MockMotionDiv';
  return {
    m: { div: Div, button: 'button' },
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  };
});

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

vi.mock('@/components/avatar/PartPreview', () => ({
  __esModule: true,
  default: () => React.createElement('svg', { 'data-testid': 'part-preview' }),
}));

import { WeeklyQuestCard } from '../WeeklyQuestCard';

const mockAvailableQuests = [
  { id: 'easy_1', difficulty: 'easy' as const, type: 'play_games', description: 'Play 3 games', target: 3, xpReward: 200, avatarPartReward: { category: 'eyes', partId: 'monocleEye' } },
  { id: 'med_1', difficulty: 'medium' as const, type: 'long_words', description: 'Find 20 long words', target: 20, xpReward: 500, avatarPartReward: { category: 'accessory', partId: 'crown' } },
  { id: 'hard_1', difficulty: 'hard' as const, type: 'find_words_session', description: 'Find 100 words', target: 100, xpReward: 1000, avatarPartReward: { category: 'eyes', partId: 'galaxy' } },
];

beforeEach(() => vi.clearAllMocks());

describe('WeeklyQuestCard', () => {
  it('renders loading state as null', () => {
    mockUseWeeklyQuest.mockReturnValue({
      activeQuest: null,
      availableQuests: [],
      progress: 0,
      isComplete: false,
      loading: true,
      selectQuest: vi.fn(),
    });

    const { container } = render(<WeeklyQuestCard />);
    expect(container.firstChild).toBeNull();
  });

  it('shows quest selector when no quest active', () => {
    mockUseWeeklyQuest.mockReturnValue({
      activeQuest: null,
      availableQuests: mockAvailableQuests,
      progress: 0,
      isComplete: false,
      loading: false,
      selectQuest: vi.fn(),
    });

    render(<WeeklyQuestCard />);
    expect(screen.getByText('Choose Your Weekly Quest')).toBeInTheDocument();
  });

  it('shows active quest with progress', () => {
    mockUseWeeklyQuest.mockReturnValue({
      activeQuest: {
        id: 'quest-uuid',
        questType: 'play_games',
        title: 'Play 3 games',
        description: 'Play 3 games this week',
        target: 3,
        current: 1,
        xpReward: 200,
        completed: false,
        difficulty: 'easy',
      },
      availableQuests: mockAvailableQuests,
      progress: 1,
      isComplete: false,
      loading: false,
      selectQuest: vi.fn(),
    });

    render(<WeeklyQuestCard />);
    expect(screen.getByText('Active Quest')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('+200 XP')).toBeInTheDocument();
  });

  it('shows celebration state when quest complete', () => {
    mockUseWeeklyQuest.mockReturnValue({
      activeQuest: {
        id: 'quest-uuid',
        questType: 'play_games',
        title: 'Play 3 games',
        description: 'Play 3 games this week',
        target: 3,
        current: 3,
        xpReward: 200,
        completed: true,
        difficulty: 'easy',
      },
      availableQuests: mockAvailableQuests,
      progress: 3,
      isComplete: true,
      loading: false,
      selectQuest: vi.fn(),
    });

    render(<WeeklyQuestCard />);
    expect(screen.getByText('Quest Complete!')).toBeInTheDocument();
  });

  it('has proper accessibility role', () => {
    mockUseWeeklyQuest.mockReturnValue({
      activeQuest: null,
      availableQuests: mockAvailableQuests,
      progress: 0,
      isComplete: false,
      loading: false,
      selectQuest: vi.fn(),
    });

    render(<WeeklyQuestCard />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });
});
