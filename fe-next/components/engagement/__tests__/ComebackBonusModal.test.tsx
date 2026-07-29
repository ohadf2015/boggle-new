'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComebackBonusModal } from '../ComebackBonusModal';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/utils/authFetch', () => ({
  postWithAuth: vi.fn(),
}));

import { postWithAuth } from '@/utils/authFetch';
const mockPostWithAuth = postWithAuth as jest.MockedFunction<typeof postWithAuth>;

const tier = {
  xpMultiplier: 2,
  durationHours: 48,
  hints: 3,
  streakFreezes: 1,
  message: 'Welcome back!',
} as const;

describe('ComebackBonusModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <ComebackBonusModal isOpen={false} daysAway={7} tier={tier} onClose={vi.fn()} onClaimed={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders comeback modal with multiplier when open', () => {
    render(
      <ComebackBonusModal isOpen={true} daysAway={7} tier={tier} onClose={vi.fn()} onClaimed={vi.fn()} />
    );
    expect(screen.getByText('comebackBonus.title')).toBeInTheDocument();
    expect(screen.getByText('comebackBonus.claimButton')).toBeInTheDocument();
  });

  it('shows XP multiplier value', () => {
    render(
      <ComebackBonusModal isOpen={true} daysAway={7} tier={tier} onClose={vi.fn()} onClaimed={vi.fn()} />
    );
    expect(screen.getByText('2x')).toBeInTheDocument();
  });

  it('shows hints reward row', () => {
    render(
      <ComebackBonusModal isOpen={true} daysAway={7} tier={tier} onClose={vi.fn()} onClaimed={vi.fn()} />
    );
    expect(screen.getByText('comebackBonus.hints')).toBeInTheDocument();
  });

  it('calls postWithAuth and onClaimed when claim button clicked', async () => {
    const onClaimed = vi.fn();
    mockPostWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, bonus: tier, expiresAt: '2026-03-28T00:00:00Z' }),
    } as Response);

    render(
      <ComebackBonusModal isOpen={true} daysAway={7} tier={tier} onClose={vi.fn()} onClaimed={onClaimed} />
    );

    fireEvent.click(screen.getByText('comebackBonus.claimButton'));

    await waitFor(() => {
      expect(mockPostWithAuth).toHaveBeenCalledWith('/api/engagement/comeback');
    });
    await waitFor(() => {
      expect(onClaimed).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <ComebackBonusModal isOpen={true} daysAway={7} tier={tier} onClose={onClose} onClaimed={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('comebackBonus.close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows special title badge when tier has title', () => {
    const tierWithTitle = { ...tier, title: 'THE_RETURNED' } as typeof tier & { title: string };
    render(
      <ComebackBonusModal isOpen={true} daysAway={30} tier={tierWithTitle} onClose={vi.fn()} onClaimed={vi.fn()} />
    );
    expect(screen.getByText('comebackBonus.titleUnlocked')).toBeInTheDocument();
  });

  it('shows streak freezes row when > 0', () => {
    render(
      <ComebackBonusModal isOpen={true} daysAway={7} tier={tier} onClose={vi.fn()} onClaimed={vi.fn()} />
    );
    expect(screen.getByText('comebackBonus.streakFreezes')).toBeInTheDocument();
  });

  it('disables retries after max attempts to stop rageclicks', async () => {
    mockPostWithAuth.mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

    render(
      <ComebackBonusModal isOpen={true} daysAway={7} tier={tier} onClose={vi.fn()} onClaimed={vi.fn()} />
    );
    const btn = screen.getByText('comebackBonus.claimButton').closest('button')!;
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockPostWithAuth).toHaveBeenCalledTimes(1);
    });
  });
});
