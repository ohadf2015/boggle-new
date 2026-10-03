import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const authState: {
  user: { id: string } | null;
  profile: { user_role?: string } | null;
  loading: boolean;
} = { user: null, profile: null, loading: false };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    ...authState,
    isAuthenticated: !!authState.user && !!authState.profile,
    refreshProfile: async () => {},
  }),
}));
vi.mock('@/utils/authFetch', () => ({
  getWithAuth: vi.fn(async () => ({ ok: true, json: async () => ({ row: null }) })),
}));
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: () => {} }),
}));
const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/en/education/classroom-game',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({ setIsInGame: () => {} }),
}));
vi.mock('@/components/education/ClassroomGuestDemo', () => ({
  ClassroomGuestDemo: () => <div data-testid="student-join" />,
}));
vi.mock('@/components/education/ClassroomGameLobby', () => ({
  ClassroomGameLobby: () => <div data-testid="teacher-launcher" />,
}));
vi.mock('@/components/education/ClassroomGameLobbyExpress', () => ({
  ClassroomGameLobbyExpress: () => <div data-testid="teacher-express" />,
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/education/lobby/LaunchStageBackdrop', () => ({ LaunchStageBackdrop: () => null }));
vi.mock('@/components/teacher/hq/QuickLaunchStage', () => ({ QuickLaunchStage: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));

import ClassroomGamePage from '../PageClient';
import { __resetTeacherGrantsForTests } from '@/components/education/TeacherGate';

describe('classroom-game: signed-in user whose profile has not loaded yet', () => {
  beforeEach(() => {
    __resetTeacherGrantsForTests();
    push.mockClear();
    replace.mockClear();
    authState.user = null;
    authState.profile = null;
    authState.loading = false;
  });

  it('never shows the student join form while the role is unknown, then shows the teacher launcher', async () => {
    authState.user = { id: 'teacher-1' };
    const { rerender } = render(<ClassroomGamePage />);

    expect(screen.queryByTestId('student-join')).toBeNull();
    expect(screen.queryByTestId('teacher-launcher')).toBeNull();
    expect(screen.getByTestId('loader')).toBeTruthy();

    authState.profile = { user_role: 'teacher' };
    rerender(<ClassroomGamePage />);

    await waitFor(() => expect(screen.getByTestId('teacher-launcher')).toBeTruthy());
    expect(screen.queryByTestId('student-join')).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('still shows the join form to a settled signed-out visitor', () => {
    render(<ClassroomGamePage />);
    expect(screen.getByTestId('student-join')).toBeTruthy();
  });
});
