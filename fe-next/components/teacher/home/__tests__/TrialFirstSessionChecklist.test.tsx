import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { deriveTrialFirstSession, trialFirstSessionHrefs } from '@/lib/education/trialFirstSessionChecklist';
import { TrialFirstSessionChecklist } from '../TrialFirstSessionChecklist';

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const TRIAL = { status: 'trialing' as const, known: true, loading: false };

afterEach(() => cleanup());

describe('<TrialFirstSessionChecklist>', () => {
  it('Given a trial class with students and no assignment, Then the current step deep-links into the assignment creator', () => {
    const checklist = deriveTrialFirstSession({
      ...TRIAL,
      classrooms: [{ id: 'c1', member_count: 42 }],
      assignmentCount: 0,
    });
    const onOpenAssignment = vi.fn();
    render(
      <TrialFirstSessionChecklist
        checklist={checklist}
        hrefs={trialFirstSessionHrefs('en', 'c1')}
        onOpenAssignment={onOpenAssignment}
        t={t}
      />,
    );

    expect(screen.getByTestId('trial-first-session-step-create_assignment')).toHaveAttribute('data-status', 'current');
    expect(screen.getByTestId('trial-first-session-step-add_students')).toHaveAttribute('data-status', 'done');
    const cta = screen.getByTestId('trial-first-session-cta');
    expect(cta).toHaveAttribute('href', '/en/teacher?classroomId=c1&assign=1');
    fireEvent.click(cta);
    expect(onOpenAssignment).toHaveBeenCalledOnce();
  });

  it('Given the live-game step, Then run and schedule both deep-link into existing flows', () => {
    const checklist = deriveTrialFirstSession({
      ...TRIAL,
      classroomCount: 1,
      hasStudents: true,
      assignmentCount: 1,
    });
    const onSchedule = vi.fn();
    render(
      <TrialFirstSessionChecklist
        checklist={checklist}
        hrefs={trialFirstSessionHrefs('en', 'c1')}
        onSchedule={onSchedule}
        t={t}
      />,
    );

    expect(screen.getByTestId('trial-first-session-cta')).toHaveAttribute(
      'href',
      '/en/education/classroom-game?classroomId=c1&minutes=2',
    );
    const schedule = screen.getByTestId('trial-first-session-schedule');
    expect(schedule).toHaveAttribute('href', '/en/teacher/classroom/new?classroomId=c1');
    fireEvent.click(schedule);
    expect(onSchedule).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Run a live game/)).toBeNull();
  });

  it('Given a hidden checklist, Then nothing renders', () => {
    const checklist = deriveTrialFirstSession({ ...TRIAL, status: 'active', classroomCount: 1 });
    render(<TrialFirstSessionChecklist checklist={checklist} hrefs={trialFirstSessionHrefs('en', 'c1')} t={t} />);
    expect(screen.queryByTestId('trial-first-session')).toBeNull();
  });

  it('Given dismiss, Then the checklist reports abandonment of the current step', () => {
    const checklist = deriveTrialFirstSession({ ...TRIAL, classroomCount: 1, assignmentCount: 0 });
    const onDismiss = vi.fn();
    render(
      <TrialFirstSessionChecklist
        checklist={checklist}
        hrefs={trialFirstSessionHrefs('en', 'c1')}
        onDismiss={onDismiss}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTestId('trial-first-session-dismiss'));
    expect(onDismiss).toHaveBeenCalledWith('add_students');
  });
});
