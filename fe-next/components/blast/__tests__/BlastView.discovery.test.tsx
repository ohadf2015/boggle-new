/**
 * TDD tests for BlastView wiring discovery state to BlastGame.
 * Tests that useBlastComboDiscovery return values are passed to BlastGame.
 *
 * Written BEFORE implementation (RED phase).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

jest.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => jest.fn(),
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ unlockAudio: jest.fn() }),
}));

jest.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => null,
}));

jest.mock('../BlastResults', () => ({
  BlastResults: () => <div data-testid="blast-results" />,
}));

jest.mock('../BlastWaveTransition', () => ({
  BlastWaveTransition: () => <div data-testid="blast-wave-transition" />,
}));

jest.mock('../utils/blastWaveConfig', () => ({
  getWaveConfig: () => ({
    movesAllowed: 20,
    specialTileChance: 0.3,
    minWordLength: 2,
    scoreThreshold: 0,
  }),
  getWaveDistribution: () => ({}),
  getWaveObjectives: () => [{ type: 'score_target', target: 20 }],
}));

jest.mock('../BlastWaveIntro', () => ({
  BlastWaveIntro: ({ onReady }: { onReady: () => void }) => (
    <div data-testid="wave-intro">
      <button onClick={() => onReady()}>go</button>
    </div>
  ),
}));

jest.mock('../types', () => ({
  resolveBlastConfig: () => ({
    gridSize: 4,
    language: 'en',
    difficulty: 'medium',
    specialTileChance: 0.3,
  }),
}));

// Mock useBlastComboDiscovery returning all 4 values
const mockOnComboDetected = jest.fn();
const mockAcknowledgeDiscovery = jest.fn();
const mockUseBlastComboDiscovery = jest.fn();

// Captures the options argument passed to useBlastComboDiscovery
let capturedDiscoveryOptions: any = undefined;
jest.mock('../hooks/useBlastComboDiscovery', () => ({
  useBlastComboDiscovery: (opts?: any) => {
    capturedDiscoveryOptions = opts;
    return mockUseBlastComboDiscovery();
  },
}));

// Mutable variable to control auth state in tests
let mockAuthUser: { id: string } | null = null;
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

// Capture props passed to BlastGame
let capturedBlastGameProps: any = null;
jest.mock('../BlastGame', () => ({
  BlastGame: (props: any) => {
    capturedBlastGameProps = props;
    return <div data-testid="blast-game" />;
  },
}));

// Capture props passed to BlastReadyScreen
let capturedReadyScreenProps: any = null;
jest.mock('../BlastReadyScreen', () => ({
  BlastReadyScreen: (props: any) => {
    capturedReadyScreenProps = props;
    return (
      <div data-testid="blast-ready-screen">
        <button onClick={() => props.onStart()}>play</button>
      </div>
    );
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import BlastView from '../BlastView';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastView discovery prop wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedBlastGameProps = null;
    capturedReadyScreenProps = null;
    capturedDiscoveryOptions = undefined;
    mockAuthUser = null;

    // Default: no pending discovery
    mockUseBlastComboDiscovery.mockReturnValue({
      discoveredCombos: new Set(),
      pendingDiscovery: null,
      onComboDetected: mockOnComboDetected,
      acknowledgeDiscovery: mockAcknowledgeDiscovery,
    });
  });

  function renderAndStartGame() {
    render(<BlastView />);
    fireEvent.click(screen.getByText('play'));
    // Wave 1 skips intro — goes directly to playing
  }

  it('passes onComboDetected prop to BlastGame when phase is playing', () => {
    renderAndStartGame();
    expect(capturedBlastGameProps?.onComboDetected).toBeDefined();
    expect(capturedBlastGameProps?.onComboDetected).toBe(mockOnComboDetected);
  });

  it('passes pendingDiscovery prop to BlastGame when phase is playing (null case)', () => {
    renderAndStartGame();
    // null is a defined value (not undefined)
    expect('pendingDiscovery' in capturedBlastGameProps).toBe(true);
    expect(capturedBlastGameProps?.pendingDiscovery).toBeNull();
  });

  it('passes pendingDiscovery with a BlastComboType value when discovery is pending', () => {
    mockUseBlastComboDiscovery.mockReturnValue({
      discoveredCombos: new Set(),
      pendingDiscovery: 'bomb_lightning',
      onComboDetected: mockOnComboDetected,
      acknowledgeDiscovery: mockAcknowledgeDiscovery,
    });

    renderAndStartGame();
    expect(capturedBlastGameProps?.pendingDiscovery).toBe('bomb_lightning');
  });

  it('passes acknowledgeDiscovery prop to BlastGame when phase is playing', () => {
    renderAndStartGame();
    expect(capturedBlastGameProps?.acknowledgeDiscovery).toBeDefined();
    expect(capturedBlastGameProps?.acknowledgeDiscovery).toBe(mockAcknowledgeDiscovery);
  });

  it('passes userId from useAuth to useBlastComboDiscovery when user is authenticated', () => {
    mockAuthUser = { id: 'user-123' };
    render(<BlastView />);
    expect(capturedDiscoveryOptions).toBeDefined();
    expect(capturedDiscoveryOptions?.userId).toBe('user-123');
  });

  it('passes undefined userId to useBlastComboDiscovery when user is null (unauthenticated)', () => {
    mockAuthUser = null;
    render(<BlastView />);
    expect(capturedDiscoveryOptions?.userId).toBeUndefined();
  });
});
