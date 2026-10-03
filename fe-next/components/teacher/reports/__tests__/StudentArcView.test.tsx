/**
 * StudentArcView — the free per-student learning arc: accuracy over time,
 * per-word trend with outcome history, and the re-queue note that closes the
 * error-correction loop. Firm, never scary: "needs a re-teach", not "failing".
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { StudentArcData } from '@/lib/supabase/wordMastery';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));

let hasPro = true;
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro, isLoading: false }),
}));

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: unknown[]) => fetchWithAuth(...args),
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
    hasPro = true;
    fetchWithAuth.mockReset();
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

  it('draws an accuracy chart with a y axis, an 80% goal line and one dated point per session', () => {
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    const chart = screen.getByTestId('student-arc-chart');
    expect(chart).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('student-arc-goal')).toHaveTextContent('eg2Polish.arc.goal:80');
    expect(screen.getAllByTestId('student-arc-y-tick').map((n) => n.textContent)).toEqual(['100%', '50%', '0%']);
    const points = screen.getAllByTestId('student-arc-point');
    expect(points).toHaveLength(2);
    expect(points[0]).toHaveTextContent('50%');
    expect(points[1]).toHaveTextContent('75%');
    const dates = screen.getAllByTestId('student-arc-date').map((n) => n.textContent);
    expect(dates).toEqual([
      new Date('2026-09-10T10:00:00.000Z').toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      new Date('2026-09-20T10:00:00.000Z').toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    ]);
  });

  it('keeps the first-to-last readout', () => {
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
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

  it('gives every outcome dot a state title and the dot group an accessible label', () => {
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    const rows = screen.getAllByTestId('student-arc-word');
    const stuckDots = rows[0].querySelectorAll('[data-testid="student-arc-outcome"]');
    expect(stuckDots[0]).toHaveAttribute('title', 'teacher.reports.arc.outcomeMissed');
    const improvingDots = rows[1].querySelectorAll('[data-testid="student-arc-outcome"]');
    expect(improvingDots[1]).toHaveAttribute('title', 'teacher.reports.arc.outcomeCorrect');
    const group = rows[0].querySelector('[role="img"]');
    expect(group).toHaveAttribute('aria-label', 'teacher.reports.arc.attempts:2');
  });

  it('gives every word row its attempts, last result and last date', () => {
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    const rows = screen.getAllByTestId('student-arc-word');
    expect(rows[0]).toHaveTextContent('eg2Polish.arc.word.attempts:2,0');
    expect(rows[0]).toHaveTextContent('eg2Polish.arc.word.lastMissed');
    expect(rows[1]).toHaveTextContent('eg2Polish.arc.word.lastCorrect');
    const day = new Date('2026-09-20T10:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric' });
    expect(rows[0]).toHaveTextContent(day);
  });

  it('offers "practice these N words for <student>" and assigns the not-yet-mastered words', async () => {
    fetchWithAuth.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, words: ['Apple', 'Plum'], rounds: [{ dueDate: '2026-09-21' }, { dueDate: '2026-09-23' }, { dueDate: '2026-09-27' }] }),
    });
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    const cta = screen.getByTestId('student-practice-cta');
    expect(cta).toHaveTextContent('eg2Polish.arc.practice.cta:2,Sam');
    fireEvent.click(cta);
    await waitFor(() => expect(screen.getByTestId('student-practice-done')).toBeInTheDocument());
    const [url, init] = fetchWithAuth.mock.calls[0];
    expect(url).toBe('/api/education/classroom/c1/missed-practice');
    const body = JSON.parse(init.body);
    expect(body.words).toEqual(['Apple', 'Plum']);
    expect(body.names).toHaveLength(3);
    expect(body.names[0]).toContain('Sam');
  });

  it('says plainly when the words are not in the class review pool', async () => {
    fetchWithAuth.mockResolvedValue({ ok: false, status: 422, json: async () => ({ ok: false, error: 'no_missed_words' }) });
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    fireEvent.click(screen.getByTestId('student-practice-cta'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('eg2Polish.arc.practice.nothing'));
  });

  it('free teachers see the practice action as a Pro upgrade link, not a dead button', () => {
    hasPro = false;
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    expect(screen.queryByTestId('student-practice-cta')).toBeNull();
    expect(screen.getByTestId('student-practice-locked')).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('hides the practice action when every word is mastered', () => {
    arc = { ...ARC, mastery: { ...ARC.mastery!, words: [ARC.mastery!.words[2]], stuckWords: [] } };
    render(<StudentArcView studentId="s1" classroomId="c1" studentName="Sam" />);
    expect(screen.queryByTestId('student-practice-cta')).toBeNull();
  });
});
