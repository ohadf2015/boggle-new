/**
 * Test: New players joining via invitation should not see TrainingGatewayModal
 *
 * Bug: When a player clicks an invitation link to join multiplayer,
 * they should be taken directly to the game without the training gateway interruption.
 * This test verifies that the gateway is NOT shown when joining via invitation link.
 */

import { render, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import MultiplayerPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock SocketContext
jest.mock('@/utils/SocketContext', () => ({
  getSharedSocket: jest.fn(() => ({
    connected: true,
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  })),
  releaseSharedSocket: jest.fn(),
  getSharedSocketIfExists: jest.fn(() => null),
  getSocketURL: jest.fn(() => 'http://localhost:3000'),
  SocketContext: {
    Provider: ({ children }: any) => children,
  },
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isSupabaseEnabled: true,
    profile: null,
    loading: false,
    refreshProfile: jest.fn(),
  }),
}));

// Mock MusicContext
jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    playTrack: jest.fn(),
    fadeToTrack: jest.fn(),
    TRACKS: {
      LOBBY: 'lobby',
      BEFORE_GAME: 'before_game',
    },
  }),
}));

// Mock trainingProgressStorage
const mockShouldShowTrainingGateway = jest.fn();
jest.mock('@/utils/trainingProgressStorage', () => ({
  shouldShowTrainingGateway: () => mockShouldShowTrainingGateway(),
}));

// Mock TrainingGatewayModal
jest.mock('@/components/training', () => ({
  TrainingGatewayModal: jest.fn(() => null),
}));

// Mock other components
jest.mock('@/components/AutoHideHeader', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/app/components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

jest.mock('@/components/ErrorBoundaries', () => ({
  FeatureErrorBoundary: ({ children }: any) => children,
}));

jest.mock('@/components/ConnectionStatusIndicator', () => ({
  ConnectionDot: () => null,
}));

jest.mock('@/components/SpectatorBanner', () => ({
  __esModule: true,
  default: () => null,
}));

describe('TrainingGatewayModal - Invitation Join Behavior', () => {
  // Import the mocked component inside the describe block
  const { TrainingGatewayModal: MockTrainingGatewayModal } = jest.requireMock('@/components/training');

  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    MockTrainingGatewayModal.mockClear();
  });

  it('should NOT show TrainingGatewayModal when joining via invitation link (room parameter present)', async () => {
    // Setup: URL has room parameter (invitation link)
    (useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => key === 'room' ? 'ABC123' : null,
    });

    // Mock that training gateway would normally be shown for new player
    mockShouldShowTrainingGateway.mockReturnValue(true);

    // Render
    render(<MultiplayerPage />);

    // Wait for initial render and effects
    await waitFor(() => {
      // Verify TrainingGatewayModal was called with isOpen=false
      expect(MockTrainingGatewayModal).toHaveBeenCalled();
       
      const calls = MockTrainingGatewayModal.mock.calls as any;
      const lastCall = calls[calls.length - 1];
      expect(lastCall).toBeDefined();
      expect(lastCall[0].isOpen).toBe(false);
    }, { timeout: 2000 });
  });

  it('should show TrainingGatewayModal when entering multiplayer normally (no room parameter)', async () => {
    // Setup: URL has NO room parameter (normal entry)
    (useSearchParams as jest.Mock).mockReturnValue({
      get: () => null,
    });

    // Mock that training gateway should be shown for new player
    mockShouldShowTrainingGateway.mockReturnValue(true);

    // Render
    render(<MultiplayerPage />);

    // Wait for initial render and effects
    await waitFor(() => {
      // Verify TrainingGatewayModal was called with isOpen=true
      expect(MockTrainingGatewayModal).toHaveBeenCalled();

      // Find a call where isOpen is true
       
      const calls = MockTrainingGatewayModal.mock.calls as any;
      const openCall = calls.find(
        (call: any) => call[0].isOpen === true
      );

      expect(openCall).toBeDefined();
    }, { timeout: 2000 });
  });

  it('should NOT show TrainingGatewayModal when player has already completed training', async () => {
    // Setup: No room parameter
    (useSearchParams as jest.Mock).mockReturnValue({
      get: () => null,
    });

    // Mock that training gateway should NOT be shown (already completed)
    mockShouldShowTrainingGateway.mockReturnValue(false);

    // Render
    render(<MultiplayerPage />);

    // Wait for initial render
    await waitFor(() => {
      expect(MockTrainingGatewayModal).toHaveBeenCalled();
    });

    // Verify all calls have isOpen=false
     
    const calls = MockTrainingGatewayModal.mock.calls as any;
    calls.forEach((call: any) => {
      expect(call[0].isOpen).toBe(false);
    });
  });
});
