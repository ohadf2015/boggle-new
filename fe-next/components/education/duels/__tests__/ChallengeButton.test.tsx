/**
 * ChallengeButton Tests
 *
 * Test coverage for the ChallengeButton component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChallengeButton } from '../ChallengeButton';
import type { OpponentInfo } from '@/hooks/useDuelSocket';

// ============================================
// MOCKS
// ============================================

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/hooks/useDuelSocket', () => ({
  useDuelSocket: () => ({
    createChallenge: vi.fn(),
  }),
}));

vi.mock('../DuelChallengeModal', () => ({
  default: function MockDuelChallengeModal({
    opponent,
    onClose,
  }: {
    opponent: OpponentInfo;
    onClose: () => void;
  }) {
    return (
      <div data-testid="duel-challenge-modal">
        <p>Modal for {opponent.displayName}</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

// ============================================
// TESTS
// ============================================

describe('ChallengeButton', () => {
  const mockProps = {
    opponentId: 'opponent-123',
    opponentName: 'John Doe',
    opponentAvatar: 'https://example.com/avatar.jpg',
    classroomId: 'classroom-1',
    lessons: [
      { id: 'lesson-1', name: 'Lesson 1' },
      { id: 'lesson-2', name: 'Lesson 2' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // BUTTON VARIANT TESTS
  // ============================================

  describe('Button Variant', () => {
    it('renders button with challenge text', () => {
      render(<ChallengeButton {...mockProps} />);

      const button = screen.getByTestId('challenge-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('challengePlayer');
    });

    it('opens modal when clicked', async () => {
      render(<ChallengeButton {...mockProps} />);

      const button = screen.getByTestId('challenge-button');
      fireEvent.click(button);

      // next/dynamic: the modal chunk resolves a tick after the click.
      expect(await screen.findByTestId('duel-challenge-modal')).toBeInTheDocument();
    });

    it('shows success state after modal closes', async () => {
      render(<ChallengeButton {...mockProps} />);

      // Open modal
      const button = screen.getByTestId('challenge-button');
      fireEvent.click(button);

      // Close modal
      const closeButton = await screen.findByText('Close');
      fireEvent.click(closeButton);

      // Success state
      await waitFor(() => {
        expect(button).toHaveTextContent('challengeSent');
      });
    });

    it('disables button during success state', async () => {
      render(<ChallengeButton {...mockProps} />);

      // Open and close modal
      const button = screen.getByTestId('challenge-button');
      fireEvent.click(button);

      const closeButton = await screen.findByText('Close');
      fireEvent.click(closeButton);

      // Button disabled
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it('applies neo-brutalist styling', () => {
      render(<ChallengeButton {...mockProps} />);

      const button = screen.getByTestId('challenge-button');
      expect(button).toHaveClass('bg-neo-pink');
      expect(button).toHaveClass('border-3');
      expect(button).toHaveClass('shadow-hard-sm');
    });
  });

  // ============================================
  // ICON VARIANT TESTS
  // ============================================

  describe('Icon Variant', () => {
    it('renders icon button without text', () => {
      render(<ChallengeButton {...mockProps} variant="icon" />);

      const button = screen.getByTestId('challenge-button-icon');
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveTextContent('challengePlayer');
    });

    it('has aria-label for accessibility', () => {
      render(<ChallengeButton {...mockProps} variant="icon" />);

      const button = screen.getByTestId('challenge-button-icon');
      expect(button).toHaveAttribute('aria-label', 'challengePlayer');
    });

    it('opens modal when clicked', async () => {
      render(<ChallengeButton {...mockProps} variant="icon" />);

      const button = screen.getByTestId('challenge-button-icon');
      fireEvent.click(button);

      expect(await screen.findByTestId('duel-challenge-modal')).toBeInTheDocument();
    });

    it('applies icon-specific styling', () => {
      render(<ChallengeButton {...mockProps} variant="icon" />);

      const button = screen.getByTestId('challenge-button-icon');
      expect(button).toHaveClass('text-neo-pink');
      expect(button).toHaveClass('hover:text-neo-lime');
    });
  });

  // ============================================
  // MODAL INTEGRATION TESTS
  // ============================================

  describe('Modal Integration', () => {
    it('passes correct opponent info to modal', () => {
      render(<ChallengeButton {...mockProps} />);

      const button = screen.getByTestId('challenge-button');
      fireEvent.click(button);

      expect(screen.getByText('Modal for John Doe')).toBeInTheDocument();
    });

    it('closes modal when onClose is called', async () => {
      render(<ChallengeButton {...mockProps} />);

      // Open modal
      const button = screen.getByTestId('challenge-button');
      fireEvent.click(button);

      // Modal visible
      expect(await screen.findByTestId('duel-challenge-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      // Modal gone
      expect(screen.queryByTestId('duel-challenge-modal')).not.toBeInTheDocument();
    });
  });
});
