import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import MechanicBonusToast, { type MechanicBonusData } from '../MechanicBonusToast';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => (
      <div
        role={props.role}
        aria-live={props['aria-live']}
        className={props.className}
        data-testid="motion-root"
      >
        {children}
      </div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('MechanicBonusToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when bonus is null', () => {
    const { container } = render(
      <MechanicBonusToast bonus={null} onDismiss={vi.fn()} />
    );
    expect(container.textContent).toBe('');
  });

  it('renders feedbackKey and multiplier percentage when bonus provided', () => {
    const bonus: MechanicBonusData = {
      id: 1,
      feedbackKey: 'adventure.mechanic.synonymPairs',
      multiplier: 1.25,
    };
    render(<MechanicBonusToast bonus={bonus} onDismiss={vi.fn()} />);

    expect(screen.getByText('adventure.mechanic.synonymPairs')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('has role="status" and aria-live="polite" for accessibility', () => {
    const bonus: MechanicBonusData = { id: 2, feedbackKey: 'key', multiplier: 1.5 };
    render(<MechanicBonusToast bonus={bonus} onDismiss={vi.fn()} />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onDismiss after auto-dismiss timeout', () => {
    const onDismiss = vi.fn();
    const bonus: MechanicBonusData = { id: 3, feedbackKey: 'key', multiplier: 1.2 };
    render(<MechanicBonusToast bonus={bonus} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses default top-20 position when bossActive is false/undefined', () => {
    const bonus: MechanicBonusData = { id: 10, feedbackKey: 'k', multiplier: 1.1 };
    render(<MechanicBonusToast bonus={bonus} onDismiss={vi.fn()} />);
    const root = screen.getByTestId('motion-root');
    expect(root.className).toMatch(/top-20/);
    expect(root.className).not.toMatch(/top-44/);
  });

  it('shifts below boss HUD when bossActive is true (avoids HP-bar overlap)', () => {
    const bonus: MechanicBonusData = { id: 11, feedbackKey: 'k', multiplier: 1.1 };
    render(<MechanicBonusToast bonus={bonus} onDismiss={vi.fn()} bossActive />);
    const root = screen.getByTestId('motion-root');
    // Must be clear of the boss HUD strip (top-12 .. ~top-28) and dialogue (top-28 .. ~top-44)
    expect(root.className).toMatch(/top-44/);
    expect(root.className).not.toMatch(/top-20\b/);
  });

  it('displays correct percentage for various multipliers', () => {
    const { rerender } = render(
      <MechanicBonusToast
        bonus={{ id: 4, feedbackKey: 'k', multiplier: 1.5 }}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('50%')).toBeInTheDocument();

    rerender(
      <MechanicBonusToast
        bonus={{ id: 5, feedbackKey: 'k', multiplier: 2.0 }}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
