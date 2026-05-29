/**
 * BlastMpResults Tests
 *
 * Tests the multiplayer blast-specific results component showing per-player
 * stats (rank, score, words, tiles cleared, best combo) with board-cleared badge.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlastMpResults from '../BlastMpResults';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (params) {
        return key.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? ''));
      }
      return key;
    },
    language: 'en',
    dir: 'ltr' as const,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  // eslint-disable-next-line react/display-name
  const MotionDiv = React.forwardRef(
    ({ children, initial, animate, exit, variants, whileHover, whileTap, transition, ...rest }: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...rest, ref }, children)
  );
  return {
    m: new Proxy({}, {
      get: (_target: Record<string, unknown>, prop: string) => {
        if (prop === 'div') return MotionDiv;
        // eslint-disable-next-line react/display-name
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
          const { initial, animate, exit, variants, whileHover, whileTap, transition, ...rest } = props;
          return React.createElement(prop, { ...rest, ref });
        });
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

describe('BlastMpResults', () => {
  it('renders player ranks and scores sorted by score', () => {
    const results = [
      {
        username: 'player1',
        score: 500,
        wordsFoundCount: 10,
        avatar: { type: 'svg' as const, color: 'lime' },
        tilesCleared: 15,
        bestCombo: 3,
      },
      {
        username: 'player2',
        score: 400,
        wordsFoundCount: 8,
        avatar: { type: 'svg' as const, color: 'pink' },
        tilesCleared: 12,
        bestCombo: 2,
      },
    ];

    render(<BlastMpResults results={results} gameMode="blast" />);

    // Check scores visible (in sorted order)
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();

    // Check usernames
    expect(screen.getByText('player1')).toBeInTheDocument();
    expect(screen.getByText('player2')).toBeInTheDocument();
  });

  it('shows BOARD CLEARED badge when player cleared the board', () => {
    const results = [
      {
        username: 'winner',
        score: 1000,
        wordsFoundCount: 20,
        avatar: { type: 'svg' as const, color: 'lime' },
        tilesCleared: 30,
        bestCombo: 5,
        boardCleared: true,
      },
    ];

    render(<BlastMpResults results={results} gameMode="blast" />);

    // Should show board cleared badge
    expect(screen.getByText('blast.mpResults.boardCleared')).toBeInTheDocument();
  });

  it('renders empty state when no results provided', () => {
    render(<BlastMpResults results={[]} gameMode="blast" />);

    expect(screen.getByText('mpModeBreakdown.emptyState')).toBeInTheDocument();
  });

  it('displays word count, tiles, and combo stats for each player', () => {
    const results = [
      {
        username: 'player1',
        score: 500,
        wordsFoundCount: 10,
        avatar: { type: 'svg' as const, color: 'lime' },
        tilesCleared: 15,
        bestCombo: 5,
      },
    ];

    render(<BlastMpResults results={results} gameMode="blast" />);

    // Common words label should be rendered
    expect(screen.getByText('common.words')).toBeInTheDocument();

    // Best combo should be displayed with x suffix
    expect(screen.getByText('5x')).toBeInTheDocument();

    // Tiles count
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('does not show board cleared badge when not cleared', () => {
    const results = [
      {
        username: 'player1',
        score: 500,
        wordsFoundCount: 10,
        avatar: { type: 'svg' as const, color: 'lime' },
        tilesCleared: 15,
        bestCombo: 3,
        boardCleared: false,
      },
    ];

    render(<BlastMpResults results={results} gameMode="blast" />);

    // Board cleared badge should NOT be visible
    expect(screen.queryByText('blast.mpResults.boardCleared')).not.toBeInTheDocument();
  });
});
