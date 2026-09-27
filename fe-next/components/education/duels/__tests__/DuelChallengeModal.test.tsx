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

  /**
   * The duel-type tiles and the lesson picker now start collapsed behind one
   * CHANGE disclosure (decision-fatigue rule: at most one visible decision
   * before the primary action). Tests that drive those controls open it first.
   */
  const openSetup = () => fireEvent.click(screen.getByTestId('duel-challenge-change'));

  describe('rendering', () => {
    it('renders opponent information', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      expect(screen.getByText('Test Opponent')).toBeInTheDocument();
    });

    it('renders lesson selector dropdown', () => {
      render(<DuelChallengeModal {...defaultProps} />);
      openSetup();

      expect(screen.getAllByText('Select Lesson')[0]).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders all lesson options', () => {
      render(<DuelChallengeModal {...defaultProps} />);
      openSetup();

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
    // The guard is still there, but it only bites when there is genuinely
    // nothing to play: with lessons present the first one is pre-selected so a
    // single tap sends (see DuelChallengeModal.defaults.test.tsx).
    it('refuses to send when the classroom has no lessons at all', () => {
      render(<DuelChallengeModal {...defaultProps} lessons={[]} />);

      fireEvent.click(screen.getByText('Send Challenge'));

      expect(mockCreateChallenge).not.toHaveBeenCalled();
    });

    it('allows selecting a lesson', () => {
      render(<DuelChallengeModal {...defaultProps} />);
      openSetup();

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'lesson-1' } });

      expect(dropdown).toHaveValue('lesson-1');
    });
  });

  describe('challenge creation', () => {
    it('calls createChallenge with correct params when lesson selected', () => {
      render(<DuelChallengeModal {...defaultProps} />);
      openSetup();

      // Select lesson
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'lesson-1' } });

      // Click send
      const sendButton = screen.getByText('Send Challenge');
      fireEvent.click(sendButton);

      // realtime is the pre-selected recommendation
      expect(mockCreateChallenge).toHaveBeenCalledWith(
        'opponent-1',
        'lesson-1',
        'classroom-1',
        'realtime'
      );
    });

    it('shows loading state while creating', () => {
      render(<DuelChallengeModal {...defaultProps} />);
      openSetup();

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
      openSetup();

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
      // Arbitrary width so cn()/tailwind-merge cannot collapse it into the
      // colour class; cream rather than black because a black edge on navy
      // measures 1.23:1 and simply disappears.
      expect(modal).toHaveClass('border-[3px]');
      expect(modal).toHaveClass('border-neo-cream');
      expect(modal).toHaveClass('shadow-hard-lg');
    });
  });

  describe('cancel button reads as a secondary control', () => {
    // Dismissing a challenge dialog destroys nothing, so red is the wrong
    // signal (red is reserved for destructive actions). It must still read as
    // a control: a 3px cream border on the navy surface, never a ghost button.
    it('cancel button is not dressed as a destructive action', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton.classList.contains('bg-red-500')).toBe(false);
      expect(cancelButton.classList.contains('bg-neo-pink')).toBe(false);
    });

    it('cancel button carries a border cn() cannot drop', () => {
      render(<DuelChallengeModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveClass('border-[3px]');
      expect(cancelButton).toHaveClass('border-neo-cream');
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
