import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RosterSheet } from '../HomeRosterDetail';
import type { RosterRow } from '../rosterModel';

vi.mock('@/components/AvatarLite', () => ({ __esModule: true, default: () => <span data-testid="avatar" /> }));
vi.mock('@/components/education/motion', () => ({
  EDU_MOTION: { spring: {}, fade: {}, dur: 0.1 },
  useReducedMotionSafe: () => true,
}));

const row: RosterRow = {
  id: 's1', name: 'Dana', avatarConfig: null, xp: 10, level: 2, wordsMastered: 3, wordsAttempted: 5,
  accuracy: 60, streak: 5, lastPracticeDate: null, status: 'idle',
};
const t = (k: string) => k;

describe('HomeRosterDetail streak flame', () => {
  it('shows a still tiered flame on the streak row', () => {
    render(<RosterSheet row={row} language="en" nowMs={Date.now()} onClose={() => {}} t={t} />);
    const list = screen.getByTestId('home-roster-activity');
    const flame = list.querySelector('[data-testid="streak-flame"]');
    expect(flame).toHaveAttribute('data-tier', 'flame');
    expect(flame?.querySelector('[data-animated]')).toBeNull();
  });
});
