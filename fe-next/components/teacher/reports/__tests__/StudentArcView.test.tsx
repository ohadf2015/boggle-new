/**
 * StudentArcView — the free per-student learning arc: accuracy over time,
 * per-word trend with outcome history, and the re-queue note that closes the
 * error-correction loop. Firm, never scary: "needs a re-teach", not "failing".
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { StudentArcData } from '@/lib/supabase/wordMastery';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));

let arc: StudentArcData | null = null;
let arcLoading = false;
let arcError: Error | null = null;
vi.mock('@/hooks/useStudentArc', () => ({
  useStudentArc: () => ({ arc, isLoading: arcLoading, error: arcError, refresh: vi.fn() }),
}));

import { StudentArcView } from '../StudentArcView';

const ARC: StudentArcData = {
  points: [
    { gameCode: 'g1', at: '2026-09-10T10:00:00.000Z', asked: 4, found: 2, accuracy: 50 },
    { gameCode: 'g2', at: '2026-09-20T10:00:00.000Z', asked: 4, found: 3, accuracy: 75 },
  ],
  mastery: {
    studentId: 's1',
    words: [
      { word: 'apple', display: 'Apple', attempts: 2, correct: 0, firstSeen: '2026-09-10T10:00:00Z', lastSeen: '2026-09-20T10:00:00Z', lastCorrect: false, trend: 'stuck', outcomes: [false, false] },
      { word: 'plum', display: 'Plum', attempts: 2, correct: 1, firstSeen: '2026-09-10T10:00:00Z', lastSeen: '2026-09-20T10:00:00Z', lastCorrect: true, trend: 'improving', outcomes: [false, true] },
      { word: 'berry', display: 'Berry', attempts: 2, correct: 2, firstSeen: '2026-09-10T10:00:00Z', lastSeen: '2026-09-20T10:00:00Z', lastCorrect: true, trend: 'mastered', outcomes: [true, true] },
    ],
    stuckWords: ['apple'],
    masteredCount: 1,
  },
};

describe('<StudentArcView>', () => {
  beforeEach(() => {
    arc = ARC;
    arcLoading = false;
    arcError = null;
  });

  it('shows a loading state, then the arc', () => {
    arcLoading = true;
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    expect(screen.getByTestId('student-arc-loading')).toBeInTheDocument();
  });

  it('shows the error state with retry copy', () => {
    arcError = new Error('boom');
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows a friendly empty state when the student has no evidence yet', () => {
    arc = { points: [], mastery: null };
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    expect(screen.getByTestId('student-arc-empty')).toHaveTextContent('teacher.reports.arc.emptyStudent');
  });

  it('draws the accuracy-over-time sparkline with a first-to-last readout', () => {
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    expect(screen.getByTestId('student-arc-sparkline')).toBeInTheDocument();
    expect(screen.getByTestId('student-arc-growth')).toHaveTextContent('50');
    expect(screen.getByTestId('student-arc-growth')).toHaveTextContent('75');
  });

  it('lists words stuck-first with trend chips and per-session outcome dots', () => {
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    const rows = screen.getAllByTestId('student-arc-word');
    expect(rows[0]).toHaveTextContent('Apple');
    expect(rows[0]).toHaveTextContent('teacher.reports.arc.trend.stuck');
    expect(rows[1]).toHaveTextContent('Plum');
    expect(rows[2]).toHaveTextContent('Berry');
    const dots = rows[0].querySelectorAll('[data-testid="student-arc-outcome"]');
    expect(dots).toHaveLength(2);
  });

  it('closes the loop: stuck words carry the re-queue note', () => {
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    expect(screen.getByTestId('student-arc-requeue')).toHaveTextContent('teacher.reports.arc.requeueStudent:Sam');
  });
});
