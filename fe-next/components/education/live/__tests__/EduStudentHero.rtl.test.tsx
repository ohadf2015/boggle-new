import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('next/image', () => ({ default: () => <span data-testid="img" /> }));

import { EduStudentHero } from '@/components/education/live/EduStudentHero';

const t = (key: string) => key;
const base = { rank: 4, total: 26, score: 37, bestWord: null, lesson: null, xp: 45, coins: 12, gap: null, reduceMotion: true, t };

describe('EduStudentHero on a right-to-left page', () => {
  it('Given XP and coins earned, When the chips render, Then each "+N" text is isolated so the plus sign is not flipped to the end', () => {
    render(<EduStudentHero {...base} />);
    expect(screen.getByText('mpUi.results.xp').tagName).toBe('BDI');
    expect(screen.getByText('mpUi.results.coins').tagName).toBe('BDI');
  });

  it('Given a placing and points, When shown, Then the points sit on their own line so "of 26" and "37" never read as one number', () => {
    render(<EduStudentHero {...base} />);
    const rank = screen.getByTestId('edu-student-rank');
    expect(rank.parentElement!.className).toMatch(/\bflex-col\b/);
    expect(screen.queryByTestId('edu-student-rank-divider')).toBeNull();
  });
});
