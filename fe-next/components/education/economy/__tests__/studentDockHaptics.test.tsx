import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const state = {
  word: null as null | { id: number; word: string; points: number; ts: number },
  mode: 'word-hunt' as string | null,
  boss: false,
  student: true,
};
const pulseLive = vi.fn();

vi.mock('@/components/multiplayer/round/useServerFloaters', () => ({ useFreshLastWord: () => state.word }));
vi.mock('@/hooks/gameState/selectors', () => ({ useGameMode: () => state.mode }));
vi.mock('@/stores/classroomBossStore', () => ({ useBossActive: () => state.boss }));
vi.mock('@/lib/education/classroomPlaySurface', () => ({ isClassroomStudentPlay: () => state.student }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [false, vi.fn()] }));
vi.mock('@/lib/education/liveHaptics', async (orig) => ({
  ...(await orig<typeof import('@/lib/education/liveHaptics')>()),
  pulseLive: (...a: unknown[]) => pulseLive(...a),
}));
vi.mock('../ClassroomEconomyDock', () => ({ default: () => <div data-testid="economy-dock" /> }));

import ClassroomStudentDock from '../ClassroomStudentDock';

function accept(id: number, points: number) {
  state.word = { id, word: `w${id}`, points, ts: Date.now() };
}

describe('ClassroomStudentDock haptics', () => {
  beforeEach(() => {
    pulseLive.mockClear();
    Object.assign(state, { word: null, mode: 'word-hunt', boss: false, student: true });
  });

  it('given a word-hunt student, when words land, then the best so far buzzes big and the rest buzz light', () => {
    const { rerender } = render(<ClassroomStudentDock gameCode="ABCD" />);
    accept(1, 5);
    rerender(<ClassroomStudentDock gameCode="ABCD" />);
    accept(2, 3);
    rerender(<ClassroomStudentDock gameCode="ABCD" />);
    expect(pulseLive.mock.calls.map((c) => c[0])).toEqual(['big', 'valid']);
  });

  it('given classic, when a word lands, then the board already buzzes so the dock stays still', () => {
    state.mode = 'classic';
    const { rerender } = render(<ClassroomStudentDock gameCode="ABCD" />);
    accept(1, 5);
    rerender(<ClassroomStudentDock gameCode="ABCD" />);
    expect(pulseLive).not.toHaveBeenCalled();
  });

  it('given blast, when a word lands, then the blast board already buzzes so the dock stays still', () => {
    state.mode = 'blast';
    const { rerender } = render(<ClassroomStudentDock gameCode="ABCD" />);
    accept(1, 5);
    rerender(<ClassroomStudentDock gameCode="ABCD" />);
    expect(pulseLive).not.toHaveBeenCalled();
  });

  it('given a boss round, when a word lands, then the boss strip owns the buzz', () => {
    state.boss = true;
    const { rerender } = render(<ClassroomStudentDock gameCode="ABCD" />);
    accept(1, 5);
    rerender(<ClassroomStudentDock gameCode="ABCD" />);
    expect(pulseLive).not.toHaveBeenCalled();
  });

  it('given a public room player, when a word lands, then nothing buzzes', () => {
    state.student = false;
    const { rerender } = render(<ClassroomStudentDock gameCode="ABCD" />);
    accept(1, 5);
    rerender(<ClassroomStudentDock gameCode="ABCD" />);
    expect(pulseLive).not.toHaveBeenCalled();
  });
});
