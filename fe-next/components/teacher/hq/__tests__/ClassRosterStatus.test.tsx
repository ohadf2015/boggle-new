import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { buildClassMastery } from '@/lib/education/wordMasteryTrend';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

const getClassroomStudents = vi.fn();
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: (...a: unknown[]) => getClassroomStudents(...a),
}));
let hasPro = true;
let accessTrialExpires: string | null = null;
let loading = false;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro, loading, accessTrialExpires }) }));

const getClassMastery = vi.fn();
vi.mock('@/lib/supabase/wordMastery', () => ({
  getClassMastery: (...a: unknown[]) => getClassMastery(...a),
}));

import { ClassRosterStatus } from '../ClassRosterStatus';

const student = (id: string, name: string) => ({ student_id: id, profiles: { display_name: name, username: null } });
const session = (studentId: string, asked: string[], found: string[]) => ({
  studentId,
  startedAt: '2026-09-01T10:00:00Z',
  results: { gameCode: 'G', lessonWordsAsked: asked, lessonWordsFound: found },
});

describe('<ClassRosterStatus>', () => {
  beforeEach(() => {
    hasPro = true;
    accessTrialExpires = null;
    loading = false;
    getClassroomStudents.mockResolvedValue({
      data: [student('a', 'Ana'), student('b', 'Ben'), student('c', 'Cleo')],
      error: null,
    });
    getClassMastery.mockResolvedValue({
      data: buildClassMastery([
        session('a', ['x', 'y', 'z', 'w', 'v'], ['x']),
        session('b', ['x', 'y', 'z', 'w', 'v'], ['x', 'y', 'z', 'w', 'v']),
      ]),
      error: null,
    });
  });

  it('lists every student with a status: below goal first, then not played yet, then on track', async () => {
    render(<ClassRosterStatus classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('roster-status-row')).toHaveLength(3));
    const rows = screen.getAllByTestId('roster-status-row');
    expect(rows[0]).toHaveTextContent('Ana');
    expect(rows[0]).toHaveTextContent('eg2Polish.classes.status.below:20');
    expect(rows[1]).toHaveTextContent('Cleo');
    expect(rows[1]).toHaveTextContent('eg2Polish.classes.status.notYet');
    expect(rows[2]).toHaveTextContent('Ben');
    expect(rows[2]).toHaveTextContent('eg2Polish.classes.status.onTrack:100');
  });

  it('Given nobody has played yet, Then it lists the students without repeating the same status pill', async () => {
    getClassMastery.mockResolvedValue({ data: buildClassMastery([]), error: null });
    render(<ClassRosterStatus classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('roster-status-row')).toHaveLength(3));
    expect(screen.getByTestId('roster-status')).not.toHaveTextContent('eg2Polish.classes.status.notYet');
  });

  it('links each student to their learning arc and the class to its report', async () => {
    render(<ClassRosterStatus classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('roster-status-row')).toHaveLength(3));
    expect(screen.getAllByTestId('roster-status-row')[0]).toHaveAttribute('href', '/en/teacher/reports?classroomId=c1&studentId=a');
    expect(screen.getByTestId('roster-status-report')).toHaveAttribute('href', '/en/teacher/reports?classroomId=c1');
  });

  it('renders nothing for an empty class (the invite code above is the next step)', async () => {
    getClassroomStudents.mockResolvedValue({ data: [], error: null });
    const { container } = render(<ClassRosterStatus classroomId="c1" />);
    await waitFor(() => expect(getClassroomStudents).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="roster-status-row"]')).toBeNull();
  });

  it('caps the list and says how many more are in the report', async () => {
    getClassroomStudents.mockResolvedValue({
      data: Array.from({ length: 9 }, (_, i) => student(`s${i}`, `Kid ${i}`)),
      error: null,
    });
    render(<ClassRosterStatus classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('roster-status-row')).toHaveLength(6));
    expect(screen.getByTestId('roster-status-report')).toHaveTextContent('eg2Polish.classes.moreInReport:3');
  });

  it('free teachers see who has played, not the Pro below-goal judgement or accuracy', async () => {
    hasPro = false;
    render(<ClassRosterStatus classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('roster-status-row')).toHaveLength(3));
    const text = screen.getAllByTestId('roster-status-row').map((r) => r.textContent).join(' ');
    expect(text).toContain('eg2Polish.classes.status.played');
    expect(text).toContain('eg2Polish.classes.status.notYet');
    expect(text).not.toMatch(/below|onTrack|%/);
  });

  it('free teachers get no student links into the Pro-only reports, and a Pro-labeled way in', async () => {
    hasPro = false;
    render(<ClassRosterStatus classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('roster-status-row')).toHaveLength(3));
    for (const row of screen.getAllByTestId('roster-status-row')) expect(row.closest('a')).toBeNull();
    const report = screen.getByTestId('roster-status-report');
    expect(report).toHaveAttribute('href', '/en/teacher/reports?classroomId=c1');
    expect(report).toHaveTextContent('teacher.subscription.proPlanName');
  });

  it('a teacher on a live access trial keeps the student links, with no Pro label', async () => {
    hasPro = false;
    accessTrialExpires = new Date(Date.now() + 5 * 86400000).toISOString();
    render(<ClassRosterStatus classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('roster-status-row')).toHaveLength(3));
    const hrefs = screen.getAllByTestId('roster-status-row').map((r) => r.getAttribute('href'));
    expect(hrefs).toContain('/en/teacher/reports?classroomId=c1&studentId=a');
    expect(hrefs.every(Boolean)).toBe(true);
    expect(screen.getByTestId('roster-status-report')).not.toHaveTextContent('teacher.subscription.proPlanName');
  });

  it('links nothing while the plan is still resolving', async () => {
    loading = true;
    render(<ClassRosterStatus classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('roster-status-row')).toHaveLength(3));
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('puts the shared avatar before each student name', async () => {
    render(<ClassRosterStatus classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('roster-status-row')).toHaveLength(3));
    const rows = screen.getAllByTestId('roster-status-row');
    expect(rows.map((r) => r.querySelector('[data-testid="avatar-lite"]')?.getAttribute('data-user-id'))).toEqual(['a', 'c', 'b']);
  });
});
