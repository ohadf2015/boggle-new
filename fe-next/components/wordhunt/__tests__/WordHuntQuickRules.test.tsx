import { render, screen, fireEvent, act } from '@testing-library/react';
import { WordHuntQuickRules, PANEL_COUNT } from '../WordHuntQuickRules';

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

const mockT = (key: string, params?: Record<string, string | number>) => {
  if (params) {
    let result = key;
    for (const [k, v] of Object.entries(params)) {
      result += ` ${k}=${v}`;
    }
    return result;
  }
  return key;
};

describe('WordHuntQuickRules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the quick rules overlay', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    expect(screen.getByTestId('quick-rules')).toBeInTheDocument();
  });

  it('starts on panel 0', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    expect(screen.getByTestId('rules-panel-0')).toBeInTheDocument();
  });

  it('renders 4 dot indicators', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    const dots = screen.getByTestId('rules-dots');
    expect(dots.children).toHaveLength(PANEL_COUNT);
  });

  it('shows skip button on first panel', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    expect(screen.getByTestId('rules-dismiss')).toHaveTextContent('wordHuntRules.skip');
  });

  it('clicking a dot navigates to that panel', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    const dots = screen.getByTestId('rules-dots');
    fireEvent.click(dots.children[2]);
    expect(screen.getByTestId('rules-panel-2')).toBeInTheDocument();
  });

  it('auto-advances panels every 4 seconds', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    expect(screen.getByTestId('rules-panel-0')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByTestId('rules-panel-1')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByTestId('rules-panel-2')).toBeInTheDocument();
  });

  it('stops auto-advancing on last panel', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    // Advance through all panels
    for (let i = 0; i < PANEL_COUNT; i++) {
      act(() => { vi.advanceTimersByTime(4000); });
    }
    // Should stay on last panel
    expect(screen.getByTestId(`rules-panel-${PANEL_COUNT - 1}`)).toBeInTheDocument();

    // Another tick shouldn't crash
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByTestId(`rules-panel-${PANEL_COUNT - 1}`)).toBeInTheDocument();
  });

  it('shows "Got it!" on last panel', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    // Navigate to last panel
    const dots = screen.getByTestId('rules-dots');
    fireEvent.click(dots.children[PANEL_COUNT - 1]);
    expect(screen.getByTestId('rules-dismiss')).toHaveTextContent('wordHuntRules.gotIt');
  });

  it('calls onDismiss when button is clicked', () => {
    const onDismiss = vi.fn();
    render(<WordHuntQuickRules onDismiss={onDismiss} t={mockT} />);
    fireEvent.click(screen.getByTestId('rules-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows panel counter', () => {
    render(<WordHuntQuickRules onDismiss={vi.fn()} t={mockT} />);
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
  });
});
