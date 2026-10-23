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
vi.mock('../useRepeatLastSetup', () => ({ useRepeatLastSetup: () => ({ pending: false }) }));

let lessonWords: Array<{ word: string; definition?: string }> = [];
let lessonLanguage = 'en';
vi.mock('../useTeacherLobbyData', () => ({
  useTeacherLobbyData: () => ({
    lessons: [{ id: '1', name: 'Unit 3', language: lessonLanguage, words: lessonWords }],
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
let startError: string | null = null;
vi.mock('../useClassroomLaunchSocket', () => ({
  useClassroomLaunchSocket: () => ({
    gameCode: 'WC0001', isStarting: false, startError, setStartError: vi.fn(), launch,
    socket: null, roomCreatedGameCode: null, startLiveGame: vi.fn(),
  }),
}));

import { ClassroomGameLobby } from '../../ClassroomGameLobby';

const LONG = [
  { word: 'photosynthesis', definition: 'how plants make food from light' },
  { word: 'independence', definition: 'freedom from outside control' },
  { word: 'extraordinary', definition: 'very unusual' },
];

describe('ClassroomGameLobby — Wordcraft gate', () => {
  beforeEach(() => {
    launch.mockClear();
    sessionStorage.clear();
    lessonLanguage = 'en';
    startError = null;
  });

  it('GIVEN no lesson word fits the rack WHEN the teacher picks Wordcraft THEN Go Live says why and never opens a room', () => {
    lessonWords = LONG;
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mode-tile-wordcraft'));
    expect(screen.getByTestId('go-live-blocked')).toHaveTextContent('education.modePicker.wordcraftNeedsShortWords');
    expect(screen.getByTestId('lobby-go-live')).toBeDisabled();
    fireEvent.click(screen.getByTestId('lobby-go-live'));
    expect(launch).not.toHaveBeenCalled();
  });

  it('GIVEN a Russian lesson WHEN the teacher picks Wordcraft THEN Go Live is blocked', () => {
    lessonWords = [{ word: 'кошка' }, { word: 'собака' }];
    lessonLanguage = 'ru';
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mode-tile-wordcraft'));
    expect(screen.getByTestId('go-live-blocked')).toHaveTextContent('education.modePicker.wordcraftNeedsShortWords');
  });

  it('GIVEN a lesson with short words WHEN the teacher picks Wordcraft THEN it launches as Wordcraft', () => {
    lessonWords = [{ word: 'cat' }, { word: 'star' }, ...LONG];
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mode-tile-wordcraft'));
    expect(screen.queryByTestId('go-live-blocked')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('lobby-go-live'));
    expect(launch.mock.calls[0][0].settings.gameMode).toBe('wordcraft');
  });

  it('GIVEN a long-word lesson WHEN the teacher keeps a board mode THEN Go Live is not blocked by the Wordcraft rule', () => {
    lessonWords = LONG;
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mode-tile-classic'));
    expect(screen.queryByTestId('go-live-blocked')).not.toBeInTheDocument();
  });

  it('GIVEN a failed launch WHEN the teacher retries Wordcraft on a long-word lesson THEN no room opens', () => {
    lessonWords = LONG;
    startError = 'errors.network';
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mode-tile-wordcraft'));
    fireEvent.click(screen.getByTestId('create-room-retry'));
    expect(launch).not.toHaveBeenCalled();
  });
});
