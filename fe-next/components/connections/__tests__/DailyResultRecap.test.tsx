import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DailyResultRecap from '../DailyResultRecap';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';

const outcomes: BridgeOutcome[] = [
  { reached: true, solved: true, wrongAttempts: 0, hintUsed: false },
  { reached: true, solved: true, wrongAttempts: 2, hintUsed: false },
  { reached: true, solved: true, wrongAttempts: 0, hintUsed: true },
  { reached: true, solved: false, wrongAttempts: 3, hintUsed: false },
  { reached: false, solved: false, wrongAttempts: 0, hintUsed: false },
];

describe('DailyResultRecap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T21:15:30.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders one square per bridge with the share-grid emoji', () => {
    render(<DailyResultRecap outcomes={outcomes} nextLabel="Next bridge in" />);
    const cells = screen.getAllByTestId('recap-square');
    expect(cells).toHaveLength(5);
    expect(cells.map((c) => c.textContent)).toEqual(['🟩', '🟨', '💡', '🟥', '⬛']);
  });

  it('shows an hh:mm countdown to the next UTC day', () => {
    render(<DailyResultRecap outcomes={outcomes} nextLabel="Next bridge in" />);
    expect(screen.getByText(/02:44/)).toBeInTheDocument();
    expect(screen.getByText(/Next bridge in/)).toBeInTheDocument();
  });
});
