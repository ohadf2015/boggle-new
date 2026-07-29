/**
 * Tests for CountryBreakdown admin analytics panel.
 * Wires /api/admin/players/countries (registered + guests, pre-sorted).
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { CountryBreakdown } from '../analytics/CountryBreakdown';

const buildResponse = () => ({
  countries: [
    { country: 'IL', count: 320, registered: 180, guests: 140 },
    { country: 'US', count: 95, registered: 60, guests: 35 },
    { country: 'SE', count: 42, registered: 30, guests: 12 },
  ],
  totals: { registeredUsers: 270, guestPlayers: 187 },
});

describe('CountryBreakdown', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildResponse()),
    }) as unknown as typeof fetch;
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders skeleton on initial mount', () => {
    render(<CountryBreakdown authToken="tok" />);
    expect(screen.getByTestId('country-breakdown-skeleton')).toBeInTheDocument();
  });

  it('fetches /api/admin/players/countries with bearer token', async () => {
    render(<CountryBreakdown authToken="my-tok" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/players/countries',
        expect.objectContaining({
          headers: { Authorization: 'Bearer my-tok' },
        })
      );
    });
  });

  it('renders one row per country with count + registered + guests', async () => {
    render(<CountryBreakdown authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByText('IL')).toBeInTheDocument();
      expect(screen.getByText('US')).toBeInTheDocument();
      expect(screen.getByText('SE')).toBeInTheDocument();
    });

    const rows = screen.getAllByTestId('country-row');
    expect(rows).toHaveLength(3);

    // First row should be the largest (IL: 320 total)
    expect(rows[0]).toHaveTextContent('IL');
    expect(rows[0]).toHaveTextContent('320');
  });

  it('renders the registered + guest totals in a summary line', async () => {
    render(<CountryBreakdown authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByTestId('country-totals')).toHaveTextContent('270');
      expect(screen.getByTestId('country-totals')).toHaveTextContent('187');
    });
  });

  it('renders an empty state when the API returns no countries', async () => {
    (global.fetch as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ countries: [], totals: { registeredUsers: 0, guestPlayers: 0 } }),
    });

    render(<CountryBreakdown authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByTestId('country-breakdown-empty')).toBeInTheDocument();
    });
  });

  it('renders an error state when the API errors', async () => {
    (global.fetch as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'boom' }),
    });

    render(<CountryBreakdown authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByTestId('country-breakdown-error')).toBeInTheDocument();
    });
  });
});
