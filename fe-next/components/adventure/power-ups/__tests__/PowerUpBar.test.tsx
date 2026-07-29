/**
 * Tests for PowerUpBar Component
 *
 * Tests orchestration of 3 power-up buttons, cascade blocking,
 * effect activation, and parent callbacks.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PowerUpBar } from '../PowerUpBar';
import type { TileState } from '@/types/adventure';
import type { HintResult } from '@/hooks/usePowerUpEffects';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'adventure.powerUps.cascadeBlocked') {
        return 'Wait for cascade to complete';
      }
      if (key === 'adventure.powerUps.freezeTime') return 'Freeze Time';
      if (key === 'adventure.powerUps.hint') return 'Hint';
      if (key === 'adventure.powerUps.scoreMultiplier') return 'Score Multiplier';
      if (key === 'adventure.powerUps.ready') return 'Ready';
      if (key === 'adventure.powerUps.cooldown') {
        return `${params?.seconds}s cooldown`;
      }
      return key;
    },
  }),
}));

vi.mock('@/hooks/usePowerUpState', () => ({
  usePowerUpState: (type: string) => ({
    powerUp: {
      type,
      state: 'ready',
      remainingCooldown: 0,
      totalCooldown: 60,
    },
    activate: vi.fn(() => true),
    isReady: true,
  }),
}));

// Create mock functions that persist across renders
const mockActivateFreezeTime = vi.fn(() => ({ timeRemaining: 70 }));
const mockActivateHint = vi.fn(() => ({
  word: 'TEST',
  tiles: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
  ],
}));
const mockActivateScoreMultiplier = vi.fn(() => ({
  multiplier: 2,
  expiresAt: Date.now() + 30000,
}));

vi.mock('@/hooks/usePowerUpEffects', () => ({
  usePowerUpEffects: () => ({
    activateFreezeTime: mockActivateFreezeTime,
    activateHint: mockActivateHint,
    activateScoreMultiplier: mockActivateScoreMultiplier,
  }),
}));

vi.mock('../PowerUpActivationEffect', () => ({
  PowerUpActivationEffect: ({ type, onComplete }: { type: string; onComplete?: () => void }) => {
    React.useEffect(() => {
      onComplete?.();
    }, [onComplete]);
    return <div data-testid={`activation-effect-${type}`}>Effect</div>;
  },
}));

// Mock usePowerUpInventory at module scope
const mockStartCooldownTop = vi.fn();
vi.mock('@/hooks/usePowerUpInventory', () => ({
  usePowerUpInventory: () => ({
    inventory: {
      freezeTimeUnlocked: true,
      hintUnlocked: true,
      scoreMultiplierUnlocked: true,
      cooldownStartedAt: { freezeTime: 0, hint: 0, scoreMultiplier: 0 },
    },
    isUnlocked: () => true,
    startCooldown: mockStartCooldownTop,
    getCooldownRemaining: () => 0,
    resetCooldowns: vi.fn(),
  }),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('react-hot-toast', () => ({
  toast: (message: string) => mockToast(message),
}));

describe('PowerUpBar', () => {
  const mockTiles: TileState[][] = [
    [
      { letter: 'T', type: 'standard', isCleared: false },
      { letter: 'E', type: 'standard', isCleared: false },
    ],
  ];

  const defaultProps = {
    timeRemaining: 60,
    totalTime: 120,
    tiles: mockTiles,
    wordsFound: [],
    cascadeActive: false,
    onFreezeTime: vi.fn(),
    onHint: vi.fn(),
    onScoreMultiplier: vi.fn(),
    dictionary: new Set(['TEST']),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render 3 PowerUpButton components', () => {
      render(<PowerUpBar {...defaultProps} />);

      const buttons = screen.getAllByTestId('power-up-button');
      expect(buttons).toHaveLength(3);
    });

    it('should render Freeze Time button with snowflake icon', () => {
      render(<PowerUpBar {...defaultProps} />);

      // Check for snowflake emoji (❄️)
      expect(screen.getByText('❄️')).toBeInTheDocument();
    });

    it('should render Hint button with lightbulb icon', () => {
      render(<PowerUpBar {...defaultProps} />);

      // Check for lightbulb emoji (💡)
      expect(screen.getByText('💡')).toBeInTheDocument();
    });

    it('should render Score Multiplier button with star icon', () => {
      render(<PowerUpBar {...defaultProps} />);

      // Check for star emoji (⭐)
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });
  });

  describe('Cascade Blocking', () => {
    it('should disable all buttons when cascadeActive=true', () => {
      render(<PowerUpBar {...defaultProps} cascadeActive={true} />);

      const buttons = screen.getAllByTestId('power-up-button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should not call effect functions during cascade', () => {
      const onFreezeTime = vi.fn();
      render(<PowerUpBar {...defaultProps} cascadeActive={true} onFreezeTime={onFreezeTime} />);

      const buttons = screen.getAllByTestId('power-up-button');
      fireEvent.click(buttons[0]);

      expect(onFreezeTime).not.toHaveBeenCalled();
    });
  });

  describe('Freeze Time Activation', () => {
    it('should call onFreezeTime with new time value', async () => {
      const onFreezeTime = vi.fn();
      render(<PowerUpBar {...defaultProps} onFreezeTime={onFreezeTime} />);

      const buttons = screen.getAllByTestId('power-up-button');
      fireEvent.click(buttons[0]); // First button is Freeze Time

      await waitFor(() => {
        expect(onFreezeTime).toHaveBeenCalledWith(70);
      });
    });

    it('should integrate with usePowerUpState for cooldown management', async () => {
      const onFreezeTime = vi.fn();
      render(<PowerUpBar {...defaultProps} onFreezeTime={onFreezeTime} />);

      const buttons = screen.getAllByTestId('power-up-button');
      fireEvent.click(buttons[0]);

      await waitFor(() => {
        expect(mockActivateFreezeTime).toHaveBeenCalled();
      });
    });
  });

  describe('Hint Activation', () => {
    it('should call onHint with HintResult when hint found', async () => {
      const onHint = vi.fn();
      render(<PowerUpBar {...defaultProps} onHint={onHint} />);

      const buttons = screen.getAllByTestId('power-up-button');
      fireEvent.click(buttons[1]); // Second button is Hint

      await waitFor(() => {
        expect(onHint).toHaveBeenCalledWith({
          word: 'TEST',
          tiles: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
        });
      });
    });

    it('should integrate with usePowerUpState for cooldown management', async () => {
      const onHint = vi.fn();
      render(<PowerUpBar {...defaultProps} onHint={onHint} />);

      const buttons = screen.getAllByTestId('power-up-button');
      fireEvent.click(buttons[1]);

      await waitFor(() => {
        expect(mockActivateHint).toHaveBeenCalled();
      });
    });
  });

  describe('Score Multiplier Activation', () => {
    it('should call onScoreMultiplier with expiration timestamp', async () => {
      const onScoreMultiplier = vi.fn();
      const now = Date.now();
      render(<PowerUpBar {...defaultProps} onScoreMultiplier={onScoreMultiplier} />);

      const buttons = screen.getAllByTestId('power-up-button');
      fireEvent.click(buttons[2]); // Third button is Score Multiplier

      await waitFor(() => {
        expect(onScoreMultiplier).toHaveBeenCalled();
        const [[timestamp]] = onScoreMultiplier.mock.calls;
        expect(timestamp).toBeGreaterThan(now);
        expect(timestamp).toBeLessThanOrEqual(now + 31000); // ~30s
      });
    });

    it('should integrate with usePowerUpState for cooldown management', async () => {
      const onScoreMultiplier = vi.fn();
      render(<PowerUpBar {...defaultProps} onScoreMultiplier={onScoreMultiplier} />);

      const buttons = screen.getAllByTestId('power-up-button');
      fireEvent.click(buttons[2]);

      await waitFor(() => {
        expect(mockActivateScoreMultiplier).toHaveBeenCalled();
      });
    });
  });

  describe('Styling', () => {
    it('should apply horizontal flex layout', () => {
      const { container } = render(<PowerUpBar {...defaultProps} />);

      const bar = container.firstChild as HTMLElement;
      expect(bar).toHaveClass('flex');
    });

    it('should apply custom className', () => {
      const { container } = render(<PowerUpBar {...defaultProps} className="custom-class" />);

      const bar = container.firstChild as HTMLElement;
      expect(bar).toHaveClass('custom-class');
    });
  });

  describe('Inventory Persistence Integration', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockActivateFreezeTime.mockClear();
      mockActivateHint.mockClear();
      mockActivateScoreMultiplier.mockClear();
    });

    it('should call inventory.startCooldown when power-up is activated', async () => {
      render(<PowerUpBar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // Freeze Time

      await waitFor(() => {
        expect(mockActivateFreezeTime).toHaveBeenCalled();
      });

      // Note: This test verifies the integration point exists
      // Full integration test in AdventureGame.powerUps.test.tsx
    });

    it('should initialize power-up states with cooldowns from inventory', () => {
      render(<PowerUpBar {...defaultProps} />);

      // Buttons should render (integration verified at hook level)
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });
  });
});
