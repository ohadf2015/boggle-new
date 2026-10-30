/** Host flow in three taps: class → mode → Start, with options collapsed and honest busy/error states. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

vi.mock('react-hot-toast', () => ({ __esModule: true, default: { error: vi.fn(), success: vi.fn() } }));
const { stableT } = vi.hoisted(() => ({
  stableT: (key: string, params?: unknown) => (params && typeof params === 'object' ? `${key}|${JSON.stringify(params)}` : key),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: stableT, language: 'en', dir: 'ltr' }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 't1', email: 't@example.com' }, profile: { display_name: 'Ms Plant' } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => ({ saveConfig: vi.fn() }) }));
vi.mock('../lobby/useRepeatLastSetup', () => ({ useRepeatLastSetup: () => ({ pending: false }) }));

const setSelectedClassroomId = vi.fn();
let lobbyData: Record<string, unknown>;
vi.mock('../lobby/useTeacherLobbyData', () => ({ useTeacherLobbyData: () => lobbyData }));
const launch = vi.fn();
let socketState: Record<string, unknown>;
vi.mock('../lobby/useClassroomLaunchSocket', () => ({ useClassroomLaunchSocket: () => socketState }));

import { ClassroomGameLobby } from '../ClassroomGameLobby';

const LESSON = { id: 'l1', name: 'Animals', language: 'en', words: [{ word: 'tiger' }, { word: 'zebra' }] };

beforeEach(() => {
  lobbyData = {
    lessons: [LESSON],
    classrooms: [
      { id: 'c1', name: '5B', language: 'en' },
      { id: 'c2', name: '4A', language: 'he' },
    ],
    isLoading: false,
    isCreatingFromPack: false,
    selectedLessonIds: ['l1'],
    setSelectedLessonIds: vi.fn(),
    selectedClassroomId: 'c1',
    setSelectedClassroomId,
    createLessonFromPack: vi.fn(),
    fetchTeacherData: vi.fn(),
  };
  socketState = { gameCode: 'G1', isStarting: false, startError: null, setStartError: vi.fn(), launch, roomCreatedGameCode: null, pressurePending: false };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('host flow', () => {
  it('Given two classes, Then the class is the first visible choice, and tapping one picks it', async () => {
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    const picker = screen.getByTestId('lobby-class-picker');
    expect(within(picker).getByRole('radio', { name: '5B' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(within(picker).getByRole('radio', { name: '4A' }));
    expect(setSelectedClassroomId).toHaveBeenCalledWith('c2');
  });

  it('Then every mode card carries its delivery tag', () => {
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    expect(within(screen.getByTestId('mode-tile-word-hunt')).getByTestId('delivery-tag-phones')).toBeInTheDocument();
    expect(within(screen.getByTestId('mode-tile-vocab-quiz')).getByTestId('delivery-tag-projector')).toBeInTheDocument();
    expect(within(screen.getByTestId('mode-tile-classic')).getByTestId('delivery-tag-both')).toBeInTheDocument();
  });

  it('Given ?mode= from Home, Then that mode is already chosen', () => {
    render(<ClassroomGameLobby onBack={vi.fn()} initialMode="word-hunt" />);
    expect(screen.getByTestId('mode-tile-word-hunt')).toHaveAttribute('aria-checked', 'true');
  });

  it('Given ?minutes=2 (onboarding demo), Then the round launches at 2 minutes with late join on by default', async () => {
    render(<ClassroomGameLobby onBack={vi.fn()} initialMode="classic" initialMinutes={2} />);
    await userEvent.click(screen.getAllByTestId('lobby-go-live')[0]);
    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch.mock.calls[0][0].settings).toMatchObject({ timerMinutes: 2, allowLateJoin: true, gameMode: 'classic' });
  });

  it('Given Options, When late join is switched off, Then the room is created with late join off', async () => {
    render(<ClassroomGameLobby onBack={vi.fn()} initialMode="classic" />);
    await userEvent.click(screen.getByTestId('lobby-setup-summary'));
    await userEvent.click(screen.getByRole('switch', { name: 'eduShell.host.lateJoin' }));
    await userEvent.click(screen.getByTestId('lobby-setup-done'));
    await userEvent.click(screen.getAllByTestId('lobby-go-live')[0]);
    expect(launch.mock.calls[0][0].settings.allowLateJoin).toBe(false);
  });

  it('Given the room failed to open, Then the error offers a retry that launches again', async () => {
    socketState = { ...socketState, startError: 'education.classroomGame.createFailed' };
    render(<ClassroomGameLobby onBack={vi.fn()} initialMode="classic" />);
    const alert = screen.getByTestId('create-room-error');
    await userEvent.click(within(alert).getByTestId('create-room-retry'));
    expect(launch).toHaveBeenCalledTimes(1);
  });
});
