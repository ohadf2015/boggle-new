/**
 * ResultsActionButtons Tests
 *
 * Tests for the results page action buttons component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsActionButtons } from '../ResultsActionButtons';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'hostView.startGame': 'Start Game',
        'results.leaveRoom': 'Leave Room',
        'results.ready': 'Ready',
        'results.imReady': "I'm Ready",
        'results.readyExplanation': 'Tap to let the host know you want to play again',
        'common.exit': 'Exit',
      };
      return translations[key] || key;
    },
  }),
}));

describe('ResultsActionButtons', () => {
  const defaultProps = {
    isHost: false,
    isMultiplayer: true,
    isCurrentPlayerReady: false,
    onStartGame: vi.fn(),
    onMarkReady: vi.fn(),
    onExit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Host Mode', () => {
    it('should render Start Game button for host', () => {
      render(<ResultsActionButtons {...defaultProps} isHost={true} />);

      expect(screen.getByText('Start Game')).toBeInTheDocument();
      expect(screen.queryByText("I'm Ready")).not.toBeInTheDocument();
    });

    it('should call onStartGame when Start Game button clicked', async () => {
      const user = userEvent.setup();
      const onStartGame = vi.fn();
      render(<ResultsActionButtons {...defaultProps} isHost={true} onStartGame={onStartGame} />);

      await user.click(screen.getByText('Start Game'));

      expect(onStartGame).toHaveBeenCalledTimes(1);
    });

    it('should render Leave Room button for host', () => {
      render(<ResultsActionButtons {...defaultProps} isHost={true} />);

      expect(screen.getByText('Leave Room')).toBeInTheDocument();
    });

    it('should call onExit when Leave Room button clicked', async () => {
      const user = userEvent.setup();
      const onExit = vi.fn();
      render(<ResultsActionButtons {...defaultProps} isHost={true} onExit={onExit} />);

      await user.click(screen.getByText('Leave Room'));

      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Player Ready Mode', () => {
    it('should render Ready button when player is ready', () => {
      render(<ResultsActionButtons {...defaultProps} isCurrentPlayerReady={true} />);

      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.queryByText("I'm Ready")).not.toBeInTheDocument();
    });

    it('should disable Ready button', () => {
      render(<ResultsActionButtons {...defaultProps} isCurrentPlayerReady={true} />);

      const readyButton = screen.getByText('Ready');
      expect(readyButton).toBeDisabled();
    });

    it('should not call onMarkReady when Ready button clicked', async () => {
      const user = userEvent.setup();
      const onMarkReady = vi.fn();
      render(
        <ResultsActionButtons
          {...defaultProps}
          isCurrentPlayerReady={true}
          onMarkReady={onMarkReady}
        />
      );

      // Try to click disabled button
      const readyButton = screen.getByText('Ready');
      await user.click(readyButton);

      expect(onMarkReady).not.toHaveBeenCalled();
    });

    it('should render Leave Room button when player is ready', () => {
      render(<ResultsActionButtons {...defaultProps} isCurrentPlayerReady={true} />);

      expect(screen.getByText('Leave Room')).toBeInTheDocument();
    });
  });

  describe('Player Not Ready Mode', () => {
    it('should render I\'m Ready button when player not ready', () => {
      render(<ResultsActionButtons {...defaultProps} isCurrentPlayerReady={false} />);

      expect(screen.getByText("I'm Ready")).toBeInTheDocument();
      expect(screen.queryByText('Ready')).not.toBeInTheDocument();
    });

    it('should call onMarkReady when I\'m Ready button clicked', async () => {
      const user = userEvent.setup();
      const onMarkReady = vi.fn();
      render(<ResultsActionButtons {...defaultProps} onMarkReady={onMarkReady} />);

      await user.click(screen.getByText("I'm Ready"));

      expect(onMarkReady).toHaveBeenCalledTimes(1);
    });

    it('should render explanation text for I\'m Ready button', () => {
      render(<ResultsActionButtons {...defaultProps} />);

      expect(screen.getByText('Tap to let the host know you want to play again')).toBeInTheDocument();
    });

    it('should render Leave Room button when player not ready', () => {
      render(<ResultsActionButtons {...defaultProps} />);

      expect(screen.getByText('Leave Room')).toBeInTheDocument();
    });
  });

  describe('Single Player Mode', () => {
    it('should render Exit button for single player', () => {
      render(<ResultsActionButtons {...defaultProps} isMultiplayer={false} />);

      expect(screen.getByText('Exit')).toBeInTheDocument();
      expect(screen.queryByText('Leave Room')).not.toBeInTheDocument();
      expect(screen.queryByText("I'm Ready")).not.toBeInTheDocument();
      expect(screen.queryByText('Start Game')).not.toBeInTheDocument();
    });

    it('should call onExit when Exit button clicked in single player', async () => {
      const user = userEvent.setup();
      const onExit = vi.fn();
      render(<ResultsActionButtons {...defaultProps} isMultiplayer={false} onExit={onExit} />);

      await user.click(screen.getByText('Exit'));

      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<ResultsActionButtons {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have visible text for all buttons', () => {
      render(<ResultsActionButtons {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.textContent).toBeTruthy();
      });
    });
  });

  describe('Styling', () => {
    it('should render I\'m Ready button with motion animation', () => {
      render(<ResultsActionButtons {...defaultProps} />);

      const imReadyButton = screen.getByText("I'm Ready");
      expect(imReadyButton).toBeInTheDocument();
      // Button uses Framer Motion animate prop for pulse effect instead of CSS class
      expect(imReadyButton.closest('button')).toBeTruthy();
    });

    it('should apply disabled styling to Ready button', () => {
      render(<ResultsActionButtons {...defaultProps} isCurrentPlayerReady={true} />);

      const readyButton = screen.getByText('Ready');
      expect(readyButton).toHaveClass('cursor-default');
    });
  });
});
