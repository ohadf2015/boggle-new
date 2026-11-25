// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { stableT } = vi.hoisted(() => {
  const translations: Record<string, string> = {
    'teacher.reports.progressMatrix.incompleteTitle': "Who hasn't finished",
    'teacher.reports.progressMatrix.incompleteStarted': 'Started',
    'teacher.reports.progressMatrix.incompleteNotStarted': 'Not started',
    'teacher.reports.progressMatrix.incompleteAllDone': 'Everyone finished — nice work.',
    'teacher.reports.progressMatrix.nudge': 'Nudge',
    'teacher.reports.progressMatrix.nudgeSending': 'Sending…',
    'teacher.reports.progressMatrix.nudgeSent': 'Nudged',
    'teacher.reports.progressMatrix.nudgeAlready': 'Already nudged',
    'teacher.reports.progressMatrix.nudgeCompleted': 'Finished',
    'teacher.reports.progressMatrix.nudgeFailed': 'Failed — tap to retry',
  };
  function stableT(key: string, params?: Record<string, string | number>) {
    let value = translations[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) value = value.replace(`{{${k}}}`, String(v));
    }
    return value;
  }
  return { stableT };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: stableT, language: 'en', dir: 'ltr' }),
}));

const fetchWithAuthMock = vi.hoisted(() => vi.fn());
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: unknown[]) => fetchWithAuthMock(...args),
}));

import { IncompleteAssignmentsPanel } from '../IncompleteAssignmentsPanel';
import type { AssignmentProgressMatrix } from '@/lib/education/assignmentProgressMatrix';

const matrix: AssignmentProgressMatrix = {
  assignments: [
    { id: 'a1', title: 'Week 1 nouns', dueDate: '2026-10-06' },
    { id: 'a2', title: 'Week 2 verbs', dueDate: '2026-10-13' },
  ],
  rows: [
    {
      studentId: 's1',
      studentName: 'Ada',
      cells: [
        { completed: true, started: true, correctness: 75 },
        { completed: false, started: true, correctness: null },
      ],
      trend: 'none',
    },
    {
      studentId: 's2',
      studentName: 'Ben',
      cells: [
        { completed: false, started: false, correctness: null },
        { completed: false, started: false, correctness: null },
      ],
      trend: 'none',
    },
  ],
};

function mockNudge(result: string, ok = true) {
  fetchWithAuthMock.mockResolvedValue({
    ok,
    status: 200,
    json: async () => ({ ok: true, result }),
  });
}

describe('IncompleteAssignmentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNudge('sent');
  });

  it('lists the students who have not finished each assignment, with their started state', () => {
    render(<IncompleteAssignmentsPanel classroomId="c1" matrix={matrix} />);
    expect(screen.getByTestId('incomplete-assignments')).toBeInTheDocument();

    const week1 = screen.getByTestId('incomplete-assignment-a1');
    expect(week1).toHaveTextContent('Ben');
    expect(week1).not.toHaveTextContent('Ada');
    expect(screen.getByTestId('incomplete-status-a1-s2')).toHaveTextContent('Not started');

    const week2 = screen.getByTestId('incomplete-assignment-a2');
    expect(week2).toHaveTextContent('Ada');
    expect(week2).toHaveTextContent('Ben');
    expect(screen.getByTestId('incomplete-status-a2-s1')).toHaveTextContent('Started');
  });

  it('one tap nudges the student and the button confirms', async () => {
    render(<IncompleteAssignmentsPanel classroomId="c1" matrix={matrix} />);
    const button = screen.getByTestId('nudge-a1-s2');
    await userEvent.click(button);

    await waitFor(() => expect(screen.getByTestId('nudge-a1-s2')).toHaveTextContent('Nudged'));
    expect(fetchWithAuthMock).toHaveBeenCalledWith(
      '/api/education/classroom/c1/nudge',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ assignmentId: 'a1', studentId: 's2' }),
      }),
    );
  });

  it('shows the already-nudged state when the server throttles the tap', async () => {
    mockNudge('already_nudged');
    render(<IncompleteAssignmentsPanel classroomId="c1" matrix={matrix} />);
    await userEvent.click(screen.getByTestId('nudge-a2-s1'));
    await waitFor(() => expect(screen.getByTestId('nudge-a2-s1')).toHaveTextContent('Already nudged'));
  });

  it('a failed nudge can be retried', async () => {
    fetchWithAuthMock.mockRejectedValueOnce(new Error('network'));
    render(<IncompleteAssignmentsPanel classroomId="c1" matrix={matrix} />);
    const button = screen.getByTestId('nudge-a1-s2');
    await userEvent.click(button);
    await waitFor(() => expect(screen.getByTestId('nudge-a1-s2')).toHaveTextContent('Failed — tap to retry'));

    mockNudge('sent');
    await userEvent.click(screen.getByTestId('nudge-a1-s2'));
    await waitFor(() => expect(screen.getByTestId('nudge-a1-s2')).toHaveTextContent('Nudged'));
  });

  it('says so when everyone finished', () => {
    const done: AssignmentProgressMatrix = {
      assignments: [{ id: 'a1', title: 'Week 1', dueDate: null }],
      rows: [
        {
          studentId: 's1',
          studentName: 'Ada',
          cells: [{ completed: true, started: true, correctness: 90 }],
          trend: 'none',
        },
      ],
    };
    render(<IncompleteAssignmentsPanel classroomId="c1" matrix={done} />);
    expect(screen.getByTestId('incomplete-all-done')).toHaveTextContent('Everyone finished — nice work.');
  });
});
