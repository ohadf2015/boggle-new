import { render, screen, act } from '@testing-library/react';
import MechanicBonusToast, { type MechanicBonusData } from '../MechanicBonusToast';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => (
      <div role={props.role} aria-live={props['aria-live']} className={props.className}>
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
