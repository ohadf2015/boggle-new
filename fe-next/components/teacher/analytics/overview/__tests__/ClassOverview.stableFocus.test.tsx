import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassOverview } from '../ClassOverview';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (key: string) => key }),
}));

const hook = vi.hoisted(() => ({ loading: true }));
const metrics = {
  commonMistakes: [],
  dailyActive: [{ day: '2026-11-01', count: 0 }],
  students: [{ id: 'h', status: 'needsHelp', accuracy: 0.3, attempts: 10, xp: 5, lastPractice: '2026-11-01', activeDays: 1 }],
};
vi.mock('../../useProClassAnalytics', () => ({
  useProClassAnalytics: () =>
    hook.loading
      ? { metrics: null, isLoading: true, error: null, refresh: vi.fn() }
      : { metrics, isLoading: false, error: null, refresh: vi.fn() },
}));
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: vi.fn().mockResolvedValue({ data: [], error: null }),
}));
vi.mock('@/components/teacher/pro/ProPoweredChip', () => ({ ProPoweredChip: () => null }));

const mounts = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/components/teacher/reports/ClassFocusWords', () => ({
  ClassFocusWords: () => {
    useEffect(() => {
      mounts.count++;
    }, []);
    return <div data-testid="focus-words" />;
  },
}));

describe('ClassOverview focus words', () => {
  it('keeps the hardest-words panel mounted when the overview finishes loading', () => {
    // Given the overview is still loading
    hook.loading = true;
    mounts.count = 0;
    const { rerender } = render(<ClassOverview classroomId="c1" classroomName="7B" />);
    expect(screen.getByTestId('focus-words')).toBeInTheDocument();

    // When the class metrics arrive
    hook.loading = false;
    rerender(<ClassOverview classroomId="c1" classroomName="7B" />);

    // Then the panel is the same instance (no remount, refetch or height jump)
    expect(screen.getByTestId('overview-attention')).toBeInTheDocument();
    expect(mounts.count).toBe(1);
  });

  it('holds the roster fold row while loading, so it does not push the report tabs down when metrics land', () => {
    hook.loading = true;
    render(<ClassOverview classroomId="c1" classroomName="7B" />);
    expect(screen.getByTestId('overview-roster-fold-pending')).toBeInTheDocument();
  });
});
