/**
 * Tests for PlayerManager: collapsible advanced filters + bulk-gift selection.
 *
 * The full PlayerManager has many side concerns (gift dialog, blast toggle,
 * pagination) — these tests focus on filter → URL plumbing, the filters toggle,
 * and the bulk-select → gift wiring.
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

// Capture the props the gift dialog is rendered with (bulk recipients).
const giftDialogProps: { current: Record<string, unknown> | null } = { current: null };
vi.mock('../gift/PlayerGiftDialog', () => ({
  PlayerGiftDialog: (props: Record<string, unknown>) => {
    giftDialogProps.current = props;
    return props.open ? <div data-testid="gift-dialog-open" /> : null;
  },
}));

import { PlayerManager } from '../PlayerManager';

const ok = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

const EMPTY_RESPONSE = { players: [], total: 0 };

const PLAYERS_RESPONSE = {
  players: [
    { id: 'p1', username: 'alice', display_name: 'Alice', avatar_emoji: '🦊', avatar_color: '#fff', total_games: 10, total_score: 5000, ranked_mmr: 1200, casual_games: 8, ranked_games: 2, last_game_at: '2026-06-01T00:00:00Z', created_at: '2026-05-01T00:00:00Z', blast_access: false },
    { id: 'p2', username: 'bob', display_name: 'Bob', avatar_emoji: '🐻', avatar_color: '#000', total_games: 3, total_score: 900, ranked_mmr: 1000, casual_games: 3, ranked_games: 0, last_game_at: '2026-06-02T00:00:00Z', created_at: '2026-05-02T00:00:00Z', blast_access: false },
  ],
  total: 2,
};

function lastUrl() {
  const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
  return (calls[calls.length - 1]?.[0] ?? '') as string;
}

/** Reveal the advanced filter grid (collapsed by default). */
function openFilters() {
  fireEvent.click(screen.getByRole('button', { name: /filters/i }));
}

describe('PlayerManager advanced filters (collapsible)', () => {
  beforeEach(() => {
    giftDialogProps.current = null;
    global.fetch = vi.fn().mockResolvedValue(ok(EMPTY_RESPONSE)) as unknown as typeof fetch;
  });
  afterEach(() => vi.restoreAllMocks());

  it('hides the advanced filter bar until the Filters toggle is clicked', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(screen.queryByTestId('player-filter-bar')).not.toBeInTheDocument();
    openFilters();
    expect(screen.getByTestId('player-filter-bar')).toBeInTheDocument();
  });

  it('appends country=IL when the country input is filled', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    openFilters();

    fireEvent.change(screen.getByPlaceholderText('IL, US, …'), { target: { value: 'il' } });
    await waitFor(() => expect(lastUrl()).toContain('country=IL'), { timeout: 1500 });
  });

  it('appends hasBlast=true when the Blast checkbox is ticked', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    openFilters();

    fireEvent.click(screen.getByLabelText(/Has Blast access/i));
    await waitFor(() => expect(lastUrl()).toContain('hasBlast=true'), { timeout: 1500 });
  });

  it('appends daysSinceActive=N when the inactive-days input is filled', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    openFilters();

    fireEvent.change(screen.getByPlaceholderText('e.g. 14'), { target: { value: '21' } });
    await waitFor(() => expect(lastUrl()).toContain('daysSinceActive=21'), { timeout: 1500 });
  });
});

describe('PlayerManager bulk-gift selection', () => {
  beforeEach(() => {
    giftDialogProps.current = null;
    global.fetch = vi.fn().mockResolvedValue(ok(PLAYERS_RESPONSE)) as unknown as typeof fetch;
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows a bulk gift bar only after at least one player is selected', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: /gift \d+ selected/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select Alice'));
    expect(screen.getByRole('button', { name: /gift 1 selected/i })).toBeInTheDocument();
  });

  it('select-all selects every player on the page', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText(/select all/i));
    expect(screen.getByRole('button', { name: /gift 2 selected/i })).toBeInTheDocument();
  });

  it('opens the gift dialog with the selected players as initialRecipients', async () => {
    render(<PlayerManager authToken="tok" />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Select Alice'));
    fireEvent.click(screen.getByLabelText('Select Bob'));
    fireEvent.click(screen.getByRole('button', { name: /gift 2 selected/i }));

    expect(screen.getByTestId('gift-dialog-open')).toBeInTheDocument();
    const recipients = giftDialogProps.current?.initialRecipients as Array<{ id: string }>;
    expect(recipients.map((r) => r.id).sort()).toEqual(['p1', 'p2']);
  });
});
