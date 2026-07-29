import { render, screen, fireEvent } from '@testing-library/react';
import { SeasonalEventCard } from '../SeasonalEventCard';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
  })),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    language: 'en',
  })),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' },
    isAuthenticated: true,
  })),
}));

const mockUseSeasonalEvents = vi.fn();
vi.mock('@/hooks/useSeasonalEvents', () => ({
  useSeasonalEvents: (...args: unknown[]) => mockUseSeasonalEvents(...args),
}));

const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

const baseEvent = {
  id: 'event-1',
  name: 'Spring Wordathlon',
  description: 'Compete in the spring word festival!',
  type: 'seasonal',
  status: 'active',
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  endTime: futureDate,
  config: {},
  rewards: [
    { rank: 1, type: 'coins' as const, amount: 500, description: '500 Gold' },
    { rank: 2, type: 'avatar_part' as const, description: 'Spring Hat' },
  ],
};

describe('SeasonalEventCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when loading', () => {
    mockUseSeasonalEvents.mockReturnValue({
      activeEvents: [],
      myParticipation: [],
      loading: true,
    });

    const { container } = render(<SeasonalEventCard />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no active events', () => {
    mockUseSeasonalEvents.mockReturnValue({
      activeEvents: [],
      myParticipation: [],
      loading: false,
    });

    const { container } = render(<SeasonalEventCard />);
    expect(container.innerHTML).toBe('');
  });

  it('shows event name and countdown', () => {
    mockUseSeasonalEvents.mockReturnValue({
      activeEvents: [baseEvent],
      myParticipation: [],
      loading: false,
    });

    render(<SeasonalEventCard />);

    expect(screen.getByTestId('seasonal-event-card')).toBeInTheDocument();
    expect(screen.getByText('Spring Wordathlon')).toBeInTheDocument();
    expect(screen.getByTestId('event-countdown')).toBeInTheDocument();
    // The countdown should show some time remaining (e.g. "2d 23h" or similar)
    expect(screen.getByTestId('event-countdown').textContent).toBeTruthy();
  });

  it('shows join button when not participating', () => {
    mockUseSeasonalEvents.mockReturnValue({
      activeEvents: [baseEvent],
      myParticipation: [],
      loading: false,
    });

    render(<SeasonalEventCard />);

    const ctaBtn = screen.getByTestId('event-cta-btn');
    expect(ctaBtn).toHaveTextContent('seasonalEvent.joinEvent');

    fireEvent.click(ctaBtn);
    expect(mockPush).toHaveBeenCalledWith('/events/event-1');
  });

  it('shows continue button and progress when participating', () => {
    mockUseSeasonalEvents.mockReturnValue({
      activeEvents: [baseEvent],
      myParticipation: [
        { eventId: 'event-1', userId: 'test-user-id', score: 250, rank: 5, rewardsClaimed: false, joinedAt: '' },
      ],
      loading: false,
    });

    render(<SeasonalEventCard />);

    const ctaBtn = screen.getByTestId('event-cta-btn');
    expect(ctaBtn).toHaveTextContent('seasonalEvent.continuePlaying');

    // Progress bar should be present
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    // 250/1000 = 25%
    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
  });

  it('renders reward preview', () => {
    mockUseSeasonalEvents.mockReturnValue({
      activeEvents: [baseEvent],
      myParticipation: [],
      loading: false,
    });

    render(<SeasonalEventCard />);

    expect(screen.getByTestId('reward-preview')).toBeInTheDocument();
    expect(screen.getByText('500 Gold')).toBeInTheDocument();
    expect(screen.getByText('Spring Hat')).toBeInTheDocument();
  });
});
