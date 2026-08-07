import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DailyAnswerKey from '../DailyAnswerKey';
import type { ConnectionPuzzle } from '@/lib/connections/types';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => (p: Record<string, unknown>) => {
    const { children, ...rest } = p as { children?: React.ReactNode };
    const clean = Object.fromEntries(
      Object.entries(rest).filter(([k]) => !['initial', 'animate', 'transition', 'exit'].includes(k)),
    );
    return <div {...clean}>{children}</div>;
  } }),
}));

const p = (id: string, w1: string, bridge: string, w2: string): ConnectionPuzzle => ({
  id, word1: w1, word2: w2, bridge, difficulty: 'easy',
});

const SET = [p('a', 'GRAPE', 'VINE', 'YARD'), p('b', 'HAND', 'BOOK', 'CASE')];

describe('DailyAnswerKey', () => {
  it('given a set, lists every bridge so a losing player still learns the answers', () => {
    render(<DailyAnswerKey puzzles={SET} solvedIndices={new Set()} title="Answers" />);
    expect(screen.getAllByTestId('answer-key-row')).toHaveLength(2);
    expect(screen.getByText('VINE')).toBeInTheDocument();
    expect(screen.getByText('BOOK')).toBeInTheDocument();
  });

  it('given a solved index, marks that row solved and the rest unsolved', () => {
    render(<DailyAnswerKey puzzles={SET} solvedIndices={new Set([0])} title="Answers" />);
    const rows = screen.getAllByTestId('answer-key-row');
    expect(rows[0]).toHaveAttribute('data-solved', 'true');
    expect(rows[1]).toHaveAttribute('data-solved', 'false');
  });

  it('given no puzzles, renders nothing', () => {
    const { container } = render(<DailyAnswerKey puzzles={[]} solvedIndices={new Set()} title="Answers" />);
    expect(container.firstChild).toBeNull();
  });

  it('given RTL, sets dir on the section', () => {
    render(<DailyAnswerKey puzzles={SET} solvedIndices={new Set()} title="תשובות" isRTL />);
    expect(screen.getByTestId('daily-answer-key')).toHaveAttribute('dir', 'rtl');
  });
});
