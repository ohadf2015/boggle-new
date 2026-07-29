/**
 * PowerUpButton Component Tests
 *
 * Tests for power-up button with cooldown indicator.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { PowerUpButton } from '../PowerUpButton';
import type { PowerUpType, PowerUpState } from '@/types/adventure';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params && params.seconds !== undefined) {
        return `${params.seconds}s`;
      }
      return key;
    },
    currentLocale: 'en',
    isRTL: false,
  }),
}));

// Mock CooldownIndicator
vi.mock('@/components/adventure/hud/CooldownIndicator', () => ({
  CooldownIndicator: ({
    icon,
    totalDuration,
    remainingTime,
    label,
  }: {
    icon: string;
    totalDuration: number;
    remainingTime: number;
    label?: string;
  }) => (
    <div data-testid="cooldown-indicator">
      <span data-testid="cooldown-icon">{icon}</span>
      <span data-testid="cooldown-remaining">{remainingTime}</span>
      <span data-testid="cooldown-total">{totalDuration}</span>
      {label && <span data-testid="cooldown-label">{label}</span>}
    </div>
  ),
}));

describe('PowerUpButton', () => {
  const mockOnActivate = vi.fn();

  const defaultProps = {
    type: 'freezeTime' as PowerUpType,
    icon: '❄️',
    label: 'adventure.powerUps.freezeTime',
    state: 'ready' as PowerUpState,
    remainingCooldown: 0,
    totalCooldown: 60,
    onActivate: mockOnActivate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders icon and label', () => {
      render(<PowerUpButton {...defaultProps} />);

      expect(screen.getByTestId('cooldown-icon')).toHaveTextContent('❄️');
      expect(screen.getByTestId('cooldown-label')).toHaveTextContent(
        'adventure.powerUps.freezeTime'
      );
    });

    it('displays cooldown remaining via CooldownIndicator', () => {
      render(
        <PowerUpButton
          {...defaultProps}
          state="cooldown"
          remainingCooldown={30}
        />
      );

      expect(screen.getByTestId('cooldown-remaining')).toHaveTextContent('30');
      expect(screen.getByTestId('cooldown-total')).toHaveTextContent('60');
    });

    it('renders button with neo-brutalist styling', () => {
      const { container } = render(<PowerUpButton {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-neo-purple');
      expect(button).toHaveClass('border-3');
      expect(button).toHaveClass('shadow-hard');
    });
  });

  describe('Interaction - Ready State', () => {
    it('calls onActivate when clicked in ready state', () => {
      const { container } = render(<PowerUpButton {...defaultProps} />);

      const button = container.querySelector('button');
      fireEvent.click(button!);

      expect(mockOnActivate).toHaveBeenCalledTimes(1);
    });

    it('has cursor-pointer when ready', () => {
      const { container } = render(<PowerUpButton {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('cursor-pointer');
    });

    it('has full opacity when ready', () => {
      const { container } = render(<PowerUpButton {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button).not.toHaveClass('opacity-50');
    });
  });

  describe('Interaction - Cooldown State', () => {
    it('does NOT call onActivate when clicked in cooldown state', () => {
      const { container } = render(
        <PowerUpButton
          {...defaultProps}
          state="cooldown"
          remainingCooldown={30}
        />
      );

      const button = container.querySelector('button');
      fireEvent.click(button!);

      expect(mockOnActivate).not.toHaveBeenCalled();
    });

    it('is disabled during cooldown', () => {
      const { container } = render(
        <PowerUpButton
          {...defaultProps}
          state="cooldown"
          remainingCooldown={30}
        />
      );

      const button = container.querySelector('button');
      expect(button).toBeDisabled();
    });

    it('has cursor-not-allowed during cooldown', () => {
      const { container } = render(
        <PowerUpButton
          {...defaultProps}
          state="cooldown"
          remainingCooldown={30}
        />
      );

      const button = container.querySelector('button');
      expect(button).toHaveClass('cursor-not-allowed');
    });

    it('has 50% opacity during cooldown', () => {
      const { container } = render(
        <PowerUpButton
          {...defaultProps}
          state="cooldown"
          remainingCooldown={30}
        />
      );

      const button = container.querySelector('button');
      expect(button).toHaveClass('opacity-50');
    });
  });

  describe('Interaction - Active State', () => {
    it('shows pulsing animation when active', () => {
      const { container } = render(
        <PowerUpButton {...defaultProps} state="active" />
      );

      const button = container.querySelector('button');
      expect(button).toHaveClass('animate-pulse-subtle');
    });
  });

  describe('Disabled Prop', () => {
    it('shows disabled styling when disabled prop is true', () => {
      const { container } = render(
        <PowerUpButton {...defaultProps} disabled={true} />
      );

      const button = container.querySelector('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50');
    });

    it('does NOT call onActivate when disabled', () => {
      const { container } = render(
        <PowerUpButton {...defaultProps} disabled={true} />
      );

      const button = container.querySelector('button');
      fireEvent.click(button!);

      expect(mockOnActivate).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct aria-label with state information', () => {
      const { container } = render(<PowerUpButton {...defaultProps} />);

      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button?.getAttribute('aria-label')).toContain(
        'adventure.powerUps.freezeTime'
      );
      expect(button?.getAttribute('aria-label')).toContain('ready');
    });

    it('includes cooldown remaining in aria-label when in cooldown', () => {
      const { container } = render(
        <PowerUpButton
          {...defaultProps}
          state="cooldown"
          remainingCooldown={30}
        />
      );

      const button = container.querySelector('button');
      expect(button?.getAttribute('aria-label')).toContain('30');
    });
  });

  describe('Different Power-Up Types', () => {
    it('renders hint power-up correctly', () => {
      render(
        <PowerUpButton
          {...defaultProps}
          type="hint"
          icon="💡"
          label="adventure.powerUps.hint"
        />
      );

      expect(screen.getByTestId('cooldown-icon')).toHaveTextContent('💡');
      expect(screen.getByTestId('cooldown-label')).toHaveTextContent(
        'adventure.powerUps.hint'
      );
    });

    it('renders scoreMultiplier power-up correctly', () => {
      render(
        <PowerUpButton
          {...defaultProps}
          type="scoreMultiplier"
          icon="⭐"
          label="adventure.powerUps.scoreMultiplier"
        />
      );

      expect(screen.getByTestId('cooldown-icon')).toHaveTextContent('⭐');
      expect(screen.getByTestId('cooldown-label')).toHaveTextContent(
        'adventure.powerUps.scoreMultiplier'
      );
    });
  });
});
