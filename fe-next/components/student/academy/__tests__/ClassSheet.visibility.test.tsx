import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, f?: string) => (typeof f === 'string' ? k : k), language: 'en', dir: 'ltr' }),
}));
vi.mock('framer-motion', async (orig) => ({ ...(await orig<typeof import('framer-motion')>()) }));

const getVisibility = vi.fn();
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomLeaderboardVisibility: (id: string) => getVisibility(id),
}));
const leaderboardProps = vi.fn();
vi.mock('@/components/education/ClassroomLeaderboard', () => ({
  default: (p: { visibility?: string }) => {
    leaderboardProps(p);
    return <div data-testid="leaderboard" data-visibility={p.visibility} />;
  },
}));
vi.mock('../ClassStrip', () => ({ ClassStrip: () => null }));
vi.mock('@/components/student/StudentAssignmentPlayCta', () => ({ StudentAssignmentPlayCta: () => null }));

import { LazyMotion, domAnimation } from 'framer-motion';
import { ClassSheet } from '../ClassSheet';

const renderSheet = () =>
  render(
    <LazyMotion features={domAnimation}>
      <ClassSheet classroomId="c1" userId="u1" onClose={vi.fn()} reducedMotion />
    </LazyMotion>,
  );

describe('ClassSheet honours the teacher leaderboard setting', () => {
  beforeEach(() => {
    getVisibility.mockReset();
    leaderboardProps.mockReset();
  });

  it('never flashes the full table before the setting loads', () => {
    getVisibility.mockReturnValue(new Promise(() => undefined));
    renderSheet();
    expect(screen.getByTestId('class-sheet-standings-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard')).toBeNull();
  });

  it.each(['top3', 'full', 'personal_only'])('passes %s through to the standings', async (v) => {
    getVisibility.mockResolvedValue(v);
    renderSheet();
    await waitFor(() => expect(screen.getByTestId('leaderboard')).toHaveAttribute('data-visibility', v));
  });

  it('shows a kind note instead of standings when the teacher turned them off', async () => {
    getVisibility.mockResolvedValue('hidden');
    renderSheet();
    await waitFor(() => expect(screen.getByTestId('class-sheet-standings-off')).toHaveTextContent('student.dashboard.leaderboardOff'));
    expect(screen.queryByTestId('leaderboard')).toBeNull();
  });
});
