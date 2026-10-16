import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

let liveGame: Record<string, unknown> | null = null;
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => liveGame }));
vi.mock('@/components/education/projector/ProjectorQuizBlocked', () => ({ useQuizStartRefused: () => [false, vi.fn()] }));
let localMode: string | null = null;
vi.mock('@/components/education/lobby/useClassroomModeSwitch', () => ({ readLocalGameMode: () => localMode }));

import { useEduLobbyMode } from '../useEduLobbyMode';

const t = (k: string) => k;

describe('useEduLobbyMode — Boss Battle survives GO LIVE', () => {
  beforeEach(() => {
    sessionStorage.clear();
    liveGame = null;
    localMode = null;
  });

  it('GIVEN the teacher went live with Boss Battle WHEN the projector lobby opens THEN it reads Boss Battle, not Classic', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'classic', classroomBossId: 'lexiconDragon' }));
    localMode = 'classic';
    const { result } = renderHook(() => useEduLobbyMode({ gameCode: 'AB12', classroomGameMode: 'classic', t }));
    expect(result.current.modeId).toBe('boss-battle');
  });

  it('GIVEN no local launch data WHEN the room record carries a boss THEN the lobby reads Boss Battle', () => {
    liveGame = { gameMode: 'classic', settings: { classroomBossId: 'lexiconDragon', timerMinutes: 3 } };
    const { result } = renderHook(() => useEduLobbyMode({ gameCode: 'AB12', t }));
    expect(result.current.modeId).toBe('boss-battle');
  });

  it('GIVEN a plain Classic launch WHEN the lobby opens THEN it stays Classic', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'classic' }));
    localMode = 'classic';
    const { result } = renderHook(() => useEduLobbyMode({ gameCode: 'AB12', classroomGameMode: 'classic', t }));
    expect(result.current.modeId).toBe('classic');
  });
});
