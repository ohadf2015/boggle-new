/**
 * Tests for LiveActivityIndicator component
 * Tests real-time activity visualization
 */

import { render, screen } from '@testing-library/react';
import { LiveActivityIndicator } from '../LiveActivityIndicator';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: any) => {
      if (key === 'education.analytics.activeNow' && params?.count !== undefined) {
        return `${params.count} active now`;
      }
      if (key === 'education.analytics.updatedAgo' && params?.time !== undefined) {
        return `Updated ${params.time} ago`;
      }

      const translations: Record<string, string> = {
        'education.analytics.live': 'Live',
        'education.analytics.offline': 'Offline',
        'education.analytics.connecting': 'Connecting...',
        'education.analytics.connectionError': 'Connection issue',
        'education.analytics.noActivity': 'No activity',
      };
      return translations[key] || key;
    },
    language: 'en',
    locale: 'en',
    setLanguage: vi.fn(),
  }),
}));

describe('LiveActivityIndicator', () => {
  // ==================== TEST 1: Connected with Active Students ====================

  it('should render connected state with active students', () => {
    const { container } = render(
      <LiveActivityIndicator
        isConnected={true}
        activeStudentsCount={3}
        lastUpdate={new Date()}
        connectionStatus="connected"
      />
    );

    expect(screen.getByText('Live')).toBeInTheDocument();
    // Use regex to match text that might be broken up
    expect(screen.getByText(/3 active now/)).toBeInTheDocument();
  });

  // ==================== TEST 2: Disconnected State ====================

  it('should render disconnected state', () => {
    render(
      <LiveActivityIndicator
        isConnected={false}
        activeStudentsCount={0}
        lastUpdate={null}
        connectionStatus="disconnected"
      />
    );

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  // ==================== TEST 3: Connecting State ====================

  it('should render connecting state', () => {
    render(
      <LiveActivityIndicator
        isConnected={false}
        activeStudentsCount={0}
        lastUpdate={null}
        connectionStatus="connecting"
      />
    );

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  // ==================== TEST 4: Error State ====================

  it('should render error state', () => {
    render(
      <LiveActivityIndicator
        isConnected={false}
        activeStudentsCount={0}
        lastUpdate={null}
        connectionStatus="error"
      />
    );

    expect(screen.getByText('Connection issue')).toBeInTheDocument();
  });

  // ==================== TEST 5: Active Count ====================

  it('should show correct active count', () => {
    render(
      <LiveActivityIndicator
        isConnected={true}
        activeStudentsCount={5}
        lastUpdate={new Date()}
        connectionStatus="connected"
      />
    );

    expect(screen.getByText(/5 active now/)).toBeInTheDocument();
  });

  // ==================== TEST 6: No Activity ====================

  it('should show no activity when count is zero', () => {
    render(
      <LiveActivityIndicator
        isConnected={true}
        activeStudentsCount={0}
        lastUpdate={null}
        connectionStatus="connected"
      />
    );

    expect(screen.getByText('No activity')).toBeInTheDocument();
  });

  // ==================== TEST 7: Last Update Time ====================

  it('should show last update time', () => {
    const twoSecondsAgo = new Date(Date.now() - 2000);

    render(
      <LiveActivityIndicator
        isConnected={true}
        activeStudentsCount={1}
        lastUpdate={twoSecondsAgo}
        connectionStatus="connected"
      />
    );

    expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument();
  });

  // ==================== TEST 8: Pulse Animation ====================

  it('should have pulse animation when active', () => {
    const { container } = render(
      <LiveActivityIndicator
        isConnected={true}
        activeStudentsCount={2}
        lastUpdate={new Date()}
        connectionStatus="connected"
      />
    );

    // Should have pulse class when active
    const dot = container.querySelector('.animate-pulse');
    expect(dot).toBeInTheDocument();
  });

  // ==================== TEST 9: No Pulse When Idle ====================

  it('should not pulse when idle', () => {
    const { container } = render(
      <LiveActivityIndicator
        isConnected={true}
        activeStudentsCount={0}
        lastUpdate={null}
        connectionStatus="connected"
      />
    );

    // Should not have pulse class when idle
    const dot = container.querySelector('.animate-pulse');
    expect(dot).not.toBeInTheDocument();
  });
});
