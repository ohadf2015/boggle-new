import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassroomWeekSection } from '../ClassroomWeekSection';
import type { ClassroomWeekDigest } from '../classroomWeekActivity';

const t = (key: string, params?: Record<string, string | number>) =>
  params?.classroom ? `${key}:${params.classroom}` : key;

const ACTIVE: ClassroomWeekDigest = {
  studentsPracticed: 3,
  practiceSessions: 11,
  awardsEarned: 4,
  practicedThisWeek: true,
};

function renderSection(overrides: Partial<React.ComponentProps<typeof ClassroomWeekSection>> = {}) {
  return render(
    <ClassroomWeekSection
      classroomName="5B"
      digest={ACTIVE}
      status="ready"
      showNudge={false}
      hostHref="/en/education/classroom-game?classroomId=c1"
      onRetry={vi.fn()}
      t={t}
      {...overrides}
    />,
  );
}

describe('ClassroomWeekSection', () => {
  it('GIVEN this week totals WHEN rendered THEN practice count and awards are on the teacher surface', () => {
    renderSection();
    const section = screen.getByTestId('classroom-week-section');
    expect(section).toHaveAttribute('aria-label', 'teacher.digest.classroomWeekRegion:5B');
    expect(screen.getByText('teacher.digest.classroomWeekTitle')).toBeInTheDocument();
    expect(screen.getByTestId('classroom-week-students')).toHaveTextContent('3');
    expect(screen.getByTestId('classroom-week-sessions')).toHaveTextContent('11');
    expect(screen.getByTestId('classroom-week-awards')).toHaveTextContent('4');
    expect(screen.queryByTestId('classroom-week-nudge')).not.toBeInTheDocument();
  });

  it('GIVEN nobody practiced this week WHEN rendered THEN the empty line shows and the stats stay zero', () => {
    renderSection({
      digest: { studentsPracticed: 0, practiceSessions: 0, awardsEarned: 0, practicedThisWeek: false },
    });
    expect(screen.getByTestId('classroom-week-empty')).toHaveTextContent('teacher.digest.classroomWeekEmpty');
    expect(screen.getByTestId('classroom-week-sessions')).toHaveTextContent('0');
  });

  it('GIVEN the teacher has been quiet for 7 days WHEN rendered THEN the banner is a one-click host link', () => {
    renderSection({ showNudge: true });
    const link = screen.getByTestId('classroom-week-nudge');
    expect(link).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c1');
    expect(link).toHaveTextContent('teacher.digest.classroomWeekNudgeCta');
  });

  it('GIVEN the week is still loading WHEN rendered THEN there is no nudge and no false zero', () => {
    renderSection({ status: 'loading', digest: null, showNudge: true });
    expect(screen.getByTestId('classroom-week-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('classroom-week-nudge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('classroom-week-sessions')).not.toBeInTheDocument();
  });

  it('GIVEN the read failed WHEN rendered THEN retry is offered and the quiet banner stays hidden', async () => {
    const onRetry = vi.fn();
    renderSection({ status: 'error', digest: null, showNudge: true, onRetry });
    expect(screen.queryByTestId('classroom-week-nudge')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('classroom-week-retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('GIVEN the week totals WHEN rendered THEN the title needs no subtitle and the tiles sit on the light card, not dark-theme grey', () => {
    renderSection();
    expect(screen.queryByText('teacher.digest.classroomWeekSubtitle')).not.toBeInTheDocument();
    const tile = screen.getByTestId('classroom-week-students').firstElementChild!;
    expect(tile.className).not.toMatch(/bg-neo-navy|text-neo-white/);
    expect(tile.className).toContain('text-edu-ink');
  });
});
