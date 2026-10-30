import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

let search = new URLSearchParams();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' }, profile: { user_role: 'teacher' }, loading: false, isAuthenticated: true, refreshProfile: async () => {} }),
}));
vi.mock('@/utils/authFetch', () => ({ getWithAuth: vi.fn(async () => ({ ok: true, json: async () => ({ row: null }) })) }));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: 'control', trackExposure: () => {} }) }));
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
  useSearchParams: () => search,
  usePathname: () => '/en/education/classroom-game',
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useNavigation: () => ({ setIsInGame: () => {} }) }));
vi.mock('@/components/education/ClassroomGuestDemo', () => ({ ClassroomGuestDemo: () => null }));
const lobbyProps = vi.fn();
vi.mock('@/components/education/ClassroomGameLobby', () => ({
  ClassroomGameLobby: (p: Record<string, unknown>) => {
    lobbyProps(p);
    return <div data-testid="lobby" />;
  },
}));
const provisionerProps = vi.fn();
vi.mock('@/components/education/lobby/QuickLaunchProvisioner', () => ({
  QuickLaunchProvisioner: (p: Record<string, unknown>) => {
    provisionerProps(p);
    return <div data-testid="provisioner" />;
  },
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/teacher/hq/QuickLaunchStage', () => ({ QuickLaunchStage: () => null }));

import ClassroomGamePage from '../PageClient';
import { __resetTeacherGrantsForTests } from '@/components/education/TeacherGate';
import { QUICK_LAUNCH_KEY } from '@/components/teacher/dashboard/quickLaunchIntent';

const intent = { source: 'lesson', lessonId: 'l-1', title: 'Unit 4', language: 'en', createdAt: Date.now() };

describe('classroom-game: the quick-launch entry path', () => {
  beforeEach(() => {
    __resetTeacherGrantsForTests();
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('Given a fresh quick-launch intent, Then it provisions first, then swaps the URL for a preselected lobby and drops the intent', async () => {
    search = new URLSearchParams('flow=quickLaunch');
    sessionStorage.setItem(QUICK_LAUNCH_KEY, JSON.stringify(intent));
    render(<ClassroomGamePage />);
    expect(await screen.findByTestId('provisioner')).toBeInTheDocument();

    const { onReady } = provisionerProps.mock.calls[provisionerProps.mock.calls.length - 1][0] as { onReady: (r: unknown) => void };
    act(() => onReady({ classroomId: 'c-1', lessonId: 'l-1', mode: 'blast' }));

    expect(replace).toHaveBeenCalledWith('/en/education/classroom-game?flow=quick&classroomId=c-1&lessonId=l-1&mode=blast');
    expect(sessionStorage.getItem(QUICK_LAUNCH_KEY)).toBeNull();
  });

  it('Given the replaced URL (or a reload of it), Then the lobby opens in its quick presentation, preselected', async () => {
    search = new URLSearchParams('flow=quick&classroomId=c-1&lessonId=l-1&mode=blast');
    render(<ClassroomGamePage />);
    expect(await screen.findByTestId('lobby')).toBeInTheDocument();
    expect(lobbyProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ quick: true, initialClassroomId: 'c-1', initialLessonId: 'l-1', initialMode: 'blast' })
    );
    expect(provisionerProps).not.toHaveBeenCalled();
  });

  it('Given the plain route, Then the full lobby opens and nothing is provisioned', async () => {
    search = new URLSearchParams();
    render(<ClassroomGamePage />);
    expect(await screen.findByTestId('lobby')).toBeInTheDocument();
    expect(lobbyProps).toHaveBeenLastCalledWith(expect.objectContaining({ quick: false }));
    expect(provisionerProps).not.toHaveBeenCalled();
  });

  it('Given an expired or missing intent, Then the full lobby opens instead of a dead end', async () => {
    search = new URLSearchParams('flow=quickLaunch');
    render(<ClassroomGamePage />);
    expect(await screen.findByTestId('lobby')).toBeInTheDocument();
    expect(provisionerProps).not.toHaveBeenCalled();
  });

  it('Given a "Run this" session link, Then the pack, preset and quiz shape reach the lobby', async () => {
    search = new URLSearchParams('mode=vocab-quiz&minutes=3&session=exit-ticket&pack=LC-EN-PK-AUTUMN&preset=friday-battle&questions=8&seconds=20');
    render(<ClassroomGamePage />);
    expect(await screen.findByTestId('lobby')).toBeInTheDocument();
    expect(lobbyProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ sessionPack: 'LC-EN-PK-AUTUMN', initialPreset: 'friday-battle', initialQuestions: 8, initialSeconds: 20, initialMinutes: 3 })
    );
  });

  it('Given junk session params, Then they are dropped instead of reaching the room', async () => {
    search = new URLSearchParams('pack=../etc&preset=turbo&questions=999&seconds=-1');
    render(<ClassroomGamePage />);
    expect(await screen.findByTestId('lobby')).toBeInTheDocument();
    expect(lobbyProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ sessionPack: undefined, initialPreset: undefined, initialQuestions: undefined, initialSeconds: undefined })
    );
  });
});
