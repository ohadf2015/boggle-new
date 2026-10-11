import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string | Record<string, string | number>, params?: Record<string, string | number>) => {
      const p = typeof fallback === 'object' ? fallback : params;
      return p ? `${key}:${JSON.stringify(p)}` : key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}));

const reminderShownMock = vi.fn();
const overdueMock = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackEduAssignmentReminderShown: (...args: unknown[]) => reminderShownMock(...args),
  trackEduAssignmentOverdue: (...args: unknown[]) => overdueMock(...args),
}));

import { AssignmentDueCard, dueCardTimeText } from '../AssignmentDueCard';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe('dueCardTimeText', () => {
  const NOW = Date.parse('2026-10-11T12:00:00.000Z');

  it('shows hours for a due-soon assignment more than an hour out', () => {
    const text = dueCardTimeText('due_soon', new Date(NOW + 3 * HOUR_MS).toISOString(), NOW);
    expect(text).toMatchObject({ key: 'student.assignments.dueInHours', params: { hours: 3 } });
  });

  it('shows minutes inside the final hour', () => {
    const text = dueCardTimeText('due_soon', new Date(NOW + 20 * 60_000).toISOString(), NOW);
    expect(text).toMatchObject({ key: 'student.assignments.dueInMinutes', params: { minutes: 20 } });
  });

  it('shows days for an overdue assignment', () => {
    const text = dueCardTimeText('overdue', new Date(NOW - 2 * DAY_MS - 60_000).toISOString(), NOW);
    expect(text).toMatchObject({ key: 'student.assignments.overdueBy', params: { days: 2 } });
  });
});

describe('<AssignmentDueCard>', () => {
  beforeEach(() => {
    reminderShownMock.mockClear();
    overdueMock.mockClear();
  });

  it('due-soon card links to the assignment and fires assignment_reminder_shown once', () => {
    const dueDate = new Date(Date.now() + 3 * HOUR_MS).toISOString();
    render(
      <AssignmentDueCard
        assignmentId="asg-1"
        classroomId="cls-1"
        title="Week 1 nouns"
        href="/en/education/lessons/l1"
        dueDate={dueDate}
        kind="due_soon"
      />,
    );

    const card = screen.getByTestId('assignment-due-card');
    expect(card).toHaveAttribute('data-kind', 'due_soon');
    expect(card).toHaveAttribute('href', '/en/education/lessons/l1');
    expect(card).toHaveTextContent('Week 1 nouns');
    expect(reminderShownMock).toHaveBeenCalledTimes(1);
    expect(reminderShownMock).toHaveBeenCalledWith(
      expect.objectContaining({ assignmentId: 'asg-1', classroomId: 'cls-1' }),
    );
    expect(overdueMock).not.toHaveBeenCalled();
  });

  it('overdue card fires assignment_overdue with the assignment and days', () => {
    render(
      <AssignmentDueCard
        assignmentId="asg-2"
        title="Verbs drill"
        href="/en/education/lessons/l2"
        dueDate={new Date(Date.now() - 2 * DAY_MS - 60_000).toISOString()}
        kind="overdue"
      />,
    );

    const card = screen.getByTestId('assignment-due-card');
    expect(card).toHaveAttribute('data-kind', 'overdue');
    expect(overdueMock).toHaveBeenCalledTimes(1);
    expect(overdueMock).toHaveBeenCalledWith(
      expect.objectContaining({ assignmentId: 'asg-2', daysOverdue: 2 }),
    );
    expect(reminderShownMock).not.toHaveBeenCalled();
  });
});
