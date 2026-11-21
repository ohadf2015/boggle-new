import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ClassroomWeekPanel } from '../ClassroomWeekPanel';

const load = vi.fn();
vi.mock('../loadClassroomWeekRows', () => ({
  loadClassroomWeekRows: (...args: unknown[]) => load(...args),
}));

const t = (key: string) => key;

describe('ClassroomWeekPanel', () => {
  beforeEach(() => {
    load.mockReset();
  });

  it('GIVEN the teacher has been quiet for 7 days WHEN the panel loads THEN the host link opens this class round', async () => {
    load.mockResolvedValue({
      error: null,
      summary: {
        byClass: { 'class-a': { studentsPracticed: 0, practiceSessions: 0, awardsEarned: 0, practicedThisWeek: false } },
        quietFor7Days: true,
        lastGameAt: null,
      },
    });

    render(
      <ClassroomWeekPanel classroomIds={['class-a']} focusId="class-a" focusName="5B" language="he" t={t} />,
    );

    const link = await screen.findByTestId('classroom-week-nudge');
    expect(link).toHaveAttribute('href', '/he/education/classroom-game?classroomId=class-a');
  });

  it('GIVEN the read fails WHEN the panel loads THEN the quiet banner stays hidden', async () => {
    load.mockResolvedValue({ error: 'down', summary: { byClass: {}, quietFor7Days: false, lastGameAt: null } });

    render(
      <ClassroomWeekPanel classroomIds={['class-a']} focusId="class-a" focusName="5B" language="en" t={t} />,
    );

    await waitFor(() => expect(screen.getByTestId('classroom-week-error')).toBeInTheDocument());
    expect(screen.queryByTestId('classroom-week-nudge')).not.toBeInTheDocument();
  });
});
