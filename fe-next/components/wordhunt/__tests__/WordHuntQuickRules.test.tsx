import { render, screen, fireEvent, act } from '@testing-library/react';
import { WordHuntQuickRules, TIP_COUNT, AUTO_DISMISS_MS } from '../WordHuntQuickRules';

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <button {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>;
    },
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockT = (key: string) => key;

describe('WordHuntQuickRules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the compact quick-tips card', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    expect(screen.getByTestId('quick-rules')).toBeInTheDocument();
  });

  it('shows all tips at once as a compact list', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    for (let i = 0; i < TIP_COUNT; i++) {
      expect(screen.getByTestId(`tip-${i}`)).toBeInTheDocument();
    }
  });

  it('renders a close button', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    expect(screen.getByTestId('rules-dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<WordHuntQuickRules onDismiss={onDismiss} t={mockT} />);
    fireEvent.click(screen.getByTestId('rules-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after AUTO_DISMISS_MS', () => {
    const onDismiss = vi.fn();
    render(<WordHuntQuickRules onDismiss={onDismiss} t={mockT} />);
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(AUTO_DISMISS_MS); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not auto-dismiss before AUTO_DISMISS_MS', () => {
    const onDismiss = vi.fn();
    render(<WordHuntQuickRules onDismiss={onDismiss} t={mockT} />);

    act(() => { vi.advanceTimersByTime(AUTO_DISMISS_MS - 100); });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('is non-blocking — no fixed inset-0 background', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    const card = screen.getByTestId('quick-rules');
    // Should NOT have full-screen blocking styles
    expect(card.className).not.toContain('inset-0');
  });

  it('shows the quick tips title', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    expect(screen.getByText('wordHuntRules.quickTipsTitle')).toBeInTheDocument();
  });
});
