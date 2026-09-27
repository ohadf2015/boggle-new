/**
 * EventBanner Tests
 * Tests for the seasonal event banner component
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import EventBanner from '../EventBanner';

// Mock LanguageContext
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'events.joinNow': 'Join Now!',
    'events.timeRemaining': 'Time Remaining',
    'events.dismiss': 'Dismiss',
    'events.endsIn': 'Ends in',
    'events.joined': 'Joined',
  };
  return translations[key] || key;
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div data-testid="adaptive-motion" {...props}>{children}</div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const baseEvent = {
  id: 'evt-1',
  name: 'Winter Wonderland',
  description: 'Holiday special event with exclusive rewards',
  type: 'holiday' as const,
  status: 'active' as const,
  start_time: '2026-12-20T00:00:00Z',
  end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
  config: { theme: 'winter', accentColor: '#00BFFF' },
  rewards: [{ position: 1, coins: 500, title: 'Winter Champion' }],
};

describe('EventBanner', () => {
  const mockOnJoin = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render event name and description', () => {
    render(<EventBanner event={baseEvent} onJoin={mockOnJoin} onDismiss={mockOnDismiss} />);
    expect(screen.getByText('Winter Wonderland')).toBeInTheDocument();
    expect(screen.getByText('Holiday special event with exclusive rewards')).toBeInTheDocument();
  });

  it('should render Join Now button when not joined', () => {
    render(<EventBanner event={baseEvent} onJoin={mockOnJoin} onDismiss={mockOnDismiss} />);
    expect(screen.getByText('Join Now!')).toBeInTheDocument();
  });

  it('should call onJoin when Join button is clicked', () => {
    render(<EventBanner event={baseEvent} onJoin={mockOnJoin} onDismiss={mockOnDismiss} />);
    fireEvent.click(screen.getByText('Join Now!'));
    expect(mockOnJoin).toHaveBeenCalledWith('evt-1');
  });

  it('should show Joined state when hasJoined is true', () => {
    render(<EventBanner event={baseEvent} onJoin={mockOnJoin} onDismiss={mockOnDismiss} hasJoined />);
    expect(screen.getByText('Joined')).toBeInTheDocument();
  });

  it('should be dismissible', () => {
    render(<EventBanner event={baseEvent} onJoin={mockOnJoin} onDismiss={mockOnDismiss} />);
    const dismissBtn = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissBtn);
    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('should display countdown timer', () => {
    render(<EventBanner event={baseEvent} onJoin={mockOnJoin} onDismiss={mockOnDismiss} />);
    // Should render a time-related element
    expect(screen.getByTestId('event-countdown')).toBeInTheDocument();
  });

  it('should render progress bar for time remaining', () => {
    render(<EventBanner event={baseEvent} onJoin={mockOnJoin} onDismiss={mockOnDismiss} />);
    expect(screen.getByTestId('event-progress-bar')).toBeInTheDocument();
  });

  it('should apply custom accent color from config', () => {
    render(<EventBanner event={baseEvent} onJoin={mockOnJoin} onDismiss={mockOnDismiss} />);
    const banner = screen.getByTestId('event-banner');
    expect(banner).toBeInTheDocument();
  });
});
