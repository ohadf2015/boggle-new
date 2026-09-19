/**
 * TeacherActivationNudge — join link on an empty roster, first-assignment
 * ask once students are in. The derivation is tested in teacherActivation;
 * these assertions pin what the teacher actually sees and taps.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeacherActivationNudge, TeacherActivationNudgeLive } from '../TeacherActivationNudge';
import { classroomInvitePayload } from '@/lib/education/classroomInvitePayload';
import * as assignmentsAPI from '@/lib/supabase/education/assignments';

vi.mock('@/lib/supabase/education/assignments', () => ({
  getClassroomAssignments: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const writeText = vi.fn().mockResolvedValue(undefined);

describe('TeacherActivationNudge', () => {
  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('renders nothing when there is no activation step', () => {
    const { container } = render(
      <TeacherActivationNudge
        rosterCount={4}
        assignmentCount={2}
        joinCode="Q3UQ2J"
        onCreateAssignment={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when assignment count is unknown', () => {
    render(
      <TeacherActivationNudge
        rosterCount={4}
        assignmentCount={null}
        joinCode="Q3UQ2J"
        onCreateAssignment={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('teacher-activation-nudge')).not.toBeInTheDocument();
  });

  it('shows the shareable join code and link on an empty roster', () => {
    render(
      <TeacherActivationNudge
        rosterCount={0}
        assignmentCount={null}
        joinCode="Q3UQ2J"
        onCreateAssignment={vi.fn()}
      />,
    );

    const card = screen.getByTestId('teacher-activation-nudge');
    expect(card).toHaveAttribute('data-step', 'shareJoin');
    expect(screen.getByTestId('teacher-activation-join-code')).toHaveTextContent('Q3UQ2J');
    expect(screen.getByTestId('teacher-activation-join-url').textContent).toMatch(
      /\/en\/join\/Q3UQ2J$/,
    );
  });

  it('copies the invite payload (code + join URL), not the bare six characters', () => {
    render(
      <TeacherActivationNudge
        rosterCount={0}
        assignmentCount={null}
        joinCode="Q3UQ2J"
        onCreateAssignment={vi.fn()}
      />,
    );

    // fireEvent, not userEvent: userEvent.setup() installs its own clipboard
    // stub over the one this test is asserting on.
    fireEvent.click(screen.getByTestId('teacher-activation-copy'));

    expect(writeText).toHaveBeenCalledWith(
      classroomInvitePayload(window.location.origin, 'en', 'Q3UQ2J'),
    );
  });

  it('asks to create the first assignment once students have joined', async () => {
    const user = userEvent.setup();
    const onCreateAssignment = vi.fn();
    render(
      <TeacherActivationNudge
        rosterCount={3}
        assignmentCount={0}
        joinCode="Q3UQ2J"
        onCreateAssignment={onCreateAssignment}
      />,
    );

    expect(screen.getByTestId('teacher-activation-nudge')).toHaveAttribute(
      'data-step',
      'firstAssignment',
    );
    await user.click(screen.getByTestId('teacher-activation-assign'));
    expect(onCreateAssignment).toHaveBeenCalledTimes(1);
  });
});

describe('TeacherActivationNudgeLive', () => {
  const getClassroomAssignments = vi.mocked(assignmentsAPI.getClassroomAssignments);

  beforeEach(() => {
    getClassroomAssignments.mockReset();
  });

  it('nudges first assignment only after a successful empty read', async () => {
    getClassroomAssignments.mockResolvedValue({ data: [], error: null });
    render(
      <TeacherActivationNudgeLive
        classroomId="c1"
        rosterCount={4}
        joinCode="Q3UQ2J"
        onCreateAssignment={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('teacher-activation-nudge')).not.toBeInTheDocument();
    expect(await screen.findByTestId('teacher-activation-nudge')).toHaveAttribute(
      'data-step',
      'firstAssignment',
    );
  });

  it('does not treat a failed assignment read as zero assignments', async () => {
    getClassroomAssignments.mockResolvedValue({
      data: [],
      error: { message: 'Supabase not configured' },
    });
    render(
      <TeacherActivationNudgeLive
        classroomId="c1"
        rosterCount={4}
        joinCode="Q3UQ2J"
        onCreateAssignment={vi.fn()}
      />,
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByTestId('teacher-activation-nudge')).not.toBeInTheDocument();
    expect(getClassroomAssignments).toHaveBeenCalledWith('c1');
  });

  it('shares the join code without waiting on assignments when the roster is empty', () => {
    render(
      <TeacherActivationNudgeLive
        classroomId="c1"
        rosterCount={0}
        joinCode="Q3UQ2J"
        onCreateAssignment={vi.fn()}
      />,
    );

    expect(screen.getByTestId('teacher-activation-nudge')).toHaveAttribute('data-step', 'shareJoin');
    expect(getClassroomAssignments).not.toHaveBeenCalled();
  });
});
