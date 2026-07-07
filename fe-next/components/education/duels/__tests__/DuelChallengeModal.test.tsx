// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DuelChallengeModal from '../DuelChallengeModal';
import { useDuelSocket, type OpponentInfo } from '@/hooks/useDuelSocket';

// Mock dependencies
vi.mock('@/hooks/useDuelSocket');

// Radix Select isn't a native <select> (no change event, portal-rendered options) —
// stand in with a native select so existing fireEvent.change-based tests still drive it.
vi.mock('@/components/ui/select', () => {
  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  );
  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  );
  const passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    Select,
    SelectContent: passthrough,
    SelectItem,
    SelectTrigger: passthrough,
    SelectValue: passthrough,
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        sendChallenge: 'Send Challenge',
        selectLesson: 'Select Lesson',
        challengeSent: 'Challenge sent!',
        cancel: 'Cancel',
        challengePlayer: 'Challenge {name}',
      };
      let result = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    },
  }),
}));

describe('DuelChallengeModal', () => {
  const mockCreateChallenge = vi.fn();
  const mockOnClose = vi.fn();

  const opponent: OpponentInfo = {
    userId: 'opponent-1',
    displayName: 'Test Opponent',
    avatarUrl: null,
  };

  const lessons = [
    { id: 'lesson-1', name: 'Lesson 1' },
    { id: 'lesson-2', name: 'Lesson 2' },
  ];

  const defaultProps = {
    opponent,
    lessons,
    classroomId: 'classroom-1',
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useDuelSocket as jest.Mock).mockReturnValue({
      socket: {},
      isConnected: true,
      createChallenge: mockCreateChallenge,
    });
  });

  describe('rendering', () => {
    it('renders opponent information', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      expect(screen.getByText('Test Opponent')).toBeInTheDocument();
    });

    it('renders lesson selector dropdown', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      expect(screen.getAllByText('Select Lesson')[0]).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders all lesson options', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      expect(screen.getByText('Lesson 1')).toBeInTheDocument();
      expect(screen.getByText('Lesson 2')).toBeInTheDocument();
    });

    it('renders Send Challenge button', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      expect(screen.getByText('Send Challenge')).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('lesson selection', () => {
    it('requires lesson selection before sending', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      const sendButton = screen.getByText('Send Challenge');
      fireEvent.click(sendButton);

      // Should not call createChallenge without lesson
      expect(mockCreateChallenge).not.toHaveBeenCalled();
    });

    it('allows selecting a lesson', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'lesson-1' } });

      expect(dropdown).toHaveValue('lesson-1');
    });
  });

  describe('challenge creation', () => {
    it('calls createChallenge with correct params when lesson selected', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      // Select lesson
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'lesson-1' } });

      // Click send
      const sendButton = screen.getByText('Send Challenge');
      fireEvent.click(sendButton);

      expect(mockCreateChallenge).toHaveBeenCalledWith(
        'opponent-1',
        'lesson-1',
        'classroom-1',
        'async'
      );
    });

    it('shows loading state while creating', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'lesson-1' } });

      const sendButton = screen.getByText('Send Challenge');
      fireEvent.click(sendButton);

      // After click, button should show "Challenge sent!" text
      expect(screen.getByText('Challenge sent!')).toBeInTheDocument();
    });

    it('auto-closes after successful creation', async () => {
      vi.useFakeTimers();
      render(<DuelChallengeModal {...defaultProps} />);

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'lesson-1' } });

      const sendButton = screen.getByText('Send Challenge');
      fireEvent.click(sendButton);

      // Fast-forward timers to trigger the close
      vi.runAllTimers();

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });
  });

  describe('cancel action', () => {
    it('calls onClose when Cancel button clicked', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not create challenge when cancelled', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockCreateChallenge).not.toHaveBeenCalled();
    });
  });

  describe('neo-brutalist styling', () => {
    it('uses neo-brutalist modal styles', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      const modal = screen.getByTestId('duel-challenge-modal');
      expect(modal).toHaveClass('border-3');
      expect(modal).toHaveClass('border-neo-black');
      expect(modal).toHaveClass('shadow-hard-lg');
    });
  });

  describe('forfeit/cancel button destructive styling', () => {
    it('cancel button has destructive background color', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      // Must be visually destructive — red or neo-pink
      const hasDestructiveStyle =
        cancelButton.classList.contains('bg-red-500') ||
        cancelButton.classList.contains('bg-neo-pink');
      expect(hasDestructiveStyle).toBe(true);
    });

    it('cancel button has neo-brutalist border and shadow', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveClass('border-neo-black');
      expect(cancelButton).toHaveClass('shadow-hard-sm');
    });
  });

  describe('Esc key dismissal', () => {
    it('calls onClose when Escape key is pressed', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose for other keys', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
