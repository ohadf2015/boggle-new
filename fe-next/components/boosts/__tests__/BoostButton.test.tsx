import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockT = (k: string) => k;

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

vi.mock('@/hooks/useBoostStatus', () => ({
  useBoostStatus: vi.fn(() => ({
    status: { remaining: 2, capPerDay: 5, resetAt: '2026-04-27T00:00:00Z' },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  })),
}));

vi.mock('../BoostPicker', () => ({
  BoostPicker: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="picker">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: vi.fn(() => ({ canShowAd: true })),
}));

import { BoostButton } from '../BoostButton';
import * as boostStatusModule from '@/hooks/useBoostStatus';
import * as rewardedAdModule from '@/hooks/useRewardedAd';

describe('BoostButton', () => {
  beforeEach(() => {
    vi.mocked(boostStatusModule.useBoostStatus).mockReturnValue({
      status: { remaining: 2, capPerDay: 5, resetAt: '2026-04-27T00:00:00Z' },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    // Default: ad provider available
    vi.mocked(rewardedAdModule.useRewardedAd).mockReturnValue({
      canShowAd: true,
    } as ReturnType<typeof rewardedAdModule.useRewardedAd>);
  });

  it('renders with remaining count', () => {
    render(<BoostButton mode="mp" sessionId="s1" />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('opens picker on click', () => {
    render(<BoostButton mode="mp" sessionId="s1" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });

  it('disables button when no boosts remaining', () => {
    vi.mocked(boostStatusModule.useBoostStatus).mockReturnValueOnce({
      status: { remaining: 0, capPerDay: 5, resetAt: '2026-04-27T00:00:00Z' },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<BoostButton mode="mp" sessionId="s1" />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('respects disabled prop', () => {
    render(<BoostButton mode="mp" sessionId="s1" disabled={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('hides button when no ad provider available (web placeholder, daily ad limit)', () => {
    vi.mocked(rewardedAdModule.useRewardedAd).mockReturnValueOnce({
      canShowAd: false,
    } as ReturnType<typeof rewardedAdModule.useRewardedAd>);
    const { container } = render(<BoostButton mode="mp" sessionId="s1" />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows button when ads available and boosts remaining (mp mode)', () => {
    vi.mocked(rewardedAdModule.useRewardedAd).mockReturnValueOnce({
      canShowAd: true,
    } as ReturnType<typeof rewardedAdModule.useRewardedAd>);
    render(<BoostButton mode="mp" sessionId="s1" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders a decorative icon inside the button', () => {
    const { container } = render(<BoostButton mode="mp" sessionId="s1" />);
    const icon = container.querySelector('[data-boost-button-icon]');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
