// @vitest-environment jsdom
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlayerRecapCard } from '../PlayerRecapCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    language: 'en',
  })),
}));

const mockUsePlayerRecap = vi.fn();
vi.mock('@/hooks/usePlayerRecap', () => ({
  usePlayerRecap: (...args: unknown[]) => mockUsePlayerRecap(...args),
}));

const baseRecap = {
  id: 'r1',
  userId: 'u1',
  periodType: 'weekly' as const,
  periodStart: '2026-03-16',
  periodEnd: '2026-03-23',
  totalGames: 42,
  totalScore: 12500,
  totalWords: 350,
  longestWord: 'SPECTACULAR',
  rarestWord: 'QUAFF',
  bestScore: 1800,
  bestCombo: 7,
  streakDays: 5,
  rankChange: 2,
  gamesWon: 30,
  uniqueWordsFound: 210,
  improvementPercent: 12,
  createdAt: '2026-03-23',
};

const monthlyRecap = {
  ...baseRecap,
  id: 'r2',
  periodType: 'monthly' as const,
  totalGames: 150,
  totalWords: 1200,
  bestScore: 2200,
  bestCombo: 10,
  streakDays: 14,
  improvementPercent: -5,
};

describe('PlayerRecapCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when loading', () => {
    mockUsePlayerRecap.mockReturnValue({
      weeklyRecap: null,
      monthlyRecap: null,
      loading: true,
    });

    const { container } = render(<PlayerRecapCard />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no recap data', () => {
    mockUsePlayerRecap.mockReturnValue({
      weeklyRecap: null,
      monthlyRecap: null,
      loading: false,
    });

    const { container } = render(<PlayerRecapCard />);
    expect(container.innerHTML).toBe('');
  });

  it('renders stats grid with games, words, and streak', () => {
    mockUsePlayerRecap.mockReturnValue({
      weeklyRecap: baseRecap,
      monthlyRecap: null,
      loading: false,
    });

    render(<PlayerRecapCard />);

    expect(screen.getByTestId('player-recap-card')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument(); // totalGames
    expect(screen.getByText('350')).toBeInTheDocument(); // totalWords
    expect(screen.getByText('5')).toBeInTheDocument(); // streakDays
    expect(screen.getByText('SPECTACULAR')).toBeInTheDocument(); // longestWord
  });

  it('switches between weekly and monthly tabs', () => {
    mockUsePlayerRecap.mockReturnValue({
      weeklyRecap: baseRecap,
      monthlyRecap,
      loading: false,
    });

    render(<PlayerRecapCard />);

    // Weekly tab is active by default
    const weeklyTab = screen.getByTestId('recap-tab-weekly');
    const monthlyTab = screen.getByTestId('recap-tab-monthly');
    expect(weeklyTab).toHaveAttribute('aria-selected', 'true');
    expect(monthlyTab).toHaveAttribute('aria-selected', 'false');

    // Switch to monthly
    fireEvent.click(monthlyTab);
    expect(monthlyTab).toHaveAttribute('aria-selected', 'true');
    expect(weeklyTab).toHaveAttribute('aria-selected', 'false');

    // Monthly stats should now show
    expect(screen.getByText('150')).toBeInTheDocument(); // monthly totalGames
  });

  it('share button copies recap to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    mockUsePlayerRecap.mockReturnValue({
      weeklyRecap: baseRecap,
      monthlyRecap: null,
      loading: false,
    });

    render(<PlayerRecapCard />);

    const shareBtn = screen.getByTestId('share-recap-btn');
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const clipboardText = writeText.mock.calls[0][0];
    expect(clipboardText).toContain('42'); // totalGames
    expect(clipboardText).toContain('SPECTACULAR'); // longestWord
  });
});
