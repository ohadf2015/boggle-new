/**
 * AdminGiftModal Component Tests
 *
 * Tests for the luxury gift reveal modal
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const stripFramerProps = (props: Record<string, unknown>) => {
    const {
      whileHover,
      whileTap,
      animate,
      initial,
      exit,
      transition,
      variants,
      ...rest
    } = props;
    return rest;
  };
  return {
    motion: {
      div: ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) => (
        <div {...stripFramerProps(props)}>{children}</div>
      ),
      span: ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) => (
        <span {...stripFramerProps(props)}>{children}</span>
      ),
      button: ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) => (
        <button {...stripFramerProps(props)}>{children}</button>
      ),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock GSAP
jest.mock('gsap', () => ({
  timeline: jest.fn(() => ({
    to: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    kill: jest.fn(),
  })),
  context: jest.fn((callback) => {
    callback();
    return { revert: jest.fn() };
  }),
}));

// Mock confetti utility
jest.mock('@/utils/confettiUtils', () => ({
  fireConfetti: jest.fn(),
}));

// Mock useDevicePerformance
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: true,
    enableGlowEffects: false,
    isLowEnd: false,
  }),
}));

// Mock LanguageContext
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'gift.claim': 'Claim Reward',
    'gift.claimed': 'Claimed!',
    'gift.coins': 'Coins',
    'gift.from': 'From',
    'gift.topPlayerLine': "You're one of our top players!",
    'gift.feedbackLine': 'Your voice matters to us!',
    'gift.thankYouLine': 'A special thank you from us!',
    'gift.customLine': 'A message just for you!',
  };
  return translations[key] || key;
};

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
  }),
}));

import { AdminGiftModal } from '../AdminGiftModal';

describe('AdminGiftModal', () => {
  const mockGift = {
    id: 'gift-1',
    title: 'Congratulations!',
    message: 'You are an amazing player!',
    template_type: 'top_player' as const,
    xp_amount: 500,
    coin_amount: 100,
    sender: {
      username: 'admin',
      display_name: 'Game Admin',
    },
  };

  const mockOnClaim = jest.fn().mockResolvedValue(undefined);
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when show is false', () => {
      const { container } = render(
        <AdminGiftModal
          gift={mockGift}
          show={false}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(container.querySelector('.fixed')).not.toBeInTheDocument();
    });

    it('renders nothing when gift is null', () => {
      const { container } = render(
        <AdminGiftModal
          gift={null}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders modal when show is true and gift is provided', () => {
      render(
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText('Congratulations!')).toBeInTheDocument();
    });

    it('displays gift title', () => {
      render(
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText('Congratulations!')).toBeInTheDocument();
    });

    it('displays gift message', () => {
      render(
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText('You are an amazing player!')).toBeInTheDocument();
    });

    it('displays XP reward', () => {
      render(
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText('+500')).toBeInTheDocument();
      expect(screen.getByText('XP')).toBeInTheDocument();
    });

    it('displays coin reward', () => {
      render(
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText('+100')).toBeInTheDocument();
      expect(screen.getByText('Coins')).toBeInTheDocument();
    });

    it('displays sender information', () => {
      render(
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText(/Game Admin/)).toBeInTheDocument();
    });

    it('displays header line based on template type', () => {
      render(
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText("You're one of our top players!")).toBeInTheDocument();
    });

    it('displays claim button', () => {
      render(
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByRole('button', { name: /Claim Reward/i })).toBeInTheDocument();
    });
  });

  describe('Template Types', () => {
    it('shows feedback line for feedback_request template', () => {
      const feedbackGift = { ...mockGift, template_type: 'feedback_request' as const };
      render(
        <AdminGiftModal
          gift={feedbackGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText('Your voice matters to us!')).toBeInTheDocument();
    });

    it('shows thank you line for thank_you template', () => {
      const thankYouGift = { ...mockGift, template_type: 'thank_you' as const };
      render(
        <AdminGiftModal
          gift={thankYouGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText('A special thank you from us!')).toBeInTheDocument();
    });

    it('shows custom line for custom template', () => {
      const customGift = { ...mockGift, template_type: 'custom' as const };
      render(
        <AdminGiftModal
          gift={customGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText('A message just for you!')).toBeInTheDocument();
    });

    it('shows custom line for null template', () => {
      const nullTemplateGift = { ...mockGift, template_type: null };
      render(
        <AdminGiftModal
          gift={nullTemplateGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText('A message just for you!')).toBeInTheDocument();
    });
  });

  describe('Rewards Display', () => {
    it('hides reward section when no rewards', () => {
      const noRewardsGift = { ...mockGift, xp_amount: 0, coin_amount: 0 };
      render(
        <AdminGiftModal
          gift={noRewardsGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.queryByText('XP')).not.toBeInTheDocument();
      expect(screen.queryByText('Coins')).not.toBeInTheDocument();
    });

    it('shows only XP when coin_amount is 0', () => {
      const xpOnlyGift = { ...mockGift, coin_amount: 0 };
      render(
        <AdminGiftModal
          gift={xpOnlyGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText('XP')).toBeInTheDocument();
      expect(screen.queryByText('Coins')).not.toBeInTheDocument();
    });

    it('shows only coins when xp_amount is 0', () => {
      const coinsOnlyGift = { ...mockGift, xp_amount: 0 };
      render(
        <AdminGiftModal
          gift={coinsOnlyGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.queryByText('XP')).not.toBeInTheDocument();
      expect(screen.getByText('Coins')).toBeInTheDocument();
    });
  });

  describe('Claim Interaction', () => {
    it('calls onClaim when claim button is clicked', async () => {
      render(
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );

      const claimButton = screen.getByRole('button', { name: /Claim Reward/i });
      fireEvent.click(claimButton);

      await waitFor(() => {
        expect(mockOnClaim).toHaveBeenCalledWith('gift-1');
      });
    });

    it('disables claim button while claiming', async () => {
      // Make onClaim return a pending promise
      const slowClaim = jest.fn(() => new Promise(() => {}));

      render(
        <AdminGiftModal
          gift={mockGift}
          show={true}
          onClaim={slowClaim}
          onDismiss={mockOnDismiss}
        />
      );

      const claimButton = screen.getByRole('button', { name: /Claim Reward/i });
      fireEvent.click(claimButton);

      await waitFor(() => {
        expect(claimButton).toBeDisabled();
      });
    });
  });

  describe('Sender Display', () => {
    it('hides sender line when no sender', () => {
      const noSenderGift = { ...mockGift, sender: undefined };
      render(
        <AdminGiftModal
          gift={noSenderGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.queryByText(/From:/)).not.toBeInTheDocument();
    });

    it('shows username when no display_name', () => {
      const usernameOnlyGift = {
        ...mockGift,
        sender: { username: 'admin_user', display_name: null },
      };
      render(
        <AdminGiftModal
          gift={usernameOnlyGift}
          show={true}
          onClaim={mockOnClaim}
          onDismiss={mockOnDismiss}
        />
      );
      expect(screen.getByText(/admin_user/)).toBeInTheDocument();
    });
  });
});
