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

  test('renders nothing when ad not available', () => {
    (useRewardedAd as jest.Mock).mockReturnValue({
      status: 'idle',
      isAdAvailable: false,
      showAd: mockShowAd,
      error: null,
      rewardAmount: 25,
    });
    const { container } = render(<RewardedAdGoldButton goldAmount={25} />);
    expect(container.innerHTML).toBe('');
  });

  test('is disabled during loading state', () => {
    (useRewardedAd as jest.Mock).mockReturnValue({
      status: 'loading',
      isAdAvailable: true,
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

  test('respects frequency cap - disabled when 3+ ads viewed in last hour', () => {
    const now = Date.now();
    localStorage.setItem('lexiclash_ad_timestamps', JSON.stringify([
      now - 1000, now - 2000, now - 3000,
    ]));
    render(<RewardedAdGoldButton goldAmount={25} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('allows ad when frequency cap not reached', () => {
    localStorage.setItem('lexiclash_ad_timestamps', JSON.stringify([Date.now() - 1000]));
    render(<RewardedAdGoldButton goldAmount={25} />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  test('applies custom className', () => {
    render(<RewardedAdGoldButton goldAmount={25} className="mt-4" />);
    expect(screen.getByRole('button')).toHaveClass('mt-4');
  });
});
