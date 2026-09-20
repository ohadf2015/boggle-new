import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardTeaser } from '../LeaderboardTeaser';
import { LanguageProvider } from '@/contexts/LanguageContext';

/**
 * The hub board summed Word Hunt + Word Wheel only, while the hub showed four
 * cards — Word Tower and Connections were missing from "today's top players".
 * It now reads one server-merged endpoint covering all four, and a row expands
 * to show what the player scored in each mode.
 *
 * Rendered through the REAL LanguageProvider: a mocked identity `t` would let a
 * wrong key path pass while the screen showed the literal key.
 */

const ENTRY = {
  rank: 1,
  name: 'Howard Barkin',
  avatarEmoji: null,
  avatarColor: null,
  avatarImage: null,
  customAvatar: null,
  total: 4266,
  byMode: { 'word-hunt': 942, 'word-wheel': 564, 'word-tower': 1110, connections: 1650 },
  towerHeightM: 222,
  playedModes: ['word-hunt', 'word-wheel', 'word-tower', 'connections'],
};

const ONE_MODE = {
  ...ENTRY,
  rank: 2,
  name: 'Chunky Cookie',
  total: 654,
  byMode: { 'word-hunt': 0, 'word-wheel': 654, 'word-tower': 0, connections: 0 },
  towerHeightM: null,
  playedModes: ['word-wheel'],
};

function mockBoard(entries: unknown[]) {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ data: entries }) }),
  ) as unknown as typeof fetch;
}

const renderBoard = () =>
  render(
    <LanguageProvider initialLanguage="en">
      <LeaderboardTeaser currentLanguage="en" />
    </LanguageProvider>,
  );

describe('LeaderboardTeaser — all four modes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBoard([ENTRY, ONE_MODE]);
  });

  it('reads the combined endpoint, not the two per-mode ones', async () => {
    renderBoard();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const urls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/api/daily/leaderboard'))).toBe(true);
    // The old implementation fanned out to these and summed 2 of 4 client-side.
    expect(urls.some((u) => u.includes('/word-hunt/leaderboard'))).toBe(false);
    expect(urls.some((u) => u.includes('/word-wheel/leaderboard'))).toBe(false);
  });

  it('shows the combined total for a player', async () => {
    renderBoard();
    expect(await screen.findByText('4,266')).toBeInTheDocument();
  });

  it('does not name the modes it covers in the header', async () => {
    // Was a "Word Hunt + Word Wheel" scope line, needed only because the board
    // covered 2 of 4. Covering all four makes it noise.
    renderBoard();
    await screen.findByText('4,266');
    expect(screen.queryByTestId('leaderboard-scope')).not.toBeInTheDocument();
  });

  it('expands a row on click to show the per-mode breakdown', async () => {
    renderBoard();
    const row = await screen.findByTestId('leaderboard-row-1');
    expect(screen.queryByTestId('leaderboard-breakdown-1')).not.toBeInTheDocument();

    await userEvent.click(row);

    const breakdown = await screen.findByTestId('leaderboard-breakdown-1');
    expect(breakdown).toHaveTextContent('942');
    expect(breakdown).toHaveTextContent('564');
    expect(breakdown).toHaveTextContent('1,110');
    expect(breakdown).toHaveTextContent('1,650');
  });

  it('shows the real tower height alongside its points', async () => {
    renderBoard();
    await userEvent.click(await screen.findByTestId('leaderboard-row-1'));
    expect(await screen.findByTestId('leaderboard-breakdown-1')).toHaveTextContent('222');
  });

  it('collapses again on a second click', async () => {
    renderBoard();
    const row = await screen.findByTestId('leaderboard-row-1');
    await userEvent.click(row);
    expect(await screen.findByTestId('leaderboard-breakdown-1')).toBeInTheDocument();
    await userEvent.click(row);
    await waitFor(() =>
      expect(screen.queryByTestId('leaderboard-breakdown-1')).not.toBeInTheDocument(),
    );
  });

  it('marks an unplayed mode rather than printing a bare 0 that reads as a bad score', async () => {
    renderBoard();
    await userEvent.click(await screen.findByTestId('leaderboard-row-2'));
    const breakdown = await screen.findByTestId('leaderboard-breakdown-2');
    expect(breakdown).toHaveTextContent('654');
    // Three unplayed modes render as a dash, not "0".
    expect(breakdown.querySelectorAll('[data-unplayed="true"]')).toHaveLength(3);
  });

  it('is operable by keyboard, since it is now interactive', async () => {
    renderBoard();
    const row = await screen.findByTestId('leaderboard-row-1');
    expect(row.tagName).toBe('BUTTON');
    row.focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByTestId('leaderboard-breakdown-1')).toBeInTheDocument();
  });

  it('resolves its translation keys — no raw key on screen', async () => {
    const { container } = renderBoard();
    await screen.findByText('4,266');
    await userEvent.click(screen.getByTestId('leaderboard-row-1'));
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/daily\.[a-zA-Z]/);
    expect(text).not.toMatch(/[{}]/);
  });
});
