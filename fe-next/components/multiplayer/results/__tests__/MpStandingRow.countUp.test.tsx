import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MpStandingRowItem } from '../MpStandingRow';
import type { MpStandingRow } from '../mpStandings';

vi.mock('@/components/ui/AnimatedCounter', () => ({
  default: ({ value, previousValue }: { value: number; previousValue?: number }) => <span data-from={previousValue}>{value}</span>,
}));
vi.mock('@/components/Avatar', () => ({ default: () => null }));
vi.mock('../MpGuestAddChip', () => ({ MpRowFriendAction: () => null }));

const t = (k: string) => k;
const row = { username: 'Ana', score: 140, rank: 1, isMe: false, isBot: true } as unknown as MpStandingRow;

describe('MpStandingRow score', () => {
  it('rolls the score up from 0 as the row lands in the reveal', () => {
    render(<ul><MpStandingRowItem row={row} shown layout="fit" t={t} /></ul>);
    const score = screen.getByTestId('mp-standing-score');
    expect(score.textContent).toBe('140');
    expect(score.querySelector('[data-from="0"]')).not.toBeNull();
  });

  it('shows the plain number in the full list (no replay on open)', () => {
    render(<ul><MpStandingRowItem row={row} shown layout="list" t={t} /></ul>);
    const score = screen.getByTestId('mp-standing-score');
    expect(score.textContent).toBe('140');
    expect(score.querySelector('[data-from]')).toBeNull();
  });
});
