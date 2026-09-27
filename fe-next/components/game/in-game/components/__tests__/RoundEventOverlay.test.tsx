/**
 * RoundEventOverlay — effect line rendering tests
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoundEventOverlay, type RoundEventState } from '../RoundEventOverlay';

// Mock motion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
  AdaptiveMotion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
    span: ({ children, className }: any) => <span className={className}>{children}</span>,
  },
}));

// Mock RoundEventCanvas
vi.mock('../RoundEventCanvas', () => ({
  RoundEventCanvas: () => <div data-testid="round-event-canvas" />,
}));

const mockT = (key: string) => {
  if (key === 'roundEvent.blizzardWarning') return 'Blizzard Warning';
  if (key === 'roundEvent.blizzardEffect') return "Frozen tiles can't be used until they thaw";
  if (key === 'roundEvent.lightningWarning') return 'Lightning Warning';
  if (key === 'roundEvent.lightningEffect') return 'Charged tiles score bonus points — grab them fast';
  if (key === 'roundEvent.meteorWarning') return 'Meteor Warning';
  if (key === 'roundEvent.meteorEffect') return 'New letters crash in — fresh words appear';
  return key;
};

describe('RoundEventOverlay effect line (catalyst unification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the blizzard effect description in the warning banner', () => {
    const event: RoundEventState = { type: 'blizzard', phase: 'warning' };
    render(<RoundEventOverlay event={event} t={mockT} />);
    expect(
      screen.getByText("Frozen tiles can't be used until they thaw")
    ).toBeInTheDocument();
  });

  it('renders the lightning effect description in the warning banner', () => {
    const event: RoundEventState = { type: 'lightning', phase: 'warning' };
    render(<RoundEventOverlay event={event} t={mockT} />);
    expect(
      screen.getByText('Charged tiles score bonus points — grab them fast')
    ).toBeInTheDocument();
  });

  it('renders the meteor effect description in the warning banner', () => {
    const event: RoundEventState = { type: 'meteor', phase: 'warning' };
    render(<RoundEventOverlay event={event} t={mockT} />);
    expect(
      screen.getByText('New letters crash in — fresh words appear')
    ).toBeInTheDocument();
  });

  it('does not render warning when phase is idle', () => {
    const event: RoundEventState = { type: 'blizzard', phase: 'idle' };
    const { container } = render(<RoundEventOverlay event={event} t={mockT} />);
    expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
  });

  it('renders effect text alongside warning text', () => {
    const event: RoundEventState = { type: 'blizzard', phase: 'warning' };
    render(<RoundEventOverlay event={event} t={mockT} />);
    expect(screen.getByText('Blizzard Warning')).toBeInTheDocument();
    expect(
      screen.getByText("Frozen tiles can't be used until they thaw")
    ).toBeInTheDocument();
  });

  it('does not render when event is null', () => {
    const { container } = render(<RoundEventOverlay event={null} t={mockT} />);
    expect(container.firstChild).toBeNull();
  });
});
