import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({ __esModule: true, default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks/gameState', () => ({ useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));

import { LobbyModeSwitcher } from '../lobby/LobbyModeSwitcher';

const handlers: Record<string, (data?: unknown) => void> = {};
const emit = vi.fn();
const socket = {
  emit,
  on: vi.fn((e: string, fn: (data?: unknown) => void) => { handlers[e] = fn; }),
  off: vi.fn((e: string) => { delete handlers[e]; }),
} as never;
const CODE = 'JATS5Z';
const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}|${JSON.stringify(params)}` : key);
const onModeApplied = vi.fn();

function renderSwitcher(currentMode: string) {
  return render(<LobbyModeSwitcher gameCode={CODE} currentMode={currentMode as never} socket={socket} t={t} onModeApplied={onModeApplied} />);
}

describe('LobbyModeSwitcher — Boss Battle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
    sessionStorage.setItem('lessonGameData', JSON.stringify({ lessonId: 'l1', gameMode: 'classic' }));
  });

  it('offers Boss Battle in the sheet and asks the server for the quiz with the boss variant', () => {
    renderSwitcher('classic');
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-boss-battle'));
    expect(emit).toHaveBeenCalledWith('updateClassroomGameMode', { gameCode: CODE, gameMode: 'vocab-quiz', vocabQuizVariant: 'boss' });
  });

  it('renames the room and remembers the variant once the server agrees', async () => {
    renderSwitcher('classic');
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-boss-battle'));
    act(() => handlers['classroomGameModeChanged']?.({ gameCode: CODE, gameMode: 'vocab-quiz', vocabQuizVariant: 'boss' }));
    await waitFor(() => expect(screen.getByTestId('lobby-change-mode')).toHaveTextContent('eg2Modes.boss.name'));
    expect(JSON.parse(sessionStorage.getItem('lessonGameData')!)).toMatchObject({ gameMode: 'vocab-quiz', vocabQuizVariant: 'boss' });
    expect(onModeApplied).toHaveBeenCalledWith('boss-battle');
  });

  it('can leave Boss Battle for the plain quiz, although both run on the quiz engine', async () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ lessonId: 'l1', gameMode: 'vocab-quiz', vocabQuizVariant: 'boss' }));
    renderSwitcher('boss-battle');
    fireEvent.click(screen.getByTestId('lobby-change-mode'));
    fireEvent.click(screen.getByTestId('mode-tile-vocab-quiz'));
    expect(emit).toHaveBeenCalledWith('updateClassroomGameMode', { gameCode: CODE, gameMode: 'vocab-quiz' });
    act(() => handlers['classroomGameModeChanged']?.({ gameCode: CODE, gameMode: 'vocab-quiz' }));
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem('lessonGameData')!).vocabQuizVariant).toBeUndefined());
  });
});
