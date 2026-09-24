import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { __resetRevealSessionForTests, buildUnlockReveal, markRevealShown } from '@/lib/avatar/revealTrigger';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, a?: unknown, b?: unknown) => {
      const p = (a && typeof a === 'object' ? a : b) as Record<string, unknown> | undefined;
      return p ? `${key}:${JSON.stringify(p)}` : key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

const opened = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => (props: Record<string, unknown>) => {
    opened.props = props;
    return <div data-testid="connected-reveal" />;
  },
}));

import PostGameUnlocks from '../PostGameUnlocks';

beforeEach(() => {
  __resetRevealSessionForTests();
  opened.props = null;
});

describe('PostGameUnlocks', () => {
  it('renders nothing without a level', () => {
    const { container } = render(<PostGameUnlocks levelUp={null} level={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the next-unlock hint near XP', () => {
    render(<PostGameUnlocks levelUp={null} level={3} />);
    expect(screen.getByTestId('post-game-next-unlock')).toHaveTextContent('revealUnlock.nextHint:{"level":4}');
    expect(screen.queryByTestId('post-game-unlock-chip')).not.toBeInTheDocument();
  });

  it('no hint past the top of the ladder', () => {
    const { container } = render(<PostGameUnlocks levelUp={null} level={45} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a "New unlock!" chip that re-opens the reveal as a replay', () => {
    render(<PostGameUnlocks levelUp={{ oldLevel: 1, newLevel: 2 }} level={2} />);
    const chip = screen.getByTestId('post-game-unlock-chip');
    expect(chip).toHaveTextContent('revealUnlock.chip');
    expect(screen.queryByTestId('connected-reveal')).not.toBeInTheDocument();
    fireEvent.click(chip);
    expect(screen.getByTestId('connected-reveal')).toBeInTheDocument();
    expect(opened.props?.replay).toBe(true);
  });

  it('counts several unlocks', () => {
    render(<PostGameUnlocks levelUp={{ oldLevel: 4, newLevel: 6 }} level={6} />);
    expect(screen.getByTestId('post-game-unlock-chip')).toHaveTextContent('revealUnlock.chipMany:{"count":3}');
  });

  it('keeps the chip after the auto reveal already played (session memory)', () => {
    markRevealShown(buildUnlockReveal({ oldLevel: 1, newLevel: 2 })!);
    render(<PostGameUnlocks levelUp={{ oldLevel: 1, newLevel: 2 }} level={2} />);
    expect(screen.getByTestId('post-game-unlock-chip')).toBeInTheDocument();
  });

  it('no chip when the level-up crossed no rung', () => {
    render(<PostGameUnlocks levelUp={{ oldLevel: 10, newLevel: 11 }} level={11} />);
    expect(screen.queryByTestId('post-game-unlock-chip')).not.toBeInTheDocument();
    expect(screen.getByTestId('post-game-next-unlock')).toBeInTheDocument();
  });
});
