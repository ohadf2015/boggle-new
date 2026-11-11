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
const nav = vi.hoisted(() => ({ search: new URLSearchParams() }));
const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
  useSearchParams: () => nav.search,
  usePathname: () => '/en/education/classroom-game',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({ setIsInGame: () => {}, registerHeaderAudioControl: () => () => {} }),
}));
vi.mock('@/components/education/ClassroomGuestDemo', () => ({
  ClassroomGuestDemo: () => <div data-testid="student-join" />,
}));
vi.mock('@/components/education/ClassroomGameLobby', () => ({
  ClassroomGameLobby: () => <div data-testid="teacher-launcher" />,
}));
vi.mock('@/components/education/lobby/QuickLaunchProvisioner', () => ({
  QuickLaunchProvisioner: () => <div data-testid="teacher-express" />,
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/teacher/hq/QuickLaunchStage', () => ({ QuickLaunchStage: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));

import ClassroomGamePage from '../PageClient';

const EMAIL_QUERY = 'classroomId=c-1&mode=classic&minutes=5&session=warm-up&utm_campaign=lesson_reminder';

describe('classroom-game: signed-out visitor', () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    authState.user = null;
    authState.profile = null;
    authState.loading = false;
    nav.search = new URLSearchParams();
    window.history.replaceState(null, '', '/en/education/classroom-game');
  });

  it('given a class game link from an email, when signed out, then goes to sign-in and comes back to the same link', async () => {
    nav.search = new URLSearchParams(EMAIL_QUERY);
    window.history.replaceState(null, '', `/en/education/classroom-game?${EMAIL_QUERY}`);
    render(<ClassroomGamePage />);
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    const from = encodeURIComponent(`/en/education/classroom-game?${EMAIL_QUERY}`);
    expect(replace).toHaveBeenCalledWith(`/en/education/access?from=${from}`);
    expect(screen.queryByTestId('student-join')).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('given no class in the link, when signed out, then the guest still gets the class-code join', () => {
    render(<ClassroomGamePage />);
    expect(screen.getByTestId('student-join')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
