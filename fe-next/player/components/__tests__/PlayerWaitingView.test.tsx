/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerWaitingView from '../PlayerWaitingView';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} {...filterDomProps(props)}>{children}</div>
    )),
    button: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) => (
      <button ref={ref} {...filterDomProps(props)}>{children}</button>
    )),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

function filterDomProps(props: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'layout'].includes(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// Mock child components
jest.mock('../../../host/components/pre-game/MobileShareSection', () => ({
  MobileShareSection: () => <div data-testid="mobile-share-section" />,
}));
jest.mock('../../../host/components/pre-game/desktop', () => ({
  DesktopLobbyLayout: ({ leftContent, rightContent }: { leftContent: React.ReactNode; rightContent: React.ReactNode }) => (
    <div data-testid="desktop-layout">{leftContent}{rightContent}</div>
  ),
  InviteCard: () => <div data-testid="invite-card" />,
}));
jest.mock('../../../components/RoomChat', () => () => <div data-testid="room-chat" />);
jest.mock('../../../components/Avatar', () => ({ size }: { size: string }) => <div data-testid="avatar" data-size={size} />);
jest.mock('../../../components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

// Mock SocketContext
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};
jest.mock('../../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: mockSocket }),
}));

// Mock AuthContext
let mockIsAuthenticated = false;
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

const defaultProps = {
  gameCode: 'ABCD',
  gameLanguage: 'en' as const,
  username: 'TestPlayer',
  t: (key: string) => key,
  playersReady: [
    { username: 'TestPlayer', isHost: false },
    { username: 'Player2', isHost: false },
    { username: 'HostUser', isHost: true },
  ],
  showQR: false,
  setShowQR: jest.fn(),
  showExitConfirm: false,
  setShowExitConfirm: jest.fn(),
  onExitRoom: jest.fn(),
  onConfirmExit: jest.fn(),
  onToggleReady: jest.fn(),
  isReady: false,
  readyUsernames: [] as string[],
};

describe('PlayerWaitingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
  });

  // Both desktop and mobile render the same content, so use getAllBy for duplicated elements
  describe('Ready Button', () => {
    it('should render ready buttons (desktop + mobile)', () => {
      render(<PlayerWaitingView {...defaultProps} />);
      const buttons = screen.getAllByTestId('ready-button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('should show not-ready state by default', () => {
      render(<PlayerWaitingView {...defaultProps} isReady={false} />);
      const buttons = screen.getAllByTestId('ready-button');
      expect(buttons[0]).toHaveTextContent('playerView.readyUp');
    });

    it('should show ready state when isReady is true', () => {
      render(<PlayerWaitingView {...defaultProps} isReady={true} />);
      const buttons = screen.getAllByTestId('ready-button');
      expect(buttons[0]).toHaveTextContent('playerView.readyConfirmed');
    });

    it('should call onToggleReady when clicked', () => {
      const onToggleReady = jest.fn();
      render(<PlayerWaitingView {...defaultProps} onToggleReady={onToggleReady} />);
      const buttons = screen.getAllByTestId('ready-button');
      fireEvent.click(buttons[0]);
      expect(onToggleReady).toHaveBeenCalledTimes(1);
    });

    it('should show ready indicators on players who are ready', () => {
      render(
        <PlayerWaitingView
          {...defaultProps}
          readyUsernames={['Player2']}
        />
      );
      const indicators = screen.getAllByTestId('ready-indicator-Player2');
      expect(indicators.length).toBeGreaterThanOrEqual(1);
    });

    it('should not show ready indicator for players who are not ready', () => {
      render(
        <PlayerWaitingView
          {...defaultProps}
          readyUsernames={['Player2']}
        />
      );
      expect(screen.queryByTestId('ready-indicator-TestPlayer')).not.toBeInTheDocument();
    });
  });

  describe('Guest Name Editing', () => {
    it('should show edit button for guest users', () => {
      mockIsAuthenticated = false;
      render(<PlayerWaitingView {...defaultProps} />);
      const editButtons = screen.getAllByTestId('edit-name-button');
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should NOT show edit button for authenticated users', () => {
      mockIsAuthenticated = true;
      render(<PlayerWaitingView {...defaultProps} />);
      expect(screen.queryByTestId('edit-name-button')).not.toBeInTheDocument();
    });

    it('should show name input when edit button is clicked', () => {
      mockIsAuthenticated = false;
      render(<PlayerWaitingView {...defaultProps} />);
      const editButtons = screen.getAllByTestId('edit-name-button');
      fireEvent.click(editButtons[0]);
      const inputs = screen.getAllByTestId('name-edit-input');
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    });

    it('should call onNameChange when name is submitted', () => {
      mockIsAuthenticated = false;
      const onNameChange = jest.fn();
      render(<PlayerWaitingView {...defaultProps} onNameChange={onNameChange} />);
      const editButtons = screen.getAllByTestId('edit-name-button');
      fireEvent.click(editButtons[0]);
      const inputs = screen.getAllByTestId('name-edit-input');
      fireEvent.change(inputs[0], { target: { value: 'NewName' } });
      const saveButtons = screen.getAllByTestId('name-save-button');
      fireEvent.click(saveButtons[0]);
      expect(onNameChange).toHaveBeenCalledWith('NewName');
    });
  });

  describe('Existing Functionality', () => {
    it('should not render room code in header (removed)', () => {
      render(<PlayerWaitingView {...defaultProps} />);
      expect(screen.queryByTestId('room-code')).not.toBeInTheDocument();
    });

    it('should render player names in roster', () => {
      render(<PlayerWaitingView {...defaultProps} />);
      // Player names appear multiple times (desktop + mobile), use getAllByText
      const testPlayerElements = screen.getAllByText('TestPlayer');
      expect(testPlayerElements.length).toBeGreaterThanOrEqual(1);
      const player2Elements = screen.getAllByText('Player2');
      expect(player2Elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
