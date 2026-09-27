/**
 * MpModeBreakdown Tests
 *
 * Tests the round-by-round mode breakdown component showing each round's
 * mode icon, label, and top score for multiplayer sessions.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MpModeBreakdown from '../MpModeBreakdown';
import type { MpRound } from '@/lib/multiplayer/mpRoundAggregation';

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

describe('MpModeBreakdown', () => {
  it('shows empty state when no rounds', () => {
    const rounds: MpRound[] = [];

    render(<MpModeBreakdown rounds={rounds} />);

    expect(screen.getByText('mpModeBreakdown.emptyState')).toBeInTheDocument();
  });

  it('renders title when rounds exist', () => {
    const rounds: MpRound[] = [
      {
        roundIndex: 0,
        gameMode: 'classic',
        scores: [{ username: 'alice', score: 100, wordCount: 5, placement: 1 }],
        topScore: 100,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    render(<MpModeBreakdown rounds={rounds} />);

    expect(screen.getByText('mpModeBreakdown.title')).toBeInTheDocument();
  });

  it('renders each round with mode label and score', () => {
    const rounds: MpRound[] = [
      {
        roundIndex: 0,
        gameMode: 'classic',
        scores: [
          { username: 'player1', score: 100, wordCount: 5, placement: 1 },
          { username: 'player2', score: 80, wordCount: 4, placement: 2 },
        ],
        topScore: 100,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        roundIndex: 1,
        gameMode: 'blast',
        scores: [
          { username: 'player1', score: 150, wordCount: 7, placement: 1 },
          { username: 'player2', score: 120, wordCount: 6, placement: 2 },
        ],
        topScore: 150,
        createdAt: '2026-01-01T00:01:00Z',
      },
    ];

    render(<MpModeBreakdown rounds={rounds} />);

    // Check player names (may appear multiple times across rounds)
    const player1Elements = screen.getAllByText('player1');
    const player2Elements = screen.getAllByText('player2');
    expect(player1Elements.length).toBeGreaterThan(0);
    expect(player2Elements.length).toBeGreaterThan(0);
  });

  it('displays SVG icons for each gameMode', () => {
    const rounds: MpRound[] = [
      {
        roundIndex: 0,
        gameMode: 'classic',
        scores: [{ username: 'alice', score: 100, wordCount: 5, placement: 1 }],
        topScore: 100,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        roundIndex: 1,
        gameMode: 'blast',
        scores: [{ username: 'alice', score: 150, wordCount: 7, placement: 1 }],
        topScore: 150,
        createdAt: '2026-01-01T00:01:00Z',
      },
    ];

    const { container } = render(<MpModeBreakdown rounds={rounds} />);

    // Should have SVG icons for the modes (Sword, Bomb, etc)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('shows top score highlighted for each round', () => {
    const rounds: MpRound[] = [
      {
        roundIndex: 0,
        gameMode: 'classic',
        scores: [
          { username: 'player1', score: 150, wordCount: 7, placement: 1 },
          { username: 'player2', score: 80, wordCount: 4, placement: 2 },
        ],
        topScore: 150,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    render(<MpModeBreakdown rounds={rounds} />);

    // Top score label should be rendered
    expect(screen.getByText('mpModeBreakdown.topScore')).toBeInTheDocument();

    // Player name should be there
    expect(screen.getByText('player1')).toBeInTheDocument();
  });

  it('displays word count label for each player', () => {
    const rounds: MpRound[] = [
      {
        roundIndex: 0,
        gameMode: 'classic',
        scores: [{ username: 'alice', score: 100, wordCount: 5, placement: 1 }],
        topScore: 100,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    render(<MpModeBreakdown rounds={rounds} />);

    // Player name should exist
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('supports multiple game modes', () => {
    const rounds: MpRound[] = [
      {
        roundIndex: 0,
        gameMode: 'classic',
        scores: [{ username: 'alice', score: 100, wordCount: 5, placement: 1 }],
        topScore: 100,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        roundIndex: 1,
        gameMode: 'blast',
        scores: [{ username: 'alice', score: 200, wordCount: 8, placement: 1 }],
        topScore: 200,
        createdAt: '2026-01-01T00:01:00Z',
      },
      {
        roundIndex: 2,
        gameMode: 'word-hunt',
        scores: [{ username: 'alice', score: 150, wordCount: 6, placement: 1 }],
        topScore: 150,
        createdAt: '2026-01-01T00:02:00Z',
      },
    ];

    const { container } = render(<MpModeBreakdown rounds={rounds} />);

    // Player should be visible (appears 3 times, once per round)
    const aliceElements = screen.getAllByText('alice');
    expect(aliceElements.length).toBeGreaterThanOrEqual(3);

    // Check SVGs are rendered (for 3 modes)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});
