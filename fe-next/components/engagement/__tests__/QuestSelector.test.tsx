/**
 * Tests for QuestSelector component
 *
 * Covers: rendering 3 quest cards, difficulty colors, selection callback
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'weeklyQuest.easy': 'Easy',
        'weeklyQuest.medium': 'Medium',
        'weeklyQuest.hard': 'Hard',
        'weeklyQuest.selectQuest': 'Select',
        'weeklyQuest.xpReward': `+${params?.xp ?? 0} XP`,
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
  const Btn = React.forwardRef(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) =>
      React.createElement('button', { ...props, ref }, children)
  );
  Btn.displayName = 'MockMotionButton';
  return {
    m: { div: Div, button: Btn },
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  };
});

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

// Mock PartPreview
vi.mock('@/components/avatar/PartPreview', () => ({
  __esModule: true,
  default: () => React.createElement('svg', { 'data-testid': 'part-preview' }),
}));

import { QuestSelector } from '../QuestSelector';

const mockQuests = [
  { id: 'easy_1', difficulty: 'easy' as const, type: 'play_games', description: 'Play 3 games', target: 3, xpReward: 200, avatarPartReward: { category: 'eyes', partId: 'monocleEye' } },
  { id: 'med_1', difficulty: 'medium' as const, type: 'long_words', description: 'Find 20 long words', target: 20, xpReward: 500, avatarPartReward: { category: 'accessory', partId: 'crown' } },
  { id: 'hard_1', difficulty: 'hard' as const, type: 'find_words_session', description: 'Find 100 words', target: 100, xpReward: 1000, avatarPartReward: { category: 'eyes', partId: 'galaxy' } },
];

beforeEach(() => vi.clearAllMocks());

describe('QuestSelector', () => {
  it('renders 3 quest option cards', () => {
    render(<QuestSelector quests={mockQuests} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /select/i })).toHaveLength(3);
  });

  it('shows difficulty badges', () => {
    render(<QuestSelector quests={mockQuests} onSelect={vi.fn()} />);
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  it('shows XP rewards', () => {
    render(<QuestSelector quests={mockQuests} onSelect={vi.fn()} />);
    expect(screen.getByText('+200 XP')).toBeInTheDocument();
    expect(screen.getByText('+500 XP')).toBeInTheDocument();
    expect(screen.getByText('+1000 XP')).toBeInTheDocument();
  });

  it('shows quest descriptions', () => {
    render(<QuestSelector quests={mockQuests} onSelect={vi.fn()} />);
    expect(screen.getByText('Play 3 games')).toBeInTheDocument();
    expect(screen.getByText('Find 20 long words')).toBeInTheDocument();
    expect(screen.getByText('Find 100 words')).toBeInTheDocument();
  });

  it('calls onSelect with quest id when button clicked', () => {
    const onSelect = vi.fn();
    render(<QuestSelector quests={mockQuests} onSelect={onSelect} />);

    const buttons = screen.getAllByRole('button', { name: /select/i });
    fireEvent.click(buttons[1]);

    expect(onSelect).toHaveBeenCalledWith('med_1');
  });

  it('renders nothing when quests array is empty', () => {
    const { container } = render(<QuestSelector quests={[]} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
