/**
 * Tests for ChallengeButton component
 *
 * Tests both button and icon variants, modal opening behavior.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChallengeButton from '../ChallengeButton';

// Mock contexts
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        challenge: 'Challenge',
        challengeSent: 'Challenge sent!',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

// Mock DuelChallengeModal
jest.mock('../DuelChallengeModal', () => ({
  __esModule: true,
  default: ({ opponent, onClose }: any) => (
    <div data-testid="duel-challenge-modal">
      <span>Challenge {opponent.displayName}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock useDuelSocket
jest.mock('@/hooks/useDuelSocket', () => ({
  useDuelSocket: () => ({
    createChallenge: jest.fn(),
  }),
}));

describe('ChallengeButton', () => {
  const mockProps = {
    opponentId: 'user-123',
    opponentName: 'John Doe',
    opponentAvatar: null,
    classroomId: 'classroom-456',
    lessons: [
      { id: 'lesson-1', name: 'Basic Words' },
      { id: 'lesson-2', name: 'Advanced Words' },
    ],
  };

  describe('Button Variant (default)', () => {
    it('should render button with challenge text', () => {
      render(<ChallengeButton {...mockProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Challenge');
    });

    it('should render Swords icon', () => {
      render(<ChallengeButton {...mockProps} />);

      const button = screen.getByRole('button');
      // Check for SVG element (Lucide icons render as SVG)
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should open modal when clicked', () => {
      render(<ChallengeButton {...mockProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Modal should be rendered
      const modal = screen.getByTestId('duel-challenge-modal');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveTextContent('Challenge John Doe');
    });

    it('should close modal when onClose is called', () => {
      render(<ChallengeButton {...mockProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Modal should be visible
      expect(screen.getByTestId('duel-challenge-modal')).toBeInTheDocument();

      // Click close button in modal
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      // Modal should be removed
      expect(screen.queryByTestId('duel-challenge-modal')).not.toBeInTheDocument();
    });
  });

  describe('Icon Variant', () => {
    it('should render only icon without text when variant is icon', () => {
      render(<ChallengeButton {...mockProps} variant="icon" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      // Should have SVG but no "Challenge" text
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(button).not.toHaveTextContent('Challenge');
    });

    it('should open modal when icon is clicked', () => {
      render(<ChallengeButton {...mockProps} variant="icon" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Modal should be rendered
      const modal = screen.getByTestId('duel-challenge-modal');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Opponent Info', () => {
    it('should pass opponent info to modal', () => {
      render(<ChallengeButton {...mockProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Modal should show opponent name
      const modal = screen.getByTestId('duel-challenge-modal');
      expect(modal).toHaveTextContent('John Doe');
    });

    it('should handle null avatar', () => {
      render(<ChallengeButton {...mockProps} opponentAvatar={null} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should not crash - modal should render
      expect(screen.getByTestId('duel-challenge-modal')).toBeInTheDocument();
    });

    it('should handle string avatar URL', () => {
      render(
        <ChallengeButton {...mockProps} opponentAvatar="https://example.com/avatar.jpg" />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should not crash - modal should render
      expect(screen.getByTestId('duel-challenge-modal')).toBeInTheDocument();
    });
  });
});
