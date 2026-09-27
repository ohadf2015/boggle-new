/**
 * Tests for AcquisitionSources admin analytics panel.
 * Wires /api/admin/players/sources (UTM + referrer breakdown).
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { AcquisitionSources } from '../analytics/AcquisitionSources';

const buildResponse = () => ({
  sources: [
    { name: 'google', count: 80 },
    { name: 'twitter', count: 32 },
    { name: 'direct', count: 110 },
  ],
  mediums: [{ name: 'organic', count: 90 }, { name: 'cpc', count: 20 }],
  campaigns: [{ name: 'launch', count: 12 }],
  referrers: [
    { name: 'google.com', count: 45 },
    { name: 'crazygames.com', count: 30 },
  ],
  breakdown: {
    registeredUsers: 200,
    guestPlayers: 75,
    registeredSources: [{ name: 'google', count: 60 }],
    guestSources: [{ name: 'direct', count: 50 }],
  },
});

describe('AcquisitionSources', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildResponse()),
    }) as unknown as typeof fetch;
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders skeleton on initial mount', () => {
    render(<AcquisitionSources authToken="tok" />);
    expect(screen.getByTestId('sources-skeleton')).toBeInTheDocument();
  });

  it('fetches /api/admin/players/sources with bearer token', async () => {
    render(<AcquisitionSources authToken="my-tok" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/players/sources',
        expect.objectContaining({
          headers: { Authorization: 'Bearer my-tok' },
        })
      );
    });
  });

  it('defaults to the sources tab and renders top entries', async () => {
    render(<AcquisitionSources authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
      expect(screen.getByText('direct')).toBeInTheDocument();
      expect(screen.getByText('twitter')).toBeInTheDocument();
    });
  });

  it('switches to referrers when the referrers tab is clicked', async () => {
    render(<AcquisitionSources authToken="tok" />);
    await waitFor(() => expect(screen.getByText('google')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /referrers/i }));

    await waitFor(() => {
      expect(screen.getByText('google.com')).toBeInTheDocument();
      expect(screen.getByText('crazygames.com')).toBeInTheDocument();
    });
  });

  it('renders empty-state when the chosen dimension has no entries', async () => {
    (global.fetch as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        sources: [],
        mediums: [],
        campaigns: [],
        referrers: [],
        breakdown: { registeredUsers: 0, guestPlayers: 0, registeredSources: [], guestSources: [] },
      }),
    });

    render(<AcquisitionSources authToken="tok" />);
    await waitFor(() => {
      expect(screen.getByTestId('sources-empty')).toBeInTheDocument();
    });
  });
});
