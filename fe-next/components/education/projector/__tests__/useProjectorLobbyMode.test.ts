import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let liveGame: Record<string, unknown> | null = null;
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => liveGame }));
vi.mock('@/components/education/projector/ProjectorQuizBlocked', () => ({ useQuizStartRefused: () => [false, vi.fn()] }));
let localMode: string | null = null;
vi.mock('@/components/education/lobby/useClassroomModeSwitch', () => ({ readLocalGameMode: () => localMode }));

import { useProjectorLobbyMode } from '../useProjectorLobbyMode';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const factKeys = (facts: { key: string }[]) => facts.map((f) => f.key);

describe('useProjectorLobbyMode — Boss Battle survives GO LIVE', () => {
  beforeEach(() => {
    sessionStorage.clear();
    liveGame = null;
    localMode = null;
  });

  it('GIVEN the teacher went live with Boss Battle WHEN the projector lobby opens THEN it reads Boss Battle, not Classic', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'classic', classroomBossId: 'lexiconDragon' }));
    localMode = 'classic';
    const { result } = renderHook(() => useProjectorLobbyMode({ gameCode: 'AB12', classroomGameMode: 'classic', t }));
    expect(result.current.modeId).toBe('boss-battle');
  });

  it('GIVEN no local launch data WHEN the room record carries a boss THEN the lobby reads Boss Battle', () => {
    liveGame = { gameMode: 'classic', settings: { classroomBossId: 'lexiconDragon', timerMinutes: 3 } };
    const { result } = renderHook(() => useProjectorLobbyMode({ gameCode: 'AB12', t }));
    expect(result.current.modeId).toBe('boss-battle');
  });

  it('GIVEN a plain Classic launch WHEN the lobby opens THEN it stays Classic', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'classic' }));
    localMode = 'classic';
    const { result } = renderHook(() => useProjectorLobbyMode({ gameCode: 'AB12', classroomGameMode: 'classic', t }));
    expect(result.current.modeId).toBe('classic');
  });

  it('GIVEN a room still on the retired quiz-boss variant WHEN the lobby opens THEN it runs the quiz engine', () => {
    liveGame = { gameMode: 'vocab-quiz', settings: { vocabQuizVariant: 'boss' } };
    const { result } = renderHook(() => useProjectorLobbyMode({ gameCode: 'AB12', t }));
    expect(result.current.isQuiz).toBe(true);
  });
});

describe('useProjectorLobbyMode — the settings the wall prints', () => {
  beforeEach(() => {
    sessionStorage.clear();
    liveGame = null;
    localMode = null;
  });

  it('GIVEN a board game THEN it lists round length, board size and late join from the teacher template first', () => {
    liveGame = { gameMode: 'classic', settings: { timerMinutes: 9, boardSize: 'small', allowLateJoin: true } };
    const { result } = renderHook(() =>
      useProjectorLobbyMode({ gameCode: 'AB12', classroomGameMode: 'classic', templateSettings: { timerSeconds: 180, difficulty: 'large', allowLateJoin: false }, t })
    );
    expect(result.current.facts).toEqual([
      { key: 'timer', text: 'eduLiveRoom.lobby.minutes:{"count":3}' },
      { key: 'board', text: '7×7' },
      { key: 'late', text: 'education.projectorLobby.lateJoinOff' },
    ]);
  });

  it('GIVEN Wordcraft THEN no board size describes a grid the mode ignores', () => {
    const { result } = renderHook(() => useProjectorLobbyMode({ gameCode: 'AB12', classroomGameMode: 'wordcraft', t }));
    expect(factKeys(result.current.facts)).not.toContain('board');
  });

  it('GIVEN a quiz THEN it lists questions and seconds, never a board or a round clock', () => {
    liveGame = { gameMode: 'vocab-quiz', settings: { timerMinutes: 3, vocabQuizQuestionCount: 10, vocabQuizSeconds: 20 } };
    const { result } = renderHook(() => useProjectorLobbyMode({ gameCode: 'AB12', classroomGameMode: 'vocab-quiz', t }));
    expect(factKeys(result.current.facts)).toEqual(['questions', 'seconds', 'late']);
  });

  it('GIVEN the calm dial hides the clock THEN no minutes or seconds are printed', () => {
    liveGame = { gameMode: 'vocab-quiz', settings: { vocabQuizQuestionCount: 10, vocabQuizSeconds: 20, pressure: { timer: 'off' } } };
    const { result } = renderHook(() => useProjectorLobbyMode({ gameCode: 'AB12', classroomGameMode: 'vocab-quiz', t }));
    expect(factKeys(result.current.facts)).toEqual(['questions', 'late']);
  });

  it('GIVEN a fixed-length mode THEN the round length is the length the clock will run', () => {
    liveGame = { gameMode: 'wheel-rush', settings: { timerMinutes: 3 } };
    const { result } = renderHook(() => useProjectorLobbyMode({ gameCode: 'AB12', classroomGameMode: 'wheel-rush', t }));
    expect(result.current.facts[0]).toEqual({ key: 'timer', text: 'eduLiveRoom.lobby.minutes:{"count":1}' });
  });

  it('GIVEN the teacher switches mode in the lobby THEN it reports the switch so the Start label can follow it', () => {
    const { result } = renderHook(() => useProjectorLobbyMode({ gameCode: 'AB12', classroomGameMode: 'classic', t }));
    expect(result.current.switched).toBe(false);
    act(() => result.current.applyMode('vocab-quiz'));
    expect(result.current.switched).toBe(true);
    expect(result.current.isQuiz).toBe(true);
  });

  it('names the class and the lesson the server resolved', () => {
    liveGame = { gameMode: 'classic', classroomName: 'Room 4B', lessonNames: ['Animals', 'Food'], settings: {} };
    const { result } = renderHook(() => useProjectorLobbyMode({ gameCode: 'AB12', t }));
    expect(result.current.className).toBe('Room 4B');
    expect(result.current.lessonNames).toEqual(['Animals', 'Food']);
  });
});
