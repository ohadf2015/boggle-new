import { describe, it, expect } from 'vitest';
import { ROOM_R1_1 } from '../r1.1';

describe('ROOM_R1_1', () => {
  it('has id r1.1, single beat, sequential, all-beats exit', () => {
    expect(ROOM_R1_1.id).toBe('r1.1');
    expect(ROOM_R1_1.beats).toHaveLength(1);
    expect(ROOM_R1_1.beatOrder).toBe('sequential');
    expect(ROOM_R1_1.exitCondition).toBe('all-beats');
  });

  it('open-door beat has 2 scene objects scattering clues', () => {
    const beat = ROOM_R1_1.beats[0];
    expect(beat.id).toBe('open-door');
    expect(beat.hint.objects).toHaveLength(2);
    const ids = beat.hint.objects.map((o) => o.sceneObjectId);
    expect(ids).toEqual(expect.arrayContaining(['door', 'lantern']));
  });

  it('grid is size-3 anytap pangram with single target אש and name-male gate', () => {
    const grid = ROOM_R1_1.beats[0].grid;
    expect(grid.size).toBe(3);
    expect(grid.traversal).toBe('anytap');
    expect(grid.letterSource).toBe('pangram');
    expect(grid.targets).toEqual([{ word: 'אש' }]);
    expect(grid.semanticGate?.class).toBe('name-male');
  });

  it('onSolve unlocks the door', () => {
    expect(ROOM_R1_1.beats[0].onSolve.unlocksDoor).toBe(true);
  });
});
