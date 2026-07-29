import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mocks
const mockShowAd = vi.fn();
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'ads.rewarded.watchForGold': 'Watch ad for +{amount} gold',
    'ads.rewarded.earning': 'Watching...',
    'ads.rewarded.earned': '+{amount} gold earned!',
    'ads.rewarded.cooldown': 'Available soon',
  };
  return translations[key] || key;
});

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: vi.fn(() => ({
    status: 'idle',
    isAdAvailable: true,
    isPlaceholderCooldown: false,
    showAd: mockShowAd,
    error: null,
    rewardAmount: 25,
  })),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en', direction: 'ltr' }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

import { RewardedAdGoldButton } from '../RewardedAdGoldButton';
import { useRewardedAd } from '@/hooks/useRewardedAd';

describe('RewardedAdGoldButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (useRewardedAd as jest.Mock).mockReturnValue({
      status: 'idle',
      isAdAvailable: true,
      isPlaceholderCooldown: false,
      showAd: mockShowAd,
      prepareAd: vi.fn(),
      error: null,
      rewardAmount: 25,
    });
  });

  test('renders with gold amount', () => {
    render(<RewardedAdGoldButton goldAmount={25} surface="test" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(mockT).toHaveBeenCalledWith('ads.rewarded.watchForGold');
  });

  test('calls showAd on click', () => {
    render(<RewardedAdGoldButton goldAmount={25} surface="test" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockShowAd).toHaveBeenCalled();
  });

  test('is disabled during loading state', () => {
    (useRewardedAd as jest.Mock).mockReturnValue({
      status: 'loading',
      isAdAvailable: true,
      isPlaceholderCooldown: false,
      showAd: mockShowAd,
      prepareAd: vi.fn(),
      error: null,
      rewardAmount: 25,
    });
    render(<RewardedAdGoldButton goldAmount={25} surface="test" />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('has accessible aria-label', () => {
    render(<RewardedAdGoldButton goldAmount={25} surface="test" />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  test('is disabled when placeholder cooldown is active', () => {
    (useRewardedAd as jest.Mock).mockReturnValue({
      status: 'idle',
      isAdAvailable: true,
      isPlaceholderCooldown: true,
      showAd: mockShowAd,
      prepareAd: vi.fn(),
      error: null,
      rewardAmount: 25,
    });
    render(<RewardedAdGoldButton goldAmount={25} surface="test" />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Available soon')).toBeInTheDocument();
  });

  test('is enabled when placeholder cooldown is not active', () => {
    render(<RewardedAdGoldButton goldAmount={25} surface="test" />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  test('applies custom className', () => {
    render(<RewardedAdGoldButton goldAmount={25} surface="test" className="mt-4" />);
    expect(screen.getByRole('button')).toHaveClass('mt-4');
  });

  test('renders nothing when no active ad provider (canShowAd false)', () => {
    (useRewardedAd as jest.Mock).mockReturnValue({
      status: 'idle',
      isAdAvailable: true,
      isPlaceholderCooldown: false,
      showAd: mockShowAd,
      prepareAd: vi.fn(),
      error: null,
      rewardAmount: 25,
      canShowAd: false,
    });
    const { container } = render(<RewardedAdGoldButton goldAmount={20} surface="player_waiting" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  test('renders the button when an active ad provider exists (canShowAd true)', () => {
    (useRewardedAd as jest.Mock).mockReturnValue({
      status: 'idle',
      isAdAvailable: true,
      isPlaceholderCooldown: false,
      showAd: mockShowAd,
      prepareAd: vi.fn(),
      error: null,
      rewardAmount: 25,
      canShowAd: true,
    });
    render(<RewardedAdGoldButton goldAmount={20} surface="player_waiting" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
