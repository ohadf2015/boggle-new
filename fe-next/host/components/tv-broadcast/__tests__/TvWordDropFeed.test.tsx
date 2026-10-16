import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('framer-motion', () => ({
  m: { li: ({ children, layout: _l, initial: _i, animate: _a, transition: _t, ...rest }: any) => <li {...rest}>{children}</li> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => true,
}));

import { TvWordDropFeed, FEED_ROWS, type WordDrop } from '../TvWordDropFeed';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const drop = (id: number, username: string, length: number, comboLevel = 0): WordDrop => ({ id, username, length, comboLevel });

describe('TvWordDropFeed', () => {
  it('Given no words yet, Then it invites the first word instead of showing blank blocks', () => {
    render(<TvWordDropFeed drops={[]} totalWords={0} avgLength="0.0" longest={0} t={t} />);
    expect(screen.getByTestId('word-drop-empty')).toHaveTextContent('tvBroadcast.wordDropEmpty');
  });

  it('Given a found word, Then it shows who found it and one blank tile per letter', () => {
    render(<TvWordDropFeed drops={[drop(1, 'Maya', 6)]} totalWords={1} avgLength="6.0" longest={6} t={t} />);
    const row = screen.getByTestId('word-drop');
    expect(row).toHaveTextContent('Maya');
    expect(row.querySelectorAll('[data-testid="word-drop-tile"]')).toHaveLength(6);
    row.querySelectorAll('[data-testid="word-drop-tile"]').forEach((tile) => expect(tile.textContent).toBe(''));
  });

  it('Given more drops than fit, Then the newest stay on the wall, newest first', () => {
    const drops = Array.from({ length: FEED_ROWS + 3 }, (_, i) => drop(i + 1, `p${i + 1}`, 4));
    render(<TvWordDropFeed drops={drops} totalWords={drops.length} avgLength="4.0" longest={4} t={t} />);
    const rows = screen.getAllByTestId('word-drop');
    expect(rows).toHaveLength(FEED_ROWS);
    expect(rows[0]).toHaveTextContent(`p${FEED_ROWS + 3}`);
  });

  it('Given a combo, Then the row carries the combo chip', () => {
    render(<TvWordDropFeed drops={[drop(1, 'Leo', 5, 3)]} totalWords={1} avgLength="5.0" longest={5} t={t} />);
    expect(screen.getByTestId('word-drop-combo')).toHaveTextContent('3');
  });

  it('shows the round totals large enough for the back row', () => {
    render(<TvWordDropFeed drops={[drop(1, 'Leo', 7)]} totalWords={12} avgLength="5.3" longest={7} t={t} />);
    expect(screen.getByTestId('word-drop-stat-total')).toHaveTextContent('12');
    expect(screen.getByTestId('word-drop-stat-longest')).toHaveTextContent('7');
    expect(screen.getByTestId('word-drop-stat-avg')).toHaveTextContent('5.3');
  });
});
