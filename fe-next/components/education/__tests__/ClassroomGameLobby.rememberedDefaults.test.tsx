import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthProvider';
import { ClassroomGameLobby } from '../ClassroomGameLobby';
import { useTeacherLobbyData } from '../lobby/useTeacherLobbyData';
import { useClassroomLaunchSocket } from '../lobby/useClassroomLaunchSocket';
import { useRepeatLastSetup } from '../lobby/useRepeatLastSetup';

vi.mock('../lobby/useTeacherLobbyData');
vi.mock('../lobby/useClassroomLaunchSocket');
vi.mock('../lobby/useRepeatLastSetup');
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => ({ saveConfig: vi.fn(), getMostRecent: () => null }) }));
vi.mock('@/contexts/AuthContext', async (orig) => ({
  ...(await orig<typeof import('@/contexts/AuthContext')>()),
  useAuth: () => ({ user: { id: 't1', email: 'ms.k@lexiclash.test' }, profile: { display_name: 'Ms K' } }),
}));

const launch = vi.fn();

function mount() {
  vi.mocked(useTeacherLobbyData).mockReturnValue({
    lessons: [{ id: '1', name: 'Cells', words: [{ word: 'osmosis' }, { word: 'enzyme' }] }],
    classrooms: [{ id: 'c1', name: '5B' }],
    isLoading: false,
    isCreatingFromPack: false,
    selectedLessonIds: ['1'],
    setSelectedLessonIds: vi.fn(),
    selectedClassroomId: 'c1',
    setSelectedClassroomId: vi.fn(),
    createLessonFromPack: vi.fn(),
  } as never);
  vi.mocked(useClassroomLaunchSocket).mockReturnValue({
    gameCode: 'AB12CD', isStarting: false, startError: null, setStartError: vi.fn(), launch, roomCreatedGameCode: null, pressurePending: false,
  } as never);
  vi.mocked(useRepeatLastSetup).mockReturnValue({ pending: false });
  render(
    <AuthProvider>
      <LanguageProvider>
        <ClassroomGameLobby onBack={vi.fn()} initialMode="classic" />
      </LanguageProvider>
    </AuthProvider>
  );
  fireEvent.click(screen.getAllByTestId('lobby-go-live')[0]);
  return launch.mock.calls[0]?.[0]?.settings;
}

describe('ClassroomGameLobby remembered round defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('given the teacher last ran a 5-minute large board with late join off, when they go live without touching options, then the room gets the same round', () => {
    window.localStorage.setItem('lexiclash_recent_game_settings', JSON.stringify([
      { id: '1', classroomId: 'c1', classroomName: '5B', lessonIds: ['1'], lessonNames: ['Cells'], savedAt: 1, settings: { timerMinutes: 5, boardSize: 'large', allowLateJoin: false } },
    ]));
    expect(mount()).toMatchObject({ timerMinutes: 5, boardSize: 'large', allowLateJoin: false });
  });

  it('given a first-time teacher, when they go live, then the sane defaults apply', () => {
    expect(mount()).toMatchObject({ timerMinutes: 3, boardSize: 'medium', allowLateJoin: true });
  });
});
