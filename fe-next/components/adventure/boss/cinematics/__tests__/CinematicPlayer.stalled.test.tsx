/**
 * CinematicPlayer Stall/Fallback Integration Tests
 *
 * Tests for:
 * - Swapping to CinematicFallback when isStalled is true
 * - Mobile-friendly error text ("Tap Skip" vs "Press ESC")
 * - Hiding ESC kbd badge on mobile
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock useCinematic — control isStalled from tests
const mockUseCinematic = jest.fn();
jest.mock('../../../../../hooks/useCinematic', () => ({
  ...jest.requireActual('../../../../../hooks/useCinematic'),
  useCinematic: (...args: unknown[]) => mockUseCinematic(...args),
}));

// Mock useDevicePerformance — control isMobile from tests
const mockUseDevicePerformance = jest.fn();
jest.mock('../../../../../hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => mockUseDevicePerformance(),
}));

// Mock CinematicFallback so we can detect when it renders
jest.mock('../CinematicFallback', () => ({
  CinematicFallback: (props: Record<string, unknown>) => (
    <div data-testid="cinematic-fallback" data-type={props.cinematicType}>
      Fallback Active
    </div>
  ),
}));

// Mock Remotion Player
jest.mock('@remotion/player', () => ({
  Player: jest.fn(() => <div data-testid="mock-remotion-player">Mock Player</div>),
}));

// Mock usePrefersReducedMotion
jest.mock('../../../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: jest.fn(() => false),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safeProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('data-') || key === 'className' || key === 'style') {
          safeProps[key] = value;
        }
      }
      return <div {...safeProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock LanguageContext
jest.mock('../../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'adventure.bosses.cinematics.skip': 'Skip',
        'adventure.bosses.cinematics.skipIn': `Skip in ${params?.seconds || 2}...`,
        'adventure.bosses.cinematics.progress': 'Cinematic progress',
        'adventure.bosses.cinematics.loading': 'Loading...',
        'adventure.bosses.cinematics.errorTapToSkip': 'Tap Skip to continue',
      };
      return translations[key] || key;
    },
  }),
}));

jest.useFakeTimers();

import { CinematicPlayer } from '../CinematicPlayer';

const MockComposition = () => <div>Mock Cinematic</div>;

// Helper to create base useCinematic return value
function createCinematicReturn(overrides: Record<string, unknown> = {}) {
  return {
    isPlaying: true,
    canSkip: false,
    currentFrame: 0,
    progress: 0,
    durationFrames: 240,
    isComplete: false,
    isStalled: false,
    skip: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    reset: jest.fn(),
    handleFrameUpdate: jest.fn(),
    ...overrides,
  };
}

// Helper for default device performance
function createDevicePerf(overrides: Record<string, unknown> = {}) {
  return {
    isLowEnd: false,
    targetFPS: 60,
    throttleMs: 16,
    enableComplexAnimations: true,
    enableGlowEffects: true,
    reduceParticles: false,
    maxParticles: 20,
    isSlowConnection: false,
    isMobile: false,
    prefersReducedMotion: false,
    ...overrides,
  };
}

describe('CinematicPlayer - stall fallback', () => {
  const defaultProps = {
    composition: MockComposition,
    durationSeconds: 8,
    onComplete: jest.fn(),
    fallbackType: 'victory' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockUseCinematic.mockReturnValue(createCinematicReturn());
    mockUseDevicePerformance.mockReturnValue(createDevicePerf());
  });

  it('should render Remotion Player when NOT stalled', () => {
    mockUseCinematic.mockReturnValue(createCinematicReturn({ isStalled: false }));

    render(<CinematicPlayer {...defaultProps} />);

    expect(screen.getByTestId('mock-remotion-player')).toBeInTheDocument();
    expect(screen.queryByTestId('cinematic-fallback')).not.toBeInTheDocument();
  });

  it('should render CinematicFallback when stalled', () => {
    mockUseCinematic.mockReturnValue(createCinematicReturn({ isStalled: true }));

    render(<CinematicPlayer {...defaultProps} />);

    expect(screen.getByTestId('cinematic-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-remotion-player')).not.toBeInTheDocument();
  });

  it('should pass fallbackType to CinematicFallback', () => {
    mockUseCinematic.mockReturnValue(createCinematicReturn({ isStalled: true }));

    render(<CinematicPlayer {...defaultProps} fallbackType="defeat" />);

    expect(screen.getByTestId('cinematic-fallback')).toHaveAttribute('data-type', 'defeat');
  });
});

describe('CinematicPlayer - mobile error text', () => {
  const defaultProps = {
    composition: MockComposition,
    durationSeconds: 8,
    onComplete: jest.fn(),
    fallbackType: 'victory' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockUseCinematic.mockReturnValue(createCinematicReturn({ canSkip: true }));
  });

  it('should show ESC kbd badge on desktop', () => {
    mockUseDevicePerformance.mockReturnValue(createDevicePerf({ isMobile: false }));

    render(<CinematicPlayer {...defaultProps} />);

    expect(screen.getByText('ESC')).toBeInTheDocument();
  });

  it('should hide ESC kbd badge on mobile', () => {
    mockUseDevicePerformance.mockReturnValue(createDevicePerf({ isMobile: true }));

    render(<CinematicPlayer {...defaultProps} />);

    expect(screen.queryByText('ESC')).not.toBeInTheDocument();
  });
});
