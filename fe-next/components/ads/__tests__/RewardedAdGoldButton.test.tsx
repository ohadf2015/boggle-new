import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mocks
const mockShowAd = jest.fn();
const mockT = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'ads.rewarded.watchForGold': 'Watch ad for +{amount} gold',
    'ads.rewarded.earning': 'Watching...',
    'ads.rewarded.earned': '+{amount} gold earned!',
    'ads.rewarded.cooldown': 'Available soon',
  };
  return translations[key] || key;
});

jest.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: jest.fn(() => ({
    status: 'idle',
    isAdAvailable: true,
    isPlaceholderCooldown: false,
    showAd: mockShowAd,
    error: null,
    rewardAmount: 25,
  })),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en', direction: 'ltr' }),
}));

jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

import { RewardedAdGoldButton } from '../RewardedAdGoldButton';
import { useRewardedAd } from '@/hooks/useRewardedAd';

describe('RewardedAdGoldButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (useRewardedAd as jest.Mock).mockReturnValue({
      status: 'idle',
      isAdAvailable: true,
      isPlaceholderCooldown: false,
      showAd: mockShowAd,
      error: null,
      rewardAmount: 25,
    });
  });

  test('renders with gold amount', () => {
    render(<RewardedAdGoldButton goldAmount={25} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(mockT).toHaveBeenCalledWith('ads.rewarded.watchForGold');
  });

  test('calls showAd on click', () => {
    render(<RewardedAdGoldButton goldAmount={25} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockShowAd).toHaveBeenCalled();
  });

  test('is disabled during loading state', () => {
    (useRewardedAd as jest.Mock).mockReturnValue({
      status: 'loading',
      isAdAvailable: true,
      isPlaceholderCooldown: false,
      showAd: mockShowAd,
      error: null,
      rewardAmount: 25,
    });
    render(<RewardedAdGoldButton goldAmount={25} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('has accessible aria-label', () => {
    render(<RewardedAdGoldButton goldAmount={25} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  test('is disabled when placeholder cooldown is active', () => {
    (useRewardedAd as jest.Mock).mockReturnValue({
      status: 'idle',
      isAdAvailable: true,
      isPlaceholderCooldown: true,
      showAd: mockShowAd,
      error: null,
      rewardAmount: 25,
    });
    render(<RewardedAdGoldButton goldAmount={25} />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Available soon')).toBeInTheDocument();
  });

  test('is enabled when placeholder cooldown is not active', () => {
    render(<RewardedAdGoldButton goldAmount={25} />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  test('applies custom className', () => {
    render(<RewardedAdGoldButton goldAmount={25} className="mt-4" />);
    expect(screen.getByRole('button')).toHaveClass('mt-4');
  });
});
