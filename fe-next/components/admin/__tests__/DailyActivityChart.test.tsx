/**
 * Tests for DailyActivityChart admin overview component.
 * Wires /api/admin/activity/daily timeseries into a chart.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

// Mock recharts to keep the test light + avoid SVG layout issues in jsdom.
// We render placeholder divs that expose the data length so we can assert.
vi.mock('recharts', () => {
  const Stub = ({ children, 'data-testid': testId }: { children?: React.ReactNode; 'data-testid'?: string }) =>
    React.createElement('div', { 'data-testid': testId }, children);

  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'rc-container' }, children),
    LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) =>
      React.createElement('div', { 'data-testid': 'rc-line-chart', 'data-points': data?.length ?? 0 }, children),
    Line: () => React.createElement('div', { 'data-testid': 'rc-line' }),
    XAxis: () => Stub({ 'data-testid': 'rc-xaxis' }),
    YAxis: () => Stub({ 'data-testid': 'rc-yaxis' }),
    CartesianGrid: () => Stub({ 'data-testid': 'rc-grid' }),
    Tooltip: () => Stub({ 'data-testid': 'rc-tooltip' }),
    Legend: () => Stub({ 'data-testid': 'rc-legend' }),
  };
});

import { DailyActivityChart } from '../overview/DailyActivityChart';

const buildResponse = (days: number) => ({
  daily: Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    return {
      date: date.toISOString().split('T')[0],
      games: i,
      guestGames: Math.floor(i / 2),
      totalGames: i + Math.floor(i / 2),
      uniquePlayers: i,
      uniqueGuests: Math.floor(i / 3),
      totalUniquePlayers: i + Math.floor(i / 3),
      signups: i % 5,
    };
  }),
});

describe('DailyActivityChart', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildResponse(30)),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders skeleton on initial mount', () => {
    render(<DailyActivityChart authToken="tok" />);
    expect(screen.getByTestId('daily-activity-skeleton')).toBeInTheDocument();
  });

  it('fetches /api/admin/activity/daily with default 30 days and bearer token', async () => {
    render(<DailyActivityChart authToken="my-tok" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/activity/daily?days=30',
        expect.objectContaining({
          headers: { Authorization: 'Bearer my-tok' },
        })
      );
    });
  });

  it('renders the chart with the returned data points', async () => {
    render(<DailyActivityChart authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByTestId('rc-line-chart')).toHaveAttribute('data-points', '30');
    });
  });

  it('refetches with new days range when range button is clicked', async () => {
    render(<DailyActivityChart authToken="tok" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /90d/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/admin/activity/daily?days=90',
        expect.anything()
      );
    });
  });

  it('renders an empty state when the API returns an empty array', async () => {
    (global.fetch as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ daily: [] }),
    });

    render(<DailyActivityChart authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByTestId('daily-activity-empty')).toBeInTheDocument();
    });
  });

  it('renders an error state when the API errors', async () => {
    (global.fetch as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'boom' }),
    });

    render(<DailyActivityChart authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByTestId('daily-activity-error')).toBeInTheDocument();
    });
  });
});
