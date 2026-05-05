/**
 * Smoke tests for PlayerManager filter expansion (Sprint F).
 * Verifies that toggling filter inputs is reflected in the API request URL.
 *
 * The full PlayerManager has many side concerns (gift dialog, blast toggle,
 * pagination) — these tests focus narrowly on filter → URL plumbing.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...rest}>{children}</a>,
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <span data-testid="avatar" />,
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../gift/PlayerGiftDialog', () => ({
  PlayerGiftDialog: () => null,
}));

import { PlayerManager } from '../PlayerManager';

const ok = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

const EMPTY_RESPONSE = { players: [], total: 0 };

function lastUrl() {
  const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
  return (calls[calls.length - 1]?.[0] ?? '') as string;
}

describe('PlayerManager filter expansion', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(ok(EMPTY_RESPONSE)) as unknown as typeof fetch;
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders the new advanced filter bar', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(screen.getByTestId('player-filter-bar')).toBeInTheDocument());
  });

  it('appends country=IL when the country input is filled', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const input = screen.getByPlaceholderText('IL, US, …');
    fireEvent.change(input, { target: { value: 'il' } });

    // Debounced (500ms) — wait for second fetch after debounce
    await waitFor(() => {
      expect(lastUrl()).toContain('country=IL');
    }, { timeout: 1500 });
  });

  it('appends hasBlast=true when the Blast checkbox is ticked', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const checkbox = screen.getByLabelText(/Has Blast access/i);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(lastUrl()).toContain('hasBlast=true');
    }, { timeout: 1500 });
  });

  it('appends daysSinceActive=N when the inactive-days input is filled', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const input = screen.getByPlaceholderText('e.g. 14');
    fireEvent.change(input, { target: { value: '21' } });

    await waitFor(() => {
      expect(lastUrl()).toContain('daysSinceActive=21');
    }, { timeout: 1500 });
  });
});
