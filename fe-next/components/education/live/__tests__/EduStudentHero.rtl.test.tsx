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

  it('Given a placing and points, When shown side by side, Then a divider keeps "of 26" and "37" from reading as one number', () => {
    render(<EduStudentHero {...base} />);
    expect(screen.getByTestId('edu-student-rank-divider')).toBeInTheDocument();
  });
});
