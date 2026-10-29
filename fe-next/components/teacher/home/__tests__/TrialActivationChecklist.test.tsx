import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: { user_role: 'teacher', display_name: 'Dana Levi' },
    loading: false,
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/education/shell/TeacherAccountMenu', () => ({
  TeacherAccountMenu: () => null,
}));
vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: () => null,
}));
vi.mock('@/lib/education/telemetry', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  trackEduTeacherDashboardViewed: vi.fn(),
}));
vi.mock('@/components/teacher/assignments', () => ({
  AssignmentCreator: ({ isOpen, classroomId }: { isOpen: boolean; classroomId: string }) =>
    isOpen ? <div data-testid="assignment-creator" data-classroom={classroomId} /> : null,
}));

let classroomsState: Record<string, unknown>;
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => classroomsState }));
let proState: Record<string, unknown>;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
let activation: Record<string, unknown>;
vi.mock('@/hooks/useTeacherActivationProgress', () => ({
  useTeacherActivationProgress: () => activation,
}));
vi.mock('@/hooks/useTeacherWeekStats', () => ({
  useTeacherWeekStats: () => ({ status: 'ready', summary: null, insights: [] }),
}));
vi.mock('@/hooks/useClassStudentPreview', () => ({
  useClassStudentPreview: () => null,
}));
const countAssignmentsMock = vi.fn();
vi.mock('@/lib/supabase/education/assignments', () => ({
  countClassroomsLessonAssignments: (...a: unknown[]) => countAssignmentsMock(...a),
}));

import { deriveTrialChecklist } from '@/lib/education/trialChecklistProgress';
import { TrialActivationChecklist } from '../TrialActivationChecklist';
import TeacherDashboard from '../../TeacherDashboard';

const HREFS = {
  create_classroom: '/en/teacher/classroom/new',
  invite_students: '/en/teacher/classroom/new?classroomId=c1',
  first_assignment: '/en/teacher?classroomId=c1&assign=1',
};

const t = (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k);

describe('<TrialActivationChecklist /> component', () => {
  afterEach(() => cleanup());

  it('renders for a trialing teacher with 0 steps done and shows all 3 steps', () => {
    const checklist = deriveTrialChecklist({
      status: 'trialing',
      known: true,
      loading: false,
      classroomCount: 0,
      inviteCopied: false,
      assignmentCount: 0,
    });
    render(<TrialActivationChecklist checklist={checklist} hrefs={HREFS} t={t} />);

    const banner = screen.getByTestId('trial-activation-checklist');
    expect(banner).toBeInTheDocument();
    expect(within(banner).getByTestId('trial-checklist-step-create_classroom')).toHaveAttribute(
      'data-status',
      'current',
    );
    expect(within(banner).getByTestId('trial-checklist-step-invite_students')).toHaveAttribute(
      'data-status',
      'todo',
    );
    expect(within(banner).getByTestId('trial-checklist-step-first_assignment')).toHaveAttribute(
      'data-status',
      'todo',
    );
    expect(within(banner).getByTestId('trial-checklist-cta')).toHaveAttribute(
      'href',
      '/en/teacher/classroom/new',
    );
  });

  it('is hidden when not trialing', () => {
    const checklist = deriveTrialChecklist({
      status: 'active',
      known: true,
      loading: false,
      classroomCount: 0,
      inviteCopied: false,
      assignmentCount: 0,
    });
    render(<TrialActivationChecklist checklist={checklist} hrefs={HREFS} t={t} />);
    expect(screen.queryByTestId('trial-activation-checklist')).not.toBeInTheDocument();
  });

  it('calls the persist callback when dismiss is clicked', () => {
    const onDismiss = vi.fn();
    const checklist = deriveTrialChecklist({
      status: 'trialing',
      known: true,
      loading: false,
      classroomCount: 0,
      inviteCopied: false,
      assignmentCount: 0,
    });
    render(
      <TrialActivationChecklist
        checklist={checklist}
        hrefs={HREFS}
        onDismiss={onDismiss}
        t={t}
      />,
    );

    fireEvent.click(screen.getByTestId('trial-checklist-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('marks a completed step with data-status="done" and advances the CTA to the next step', () => {
    const checklist = deriveTrialChecklist({
      status: 'trialing',
      known: true,
      loading: false,
      classroomCount: 1,
      inviteCopied: false,
      assignmentCount: 0,
    });
    render(<TrialActivationChecklist checklist={checklist} hrefs={HREFS} t={t} />);

    expect(screen.getByTestId('trial-checklist-step-create_classroom')).toHaveAttribute(
      'data-status',
      'done',
    );
    expect(screen.getByTestId('trial-checklist-step-invite_students')).toHaveAttribute(
      'data-status',
      'current',
    );
    expect(screen.getByTestId('trial-checklist-cta')).toHaveAttribute(
      'href',
      '/en/teacher/classroom/new?classroomId=c1',
    );
  });
});

describe('<TeacherDashboard /> trial checklist coexistence', () => {
  beforeEach(() => {
    classroomsState = { classrooms: [], isLoading: false, error: null, refresh: vi.fn() };
    proState = {
      hasPro: true,
      loading: false,
      source: 'polar',
      status: 'trialing',
      known: true,
      refresh: vi.fn(),
    };
    activation = {
      progress: { inviteCopied: false, liveStarted: false, roomOpened: false, dismissed: false },
      ready: true,
      markInviteCopied: vi.fn(),
      dismiss: vi.fn(),
    };
    countAssignmentsMock.mockResolvedValue(0);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dismissed: false, completed: false }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => cleanup());

  it('shows the trial checklist and hides HomeOnboardingCard while trialing', () => {
    render(<TeacherDashboard />);
    expect(screen.getByTestId('trial-activation-checklist')).toBeInTheDocument();
    expect(screen.queryByTestId('home-onboarding')).not.toBeInTheDocument();
  });

  it('restores HomeOnboardingCard when not trialing', () => {
    proState = {
      hasPro: false,
      loading: false,
      source: 'polar',
      status: 'active',
      known: true,
      refresh: vi.fn(),
    };
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('trial-activation-checklist')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-onboarding')).toBeInTheDocument();
  });
});
