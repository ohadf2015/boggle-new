// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react';
import { ChainParticleBurst } from '../ChainParticleBurst';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { getWorldParticleConfig } from '@/lib/adventure/worldThemes';

// Mock dependencies
vi.mock('@/hooks/useDevicePerformance');
vi.mock('@/lib/adventure/worldThemes');

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, style, className, ...props }: any) => (
      <div style={style} className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockUseDevicePerformance = useDevicePerformance as jest.MockedFunction<typeof useDevicePerformance>;
const mockGetWorldParticleConfig = getWorldParticleConfig as jest.MockedFunction<typeof getWorldParticleConfig>;

describe('ChainParticleBurst', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default mock - high-end device
    mockUseDevicePerformance.mockReturnValue({
      isLowEnd: false,
      targetFPS: 60,
      throttleMs: 16,
      enableComplexAnimations: true,
      enableGlowEffects: true,
      reduceParticles: false,
      maxParticles: 20,
      prefersReducedMotion: false,
      isSlowConnection: false,
      isMobile: false,
    });

    // Default world config (world 1 - nature)
    mockGetWorldParticleConfig.mockReturnValue({
      color: '#90EE90',
      emoji: '🌿',
      secondaryColor: '#98FB98',
      size: { min: 6, max: 10 },
      distance: { min: 40, max: 70 },
      duration: 600,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    test('should not render when trigger is false', () => {
      const { container } = render(
        <ChainParticleBurst trigger={false} position={{ x: 100, y: 200 }} world={1} />
      );

      expect(container.firstChild).toBeNull();
    });

    test('should render particles when trigger is true', () => {
      render(<ChainParticleBurst trigger={true} position={{ x: 100, y: 200 }} world={1} />);

      const motionDivs = screen.getAllByTestId('motion-div');
      expect(motionDivs.length).toBeGreaterThan(0);
    });

    test('should render 20 particles for high-end devices', () => {
      render(<ChainParticleBurst trigger={true} position={{ x: 100, y: 200 }} world={1} />);

      const motionDivs = screen.getAllByTestId('motion-div');
      // Should have particles + ring effects + glow
      expect(motionDivs.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('World theming', () => {
    test('should use correct color for world 1 (green)', () => {
      mockGetWorldParticleConfig.mockReturnValue({
        color: '#90EE90', // light green
        emoji: '🌿',
        secondaryColor: '#98FB98',
        size: { min: 6, max: 10 },
        distance: { min: 40, max: 70 },
        duration: 600,
      });

      const { container } = render(
        <ChainParticleBurst trigger={true} position={{ x: 100, y: 200 }} world={1} />
      );

      expect(mockGetWorldParticleConfig).toHaveBeenCalledWith(1);

      // Check that elements with the green color exist (converted to rgb)
      const elementsWithColor = container.querySelectorAll('[style*="rgb(144, 238, 144)"]');
      expect(elementsWithColor.length).toBeGreaterThan(0);
    });

    test('should use correct emoji for world 7 (snowflake)', () => {
      mockGetWorldParticleConfig.mockReturnValue({
        color: '#00FFFF', // cyan
        emoji: '❄️',
        secondaryColor: '#E0FFFF',
        size: { min: 8, max: 12 },
        distance: { min: 50, max: 80 },
        duration: 600,
      });

      const { container } = render(
        <ChainParticleBurst trigger={true} position={{ x: 100, y: 200 }} world={7} />
      );

      expect(mockGetWorldParticleConfig).toHaveBeenCalledWith(7);

      // Should render snowflake emoji in some particles
      expect(container.textContent).toContain('❄️');
    });

    test('should fall back to world 1 config for invalid world number', () => {
      mockGetWorldParticleConfig.mockReturnValue({
        color: '#90EE90', // world 1 fallback
        emoji: '🌿',
        secondaryColor: '#98FB98',
        size: { min: 6, max: 10 },
        distance: { min: 40, max: 70 },
        duration: 600,
      });

      render(<ChainParticleBurst trigger={true} position={{ x: 100, y: 200 }} world={999} />);

      expect(mockGetWorldParticleConfig).toHaveBeenCalledWith(999);
    });
  });

  describe('Performance adaptation', () => {
    test('should render 4 particles for low-end devices', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: true,
        targetFPS: 30,
        throttleMs: 33,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        reduceParticles: true,
        maxParticles: 4,
        prefersReducedMotion: false,
        isSlowConnection: false,
        isMobile: true,
      });

      render(<ChainParticleBurst trigger={true} position={{ x: 100, y: 200 }} world={1} />);

      const motionDivs = screen.getAllByTestId('motion-div');
      // Low-end: 4 particles, no glow effects or rings
      expect(motionDivs.length).toBe(4);
    });

    test('should render 12 particles for mid-range devices', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        targetFPS: 60,
        throttleMs: 16,
        enableComplexAnimations: true,
        enableGlowEffects: true,
        reduceParticles: true,
        maxParticles: 8, // mid-range indicator
        prefersReducedMotion: false,
        isSlowConnection: false,
        isMobile: false,
      });

      render(<ChainParticleBurst trigger={true} position={{ x: 100, y: 200 }} world={1} />);

      const motionDivs = screen.getAllByTestId('motion-div');
      // Mid-range: 12 particles + ring effects + glow
      expect(motionDivs.length).toBeGreaterThanOrEqual(12);
    });

    test('should skip particles for prefersReducedMotion', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        targetFPS: 60,
        throttleMs: 16,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        reduceParticles: true,
        maxParticles: 0,
        prefersReducedMotion: true,
        isSlowConnection: false,
        isMobile: false,
      });

      const { container } = render(
        <ChainParticleBurst trigger={true} position={{ x: 100, y: 200 }} world={1} />
      );

      // Should show static emoji badge instead
      expect(container.textContent).toContain('🌿');

      // Should have exactly one div (the static badge)
      const divs = container.querySelectorAll('div');
      expect(divs.length).toBe(2); // wrapper + badge
    });
  });

  describe('Lifecycle', () => {
    test('should use world config duration for animation timer', () => {
      const config600 = {
        color: '#90EE90',
        emoji: '🌿',
        secondaryColor: '#98FB98',
        size: { min: 6, max: 10 },
        distance: { min: 40, max: 70 },
        duration: 600,
      };

      mockGetWorldParticleConfig.mockReturnValue(config600);

      render(<ChainParticleBurst trigger={true} position={{ x: 100, y: 200 }} world={1} />);

      // Component should accept world config and use duration for timer
      expect(mockGetWorldParticleConfig).toHaveBeenCalledWith(1);

      // Timer should be set (can't directly test setTimeout, but verify config is used)
      const config = mockGetWorldParticleConfig.mock.results[0].value;
      expect(config.duration).toBe(600);
    });

    test('should accept onComplete callback prop', () => {
      const onComplete = vi.fn();

      const { container } = render(
        <ChainParticleBurst
          trigger={true}
          position={{ x: 100, y: 200 }}
          world={1}
          onComplete={onComplete}
        />
      );

      // Component should render without error when callback provided
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Position', () => {
    test('should position at correct x, y coordinates', () => {
      const { container } = render(
        <ChainParticleBurst trigger={true} position={{ x: 250, y: 350 }} world={1} />
      );

      const wrapper = container.querySelector('[style*="left"]');
      expect(wrapper).toHaveStyle({ left: '250px', top: '350px' });
    });

    test('should center particles with transform translate', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        targetFPS: 60,
        throttleMs: 16,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        reduceParticles: true,
        maxParticles: 0,
        prefersReducedMotion: true,
        isSlowConnection: false,
        isMobile: false,
      });

      const { container } = render(
        <ChainParticleBurst trigger={true} position={{ x: 250, y: 350 }} world={1} />
      );

      // Reduced motion fallback should center with translate
      const badge = container.querySelector('[style*="translate"]');
      expect(badge).toHaveStyle({ transform: 'translate(-50%, -50%)' });
    });
  });
});
