import React from 'react';
import { render, screen } from '@testing-library/react';
import MultiplayerLobby from '../MultiplayerLobby';

// Mock DJMascot before component renders
vi.mock('@/components/ui/DJMascot', () => ({
  DJMascotWithEntrance: () => <div data-testid="dj-mascot" />,
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

// Mock useMobileLandscape so we always get portrait layout (where the header lives)
vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

// Mock LandscapeIndicator
vi.mock('@/components/LandscapeIndicator', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock join sub-components
vi.mock('@/components/join', () => ({
  RoomList: () => null,
  LanguageSelector: () => null,
  ModeSelector: () => null,
  HostModeFields: () => null,
  JoinModeFields: () => null,
}));

// Mock validation utilities
vi.mock('@/utils/validation', () => ({
  validateUsername: () => ({ isValid: true }),
  validateRoomName: () => ({ isValid: true }),
  validateGameCode: () => ({ isValid: true }),
  sanitizeInput: (v: string) => v,
}));

// Mock useValidation hook
vi.mock('@/hooks/useValidation', () => ({
  useValidation: () => ({ notifyError: vi.fn() }),
}));

// Mock utils
vi.mock('@/utils/utils', () => ({
  generateRoomCode: () => 'ABCD12',
}));

// Mock shared types (not a module that needs mocking, just types)

const defaultProps = {
  handleJoin: vi.fn(),
  gameCode: 'TEST01',
  username: 'player',
  roomName: 'Test Room',
  hostUsername: 'host',
  setGameCode: vi.fn(),
  setUsername: vi.fn(),
  setRoomName: vi.fn(),
  setHostUsername: vi.fn(),
  error: '',
  activeRooms: [],
  refreshRooms: vi.fn(),
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
