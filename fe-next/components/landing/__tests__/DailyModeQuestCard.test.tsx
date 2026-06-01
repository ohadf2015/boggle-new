import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyModeQuestCard } from '../DailyModeQuestCard';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'dailyQuest.title': 'Daily Quest',
        'dailyQuest.modesPlayed': `${params?.count ?? 0}/3 modes played`,
        'dailyQuest.claimReward': 'Claim Reward!',
        'dailyQuest.questComplete': 'Quest complete! Come back tomorrow',
        'dailyQuest.rewardEarned': `You earned ${params?.coins ?? 0} coins!`,
        'dailyQuest.daily': 'Daily Challenge',
        'dailyQuest.classicMp': 'Classic Multiplayer',
        'dailyQuest.wordHuntMp': 'Word Hunt',
        'dailyQuest.playAllModes': 'Play all 3 modes today!',
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock useDailyModeQuest
const mockMarkModePlayed = vi.fn();
const mockClaimReward = vi.fn();
let mockProgress = { blast: false, classicMp: false, wordHuntMp: false, completed: false };
let mockClaimed = false;

vi.mock('@/hooks/useDailyModeQuest', () => ({
  useDailyModeQuest: () => ({
    markModePlayed: mockMarkModePlayed,
    getQuestProgress: () => mockProgress,
    isQuestCompleted: () => mockProgress.completed,
    claimReward: mockClaimReward,
    data: { ...mockProgress, claimed: mockClaimed },
  }),
}));

describe('DailyModeQuestCard', () => {
  beforeEach(() => {
    mockProgress = { blast: false, classicMp: false, wordHuntMp: false, completed: false };
    mockClaimed = false;
    mockClaimReward.mockReturnValue(100);
  });

  it('renders collapsed bar with quest title and progress', () => {
    mockProgress = { blast: true, classicMp: false, wordHuntMp: false, completed: false };
    render(<DailyModeQuestCard />);
    expect(screen.getByText('Daily Quest')).toBeTruthy();
    expect(screen.getByText('1/3 modes played')).toBeTruthy();
  });

  it('shows 0/3 when no modes played', () => {
    render(<DailyModeQuestCard />);
    expect(screen.getByText('0/3 modes played')).toBeTruthy();
  });

  it('shows claim button when all modes completed', () => {
    mockProgress = { blast: true, classicMp: true, wordHuntMp: true, completed: true };
    render(<DailyModeQuestCard />);
    expect(screen.getByText('Claim Reward!')).toBeTruthy();
  });

  it('shows completion message after claiming', () => {
    mockProgress = { blast: true, classicMp: true, wordHuntMp: true, completed: true };
    mockClaimed = true;
    mockClaimReward.mockReturnValue(null);
    render(<DailyModeQuestCard />);
    expect(screen.getByText('Quest complete! Come back tomorrow')).toBeTruthy();
  });

  it('calls claimReward and shows coins when claim button clicked', () => {
    mockProgress = { blast: true, classicMp: true, wordHuntMp: true, completed: true };
    mockClaimReward.mockReturnValue(100);
    render(<DailyModeQuestCard />);
    fireEvent.click(screen.getByText('Claim Reward!'));
    expect(mockClaimReward).toHaveBeenCalled();
    expect(screen.getByText('You earned 100 coins!')).toBeTruthy();
  });
});
