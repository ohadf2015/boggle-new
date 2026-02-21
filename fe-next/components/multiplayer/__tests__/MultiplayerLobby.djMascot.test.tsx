import React from 'react';
import { render, screen } from '@testing-library/react';
import MultiplayerLobby from '../MultiplayerLobby';

// Mock DJMascot before component renders
jest.mock('@/components/ui/DJMascot', () => ({
  DJMascotWithEntrance: () => <div data-testid="dj-mascot" />,
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

// Mock useMobileLandscape so we always get portrait layout (where the header lives)
jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

// Mock LandscapeIndicator
jest.mock('@/components/LandscapeIndicator', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock join sub-components
jest.mock('@/components/join', () => ({
  RoomList: () => null,
  LanguageSelector: () => null,
  ModeSelector: () => null,
  HostModeFields: () => null,
  JoinModeFields: () => null,
}));

// Mock validation utilities
jest.mock('@/utils/validation', () => ({
  validateUsername: () => ({ isValid: true }),
  validateRoomName: () => ({ isValid: true }),
  validateGameCode: () => ({ isValid: true }),
  sanitizeInput: (v: string) => v,
}));

// Mock useValidation hook
jest.mock('@/hooks/useValidation', () => ({
  useValidation: () => ({ notifyError: jest.fn() }),
}));

// Mock utils
jest.mock('@/utils/utils', () => ({
  generateRoomCode: () => 'ABCD12',
}));

// Mock shared types (not a module that needs mocking, just types)

const defaultProps = {
  handleJoin: jest.fn(),
  gameCode: 'TEST01',
  username: 'player',
  roomName: 'Test Room',
  hostUsername: 'host',
  setGameCode: jest.fn(),
  setUsername: jest.fn(),
  setRoomName: jest.fn(),
  setHostUsername: jest.fn(),
  error: '',
  activeRooms: [],
  refreshRooms: jest.fn(),
  roomsLoading: false,
  isAuthenticated: false,
  displayName: '',
  isJoining: false,
  prefilledRoom: '',
  isAutoJoining: false,
  isProfileLoading: false,
};

describe('MultiplayerLobby - DJMascot placement', () => {
  it('renders DJMascotWithEntrance in the header', () => {
    render(<MultiplayerLobby {...defaultProps} />);
    expect(screen.getByTestId('dj-mascot')).toBeInTheDocument();
  });
});
