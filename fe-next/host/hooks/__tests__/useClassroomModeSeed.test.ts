/**
 * A classroom teacher's lobby is the projector (TvLobbyView → ProjectorLobby):
 * there is no mode picker on it, so the mode the teacher chose in the launch
 * flow must reach `hostSelectedGameMode` — the field the host `startGame` emit
 * reads. It never did: the TV lobby seeded that field from the store default
 * ('random'), the emit carried 'random', and the server rolled a mode. The
 * teacher picked CLASSIC and the class played Word Hunt.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameStore } from '@/hooks/gameState/store';
import { useClassroomModeSeed, classroomBoardMode, __resetClassroomModeSeeds } from '../useClassroomModeSeed';

const hostMode = () => useGameStore.getState().hostSelectedGameMode;

describe('classroomBoardMode', () => {
  it('passes the four board modes through', () => {
    expect(classroomBoardMode('classic')).toBe('classic');
    expect(classroomBoardMode('word-hunt')).toBe('word-hunt');
    expect(classroomBoardMode('blast')).toBe('blast');
    expect(classroomBoardMode('wheel-rush')).toBe('wheel-rush');
  });

  it('returns null for the quiz (the server starts it from the room record) and for nothing', () => {
    expect(classroomBoardMode('vocab-quiz')).toBeNull();
    expect(classroomBoardMode(undefined)).toBeNull();
    expect(classroomBoardMode(null)).toBeNull();
  });
});

describe('useClassroomModeSeed', () => {
  beforeEach(() => {
    __resetClassroomModeSeeds();
    useGameStore.getState().setHostSelectedGameMode('random');
    useGameStore.getState().setGameMode('random');
  });

  it('seeds the host intent with the teacher-chosen CLASSIC so startGame does not roll a random mode', () => {
    // Given the store still holds the default 'random'
    // When the classroom projector lobby mounts for a CLASSIC room
    renderHook(() => useClassroomModeSeed({ isClassroomMode: true, gameCode: 'ABC123', classroomGameMode: 'classic' }));
    // Then the startGame emit's source reads 'classic'
    expect(hostMode()).toBe('classic');
    expect(useGameStore.getState().gameMode).toBe('classic');
  });

  it('overrides a stale mode left in the store by an earlier non-classroom game', () => {
    useGameStore.getState().setHostSelectedGameMode('word-hunt');
    renderHook(() => useClassroomModeSeed({ isClassroomMode: true, gameCode: 'ABC123', classroomGameMode: 'classic' }));
    expect(hostMode()).toBe('classic');
  });

  it('seeds when the classroom mode arrives after mount', () => {
    const { rerender } = renderHook(
      (p: { mode?: 'classic' }) => useClassroomModeSeed({ isClassroomMode: true, gameCode: 'ABC123', classroomGameMode: p.mode }),
      { initialProps: {} }
    );
    expect(hostMode()).toBe('random');
    rerender({ mode: 'classic' });
    expect(hostMode()).toBe('classic');
  });

  it('seeds once per room: a remount after an in-place mode switch keeps the switched mode', () => {
    const first = renderHook(() => useClassroomModeSeed({ isClassroomMode: true, gameCode: 'ABC123', classroomGameMode: 'classic' }));
    first.unmount();
    // The teacher switched the live room to Blast in place (useClassroomModeSwitch writes the store)
    useGameStore.getState().setHostSelectedGameMode('blast');
    // The lobby remounts after the round, still holding the launch-time mode
    renderHook(() => useClassroomModeSeed({ isClassroomMode: true, gameCode: 'ABC123', classroomGameMode: 'classic' }));
    expect(hostMode()).toBe('blast');
  });

  it('leaves a non-classroom lobby and a quiz room alone', () => {
    renderHook(() => useClassroomModeSeed({ isClassroomMode: false, gameCode: 'ABC123', classroomGameMode: 'classic' }));
    expect(hostMode()).toBe('random');
    renderHook(() => useClassroomModeSeed({ isClassroomMode: true, gameCode: 'QUIZ12', classroomGameMode: 'vocab-quiz' }));
    expect(hostMode()).toBe('random');
  });
});
