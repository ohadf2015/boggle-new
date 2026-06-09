import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: Object.assign(React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement> & { initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }>(
      function MotionDiv({ children, initial, animate, exit, transition, ...props }, ref) {
        return <div ref={ref} {...props}>{children}</div>;
      }
    ), { displayName: 'm.div' }),
    p: Object.assign(React.forwardRef<HTMLParagraphElement, React.HTMLProps<HTMLParagraphElement> & { initial?: unknown; animate?: unknown; transition?: unknown }>(
      function MotionP({ children, initial, animate, transition, ...props }, ref) {
        return <p ref={ref} {...props}>{children}</p>;
      }
    ), { displayName: 'm.p' }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { WordHuntGameOverOverlay } from '../WordHuntGameOverOverlay';

const mockT = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'wordHunt.mp.youEliminated': "You've been eliminated!",
    'wordHunt.mp.youFoundIt': 'You Found It!',
    'wordHunt.mp.watchOthers': 'Watch the remaining players',
    'wordHunt.mp.stillHunting': '{count} still hunting',
    'wordHunt.mp.spectating': 'Spectating',
  };
  const raw = translations[key] || key;
  if (params) {
    return raw.replace(/\{(\w+)\}/g, (_m, k) => String(params[k] ?? `{${k}}`));
  }
  return raw;
};

describe('WordHuntGameOverOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when reason is null', () => {
    const { container } = render(
      <WordHuntGameOverOverlay reason={null} t={mockT} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows eliminated text when reason is eliminated', () => {
    render(<WordHuntGameOverOverlay reason="eliminated" t={mockT} />);
    expect(screen.getByText("You've been eliminated!")).toBeInTheDocument();
  });

  it('shows victory text when reason is found', () => {
    render(<WordHuntGameOverOverlay reason="found" t={mockT} />);
    expect(screen.getByText('You Found It!')).toBeInTheDocument();
  });

  it('shows watch others subtitle during impact phase', () => {
    render(<WordHuntGameOverOverlay reason="eliminated" t={mockT} />);
    expect(screen.getByText('Watch the remaining players')).toBeInTheDocument();
  });

  it('transitions to spectator phase after timeout', () => {
    render(<WordHuntGameOverOverlay reason="eliminated" t={mockT} />);
    // Initially shows eliminated text
    expect(screen.getByText("You've been eliminated!")).toBeInTheDocument();

    // After spectator delay (2800ms), should show spectator view
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Spectator phase shows the watch text in the eye icon row
    const watchTexts = screen.getAllByText('Watch the remaining players');
    expect(watchTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('surfaces live "still hunting" count in the spectator phase when eliminated', () => {
    render(
      <WordHuntGameOverOverlay reason="eliminated" t={mockT} playersRemaining={3} />
    );

    // Advance past impact → spectator.
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // The spectator state must show how many players are still hunting — live
    // shared content so the dead player isn't staring at a frozen board.
    expect(screen.getByText('3 still hunting')).toBeInTheDocument();
  });

  it('does not render the still-hunting count when playersRemaining is undefined', () => {
    render(<WordHuntGameOverOverlay reason="eliminated" t={mockT} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(/still hunting/)).not.toBeInTheDocument();
  });

  it('shows victory particles when reason is found', () => {
    const { container } = render(
      <WordHuntGameOverOverlay reason="found" t={mockT} />
    );
    // Victory particles render Sparkles icons (12 of them)
    const sparkles = container.querySelectorAll('.absolute.z-10');
    expect(sparkles.length).toBe(12);
  });

  it('does not show victory particles when eliminated', () => {
    const { container } = render(
      <WordHuntGameOverOverlay reason="eliminated" t={mockT} />
    );
    const sparkles = container.querySelectorAll('.absolute.z-10');
    expect(sparkles.length).toBe(0);
  });
});
