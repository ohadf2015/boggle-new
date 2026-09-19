/**
 * ClassroomManager — invite-hero card, empty-state wizard, create celebration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

const classroomsState: {
  classrooms: Array<{
    id: string;
    name: string;
    language: string;
    teacher_id: string;
    join_code: string;
    created_at: string;
    member_count: number;
  }>;
} = { classrooms: [] };

const createClassroom = vi.fn();

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: classroomsState.classrooms,
    isLoading: false,
    createClassroom,
    updateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const trackEduClassroomCreated = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackEduClassroomCreated: (...args: unknown[]) => trackEduClassroomCreated(...args),
}));

// Trial/pro state is owned by these hooks; keep the tests hermetic and steer
// the paywall-nudge branches directly.
const accessState: { trial: { isExpired: boolean } | null; isLoading: boolean } = {
  trial: null,
  isLoading: false,
};
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({
    hasAccess: true,
    status: 'approved',
    latestRequest: null,
    trial: accessState.trial,
    isLoading: accessState.isLoading,
  }),
}));

const proState: { hasPro: boolean; loading: boolean } = { hasPro: false, loading: false };
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({
    hasPro: proState.hasPro,
    loading: proState.loading,
    source: 'polar',
    periodEnd: null,
    grant: null,
    grantExpired: false,
    refresh: vi.fn(),
  }),
}));

import toast from 'react-hot-toast';
import { fireConfetti } from '@/utils/confettiUtils';
import ClassroomManager from '../ClassroomManager';

const createButtonName = /teacher\.classroom\.create/i;

describe('ClassroomManager invite + celebration UX', () => {
  beforeEach(() => {
    vi.mocked(fireConfetti).mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    createClassroom.mockReset();
    trackEduClassroomCreated.mockClear();
    classroomsState.classrooms = [];
    accessState.trial = null;
    accessState.isLoading = false;
    proState.hasPro = false;
    proState.loading = false;
  });

  it('shouldRenderSharedWizardWhenNoClassrooms', () => {
    // GIVEN — zero classrooms
    classroomsState.classrooms = [];

    // WHEN
    render(<ClassroomManager />);

    // THEN
    expect(screen.getByTestId('create-classroom-wizard')).toBeInTheDocument();
    expect(screen.getByText('teacher.classroom.wizard.step1.title')).toBeInTheDocument();
    expect(screen.getByText('teacher.classroom.wizard.step2.title')).toBeInTheDocument();
    expect(screen.getByText('teacher.classroom.wizard.step3.title')).toBeInTheDocument();
  });

  it('shouldMakeJoinCodeTheHeroOnClassroomCard', () => {
    // GIVEN
    classroomsState.classrooms = [
      {
        id: 'cls-1',
        name: 'Period 3',
        language: 'en',
        teacher_id: 'user1',
        join_code: 'ABC123',
        created_at: '2026-08-26',
        member_count: 0,
      },
    ];

    // WHEN
    render(<ClassroomManager />);

    // THEN
    expect(screen.getByTestId('invite-students-label')).toHaveTextContent(
      'teacher.classroom.inviteStudents'
    );
    const code = screen.getByTestId('classroom-join-code');
    expect(code).toHaveTextContent('ABC123');
    expect(code.className).toMatch(/text-3xl|text-4xl|text-5xl/);
    expect(screen.getByTestId('copy-join-code')).toBeInTheDocument();
    expect(screen.getByTestId('share-join-code')).toBeInTheDocument();
  });

  it('shouldCelebrateAndSurfaceCodeAfterClassroomCreation', async () => {
    // GIVEN
    const user = userEvent.setup();
    createClassroom.mockResolvedValue({
      success: true,
      data: {
        id: 'cls-new',
        name: 'Period 3',
        language: 'en',
        join_code: 'XYZ789',
      },
    });
    render(<ClassroomManager />);

    // WHEN — open create dialog (header button is first matching create CTA)
    await user.click(screen.getAllByRole('button', { name: createButtonName })[0]);
    await user.type(screen.getByPlaceholderText('teacher.classroom.namePlaceholder'), 'Period 3');
    const dialogCreate = screen.getAllByRole('button', { name: createButtonName }).at(-1);
    await user.click(dialogCreate!);

    // THEN
    await waitFor(() => {
      expect(fireConfetti).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
    expect(screen.getByTestId('classroom-created-banner')).toBeInTheDocument();
    expect(screen.getByTestId('classroom-created-banner')).toHaveTextContent('XYZ789');
  });

  it('shouldFireEduClassroomCreatedWhenCreateSucceeds', async () => {
    const user = userEvent.setup();
    createClassroom.mockResolvedValue({
      success: true,
      data: {
        id: 'cls-new',
        name: 'Period 3',
        language: 'he',
        join_code: 'XYZ789',
      },
    });
    render(<ClassroomManager />);

    await user.click(screen.getAllByRole('button', { name: createButtonName })[0]);
    await user.type(screen.getByPlaceholderText('teacher.classroom.namePlaceholder'), 'Period 3');
    const dialogCreate = screen.getAllByRole('button', { name: createButtonName }).at(-1);
    await user.click(dialogCreate!);

    await waitFor(() => {
      expect(trackEduClassroomCreated).toHaveBeenCalledWith({
        classroomId: 'cls-new',
        createdVia: 'dashboard',
        language: 'he',
      });
    });
  });

  it('shouldNotFireEduClassroomCreatedWhenCreateFails', async () => {
    const user = userEvent.setup();
    createClassroom.mockResolvedValue({
      success: false,
      error: 'nope',
    });
    render(<ClassroomManager />);

    await user.click(screen.getAllByRole('button', { name: createButtonName })[0]);
    await user.type(screen.getByPlaceholderText('teacher.classroom.namePlaceholder'), 'Period 3');
    const dialogCreateFail = screen.getAllByRole('button', { name: createButtonName }).at(-1);
    await user.click(dialogCreateFail!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(trackEduClassroomCreated).not.toHaveBeenCalled();
  });

  it('shouldShowTrialExpiredNudgeInsteadOfWizardWhenTrialEnded', async () => {
    // GIVEN — a teacher whose 14-day trial ended, never converted
    accessState.trial = { isExpired: true };
    classroomsState.classrooms = [
      {
        id: 'cls-1',
        name: 'Period 3',
        language: 'en',
        teacher_id: 'user1',
        join_code: 'ABC123',
        created_at: '2026-08-26',
        member_count: 0,
      },
    ];
    const user = userEvent.setup();
    render(<ClassroomManager />);

    // WHEN — they reach for the create flow
    await user.click(screen.getAllByRole('button', { name: createButtonName })[0]);

    // THEN — the Pro ask shows, not the create wizard dialog
    expect(await screen.findByText('teacher.subscription.trialExpiredTitle')).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.trialExpiredMessage')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('teacher.classroom.namePlaceholder')).not.toBeInTheDocument();
  });

  it('shouldContinueIntoWizardFromTheTrialNudgeFreeEscape', async () => {
    // GIVEN
    accessState.trial = { isExpired: true };
    classroomsState.classrooms = [
      {
        id: 'cls-1',
        name: 'Period 3',
        language: 'en',
        teacher_id: 'user1',
        join_code: 'ABC123',
        created_at: '2026-08-26',
        member_count: 0,
      },
    ];
    const user = userEvent.setup();
    render(<ClassroomManager />);

    // WHEN — open the nudge, then choose "continue with free tier"
    await user.click(screen.getAllByRole('button', { name: createButtonName })[0]);
    await screen.findByText('teacher.subscription.trialExpiredTitle');
    await user.click(screen.getByRole('button', { name: 'teacher.subscription.continueFree' }));

    // THEN — the nudge is gone and the create wizard is usable
    await waitFor(() => {
      expect(screen.queryByText('teacher.subscription.trialExpiredTitle')).not.toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('teacher.classroom.namePlaceholder')).toBeInTheDocument();
  });

  it('shouldNotShowTrialNudgeToAProTeacher', async () => {
    // GIVEN — trial expired on record, but the teacher is paying
    accessState.trial = { isExpired: true };
    proState.hasPro = true;
    classroomsState.classrooms = [
      {
        id: 'cls-1',
        name: 'Period 3',
        language: 'en',
        teacher_id: 'user1',
        join_code: 'ABC123',
        created_at: '2026-08-26',
        member_count: 0,
      },
    ];
    const user = userEvent.setup();
    render(<ClassroomManager />);

    // WHEN
    await user.click(screen.getAllByRole('button', { name: createButtonName })[0]);

    // THEN — straight to the wizard, no ask
    expect(screen.queryByText('teacher.subscription.trialExpiredTitle')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('teacher.classroom.namePlaceholder')).toBeInTheDocument();
  });
});
