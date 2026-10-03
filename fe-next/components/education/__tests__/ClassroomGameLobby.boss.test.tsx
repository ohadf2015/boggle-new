import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: unknown) => (params && typeof params === 'object' ? `${key}|${JSON.stringify(params)}` : key),
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'teacher-1', email: 't@lexiclash.test' }, profile: { display_name: 'Ms K' } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ createClassroom: vi.fn() }) }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false }) }));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => ({ saveConfig: vi.fn() }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduLiveGameStarted: vi.fn() }));
vi.mock('@/components/teacher/StarterPacksSection', () => ({ StarterPacksSection: () => null }));
vi.mock('../lobby/useRepeatLastSetup', () => ({ useRepeatLastSetup: () => ({ pending: false }) }));
const DEFINED = [
  { word: 'candid', definition: 'honest and direct' },
  { word: 'brittle', definition: 'hard but easily broken' },
  { word: 'dwindle', definition: 'to shrink little by little' },
  { word: 'endure', definition: 'to keep going through hardship' },
  { word: 'abandon', definition: 'to leave behind for good' },
];
let lessonWords: Array<{ word: string; definition?: string }> = DEFINED;
vi.mock('../lobby/useTeacherLobbyData', () => ({
  useTeacherLobbyData: () => ({
    lessons: [{ id: '1', name: 'Unit 3', language: 'en', words: lessonWords }],
    classrooms: [{ id: 'c1', name: 'Class' }],
    isLoading: false,
    isCreatingFromPack: false,
    selectedLessonIds: ['1'],
    setSelectedLessonIds: vi.fn(),
    selectedClassroomId: 'c1',
    setSelectedClassroomId: vi.fn(),
    createLessonFromPack: vi.fn(),
    fetchTeacherData: vi.fn(),
  }),
}));
const launch = vi.fn();
vi.mock('../lobby/useClassroomLaunchSocket', () => ({
  useClassroomLaunchSocket: () => ({
    gameCode: 'BOSS01', isStarting: false, startError: null, setStartError: vi.fn(), launch,
    socket: null, roomCreatedGameCode: null, startLiveGame: vi.fn(),
  }),
}));

import { ClassroomGameLobby } from '../ClassroomGameLobby';

describe('ClassroomGameLobby — launching from the catalogue', () => {
  beforeEach(() => {
    launch.mockClear();
    sessionStorage.clear();
    lessonWords = DEFINED;
  });

  it('launches Boss Battle as the quiz engine with the boss variant, and stores it for the host', () => {
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mode-tile-boss-battle'));
    fireEvent.click(screen.getByTestId('lobby-go-live'));

    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch.mock.calls[0][0].settings).toMatchObject({ gameMode: 'vocab-quiz', vocabQuizVariant: 'boss' });
    expect(JSON.parse(sessionStorage.getItem('lessonGameData')!)).toMatchObject({ gameMode: 'vocab-quiz', vocabQuizVariant: 'boss' });
  });

  it('launches a plain quiz with no variant at all', () => {
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('lobby-go-live'));
    expect(launch.mock.calls[0][0].settings.gameMode).toBe('vocab-quiz');
    expect(launch.mock.calls[0][0].settings).not.toHaveProperty('vocabQuizVariant');
  });

  it('opens on a board game when the list has no meanings to quiz on', () => {
    lessonWords = [{ word: 'horse' }, { word: 'sheep' }, { word: 'goat' }, { word: 'duck' }, { word: 'cow' }];
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    expect(screen.getByTestId('mode-tile-classic')).toHaveAttribute('aria-checked', 'true');
  });

  it('says why before the tap when a meaning mode cannot run on this list, and never launches it', () => {
    lessonWords = [{ word: 'horse' }, { word: 'sheep' }, { word: 'goat' }, { word: 'duck' }, { word: 'cow' }];
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mode-tile-boss-battle'));
    expect(screen.getByTestId('go-live-blocked')).toHaveTextContent('eg2Modes.needsMeanings');
    expect(screen.getByTestId('lobby-go-live')).toBeDisabled();
    fireEvent.click(screen.getByTestId('lobby-go-live'));
    expect(launch).not.toHaveBeenCalled();
  });

  it('hides the treasure-chest switch for Boss Battle, which never deals chests', () => {
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mode-tile-vocab-quiz'));
    fireEvent.click(screen.getAllByRole('button', { expanded: false }).find((b) => b.textContent?.includes('Unit 3'))!);
    expect(screen.getByText('vocabQuiz.setup.treasureChests')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mode-tile-boss-battle'));
    expect(screen.queryByText('vocabQuiz.setup.treasureChests')).not.toBeInTheDocument();
  });
});
