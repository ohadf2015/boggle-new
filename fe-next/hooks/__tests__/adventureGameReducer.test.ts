import { calculateStars, gameReducer, createInitialState } from '../adventureGameReducer';
import type { LevelObjective, LevelConfig } from '../../types/adventure';

function makeObjective(
  overrides: Partial<LevelObjective> & { isPrimary: boolean }
): LevelObjective {
  return {
    type: 'scoreTarget',
    target: 100,
    current: 0,
    isComplete: false,
    ...overrides,
  };
}

describe('calculateStars', () => {
  // --- Existing behavior (should not change) ---

  it('returns 0 when primary objective is not met', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 50 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
    ];
    expect(calculateStars(objectives)).toBe(0);
  });

  it('returns 1 when primary met but no secondaries completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 0 }),
      makeObjective({ isPrimary: false, target: 5, current: 0 }),
      makeObjective({ isPrimary: false, target: 8, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(1);
  });

  it('returns 2 when primary met and 1 secondary completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 0 }),
      makeObjective({ isPrimary: false, target: 8, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(2);
  });

  it('returns 3 when primary met and ALL secondaries completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 5 }),
      makeObjective({ isPrimary: false, target: 8, current: 8 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  // --- New behavior: 3 stars with 2+ secondaries completed (when 3+ exist) ---

  it('returns 3 when primary met and 2 of 3 secondaries completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 5 }),
      makeObjective({ isPrimary: false, target: 8, current: 0 }), // impossible one
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  it('returns 3 when primary met and 3 of 4 secondaries completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 5 }),
      makeObjective({ isPrimary: false, target: 8, current: 8 }),
      makeObjective({ isPrimary: false, target: 3, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  // --- Edge: only 1 or 2 secondaries require ALL for 3 stars ---

  it('returns 2 (not 3) when only 1 secondary exists and it is not completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(1);
  });

  it('returns 3 when only 1 secondary exists and it IS completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  it('returns 3 when only 2 secondaries exist and both completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 5 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  it('returns 2 when only 2 secondaries exist and only 1 completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(2);
  });

  // --- Edge: no secondaries ---

  it('returns 3 when primary met and no secondaries exist', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });
});

describe('UPDATE_OBJECTIVE action', () => {
  const bossLevelConfig = {
    world: 2,
    level: 7,
    gridSize: 5 as const,
    timerSeconds: 120,
    difficulty: 'HARD' as const,
    chapterNumber: 3 as const,
    levelInChapter: 3 as const,
    isBossLevel: true,
    showBossIntro: true,
    specialTiles: [],
    objectives: [
      { type: 'defeatBoss', target: 100, isPrimary: true },
      { type: 'mechanicTrigger', target: 3, isPrimary: false },
      { type: 'surviveBattle', target: 50, isPrimary: false },
    ],
  } as LevelConfig;

  const grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 'A'));

  function createBossState() {
    const state = createInitialState(bossLevelConfig, grid);
    // Start the game so isPlaying = true
    return gameReducer(state, { type: 'START_GAME' });
  }

  it('updates defeatBoss objective with SET mode', () => {
    const state = createBossState();
    const result = gameReducer(state, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'defeatBoss', value: 75, mode: 'set' },
    });
    const obj = result.objectives.find(o => o.type === 'defeatBoss');
    expect(obj?.current).toBe(75);
    expect(obj?.isComplete).toBe(false);
  });

  it('marks defeatBoss complete when value reaches target', () => {
    const state = createBossState();
    const result = gameReducer(state, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'defeatBoss', value: 100, mode: 'set' },
    });
    const obj = result.objectives.find(o => o.type === 'defeatBoss');
    expect(obj?.current).toBe(100);
    expect(obj?.isComplete).toBe(true);
  });

  it('increments mechanicTrigger objective with INCREMENT mode', () => {
    const state = createBossState();
    const s1 = gameReducer(state, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'mechanicTrigger', value: 1, mode: 'increment' },
    });
    const s2 = gameReducer(s1, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'mechanicTrigger', value: 1, mode: 'increment' },
    });
    const obj = s2.objectives.find(o => o.type === 'mechanicTrigger');
    expect(obj?.current).toBe(2);
    expect(obj?.isComplete).toBe(false);
  });

  it('marks mechanicTrigger complete at target', () => {
    let state = createBossState();
    for (let i = 0; i < 3; i++) {
      state = gameReducer(state, {
        type: 'UPDATE_OBJECTIVE',
        payload: { objectiveType: 'mechanicTrigger', value: 1, mode: 'increment' },
      });
    }
    const obj = state.objectives.find(o => o.type === 'mechanicTrigger');
    expect(obj?.current).toBe(3);
    expect(obj?.isComplete).toBe(true);
  });

  it('updates surviveBattle with SET mode (health percentage)', () => {
    const state = createBossState();
    const result = gameReducer(state, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'surviveBattle', value: 80, mode: 'set' },
    });
    const obj = result.objectives.find(o => o.type === 'surviveBattle');
    expect(obj?.current).toBe(80);
    expect(obj?.isComplete).toBe(true); // 80 >= 50 target
  });

  it('does not affect unrelated objectives', () => {
    const state = createBossState();
    const result = gameReducer(state, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'defeatBoss', value: 50, mode: 'set' },
    });
    const mechObj = result.objectives.find(o => o.type === 'mechanicTrigger');
    expect(mechObj?.current).toBe(0);
  });

  it('is a no-op when objective type does not exist', () => {
    const state = createBossState();
    const result = gameReducer(state, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'collectGems', value: 5, mode: 'increment' },
    });
    expect(result.objectives).toEqual(state.objectives);
  });
});

describe('SUBMIT_WORD with detonate (Word Dynamite T3)', () => {
  const levelConfig = {
    world: 5,
    level: 3,
    gridSize: 4,
    timerSeconds: 120,
    isBossLevel: false,
    specialTiles: [],
    objectives: [
      { type: 'wordCount', target: 50, isPrimary: true },
    ],
    difficulty: 'MEDIUM' as const,
    chapterNumber: 2,
    levelInChapter: 1,
  } as LevelConfig;

  const grid = [
    ['H', 'E', 'L', 'P'],
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'I'],
    ['J', 'K', 'L', 'M'],
  ];

  function createDetonateState() {
    const state = createInitialState(levelConfig, grid);
    return gameReducer(state, { type: 'START_GAME' });
  }

  it('should clear adjacent tiles when detonate is true', () => {
    const state = createDetonateState();
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }]; // HE

    const result = gameReducer(state, {
      type: 'SUBMIT_WORD',
      payload: { word: 'HE', score: 10, path, detonate: true },
    });

    // Adjacent tiles should be cleared with explode effect
    expect(result.tiles[1][0].isCleared).toBe(true); // below H
    expect(result.tiles[1][1].isCleared).toBe(true); // below E
    expect(result.tiles[0][2].isCleared).toBe(true); // right of E

    // Detonated tiles should have explode effect
    expect(result.tiles[1][0].activationEffect).toBe('explode');
    expect(result.tiles[1][1].activationEffect).toBe('explode');
  });

  it('should not clear adjacent tiles when detonate is false', () => {
    const state = createDetonateState();
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }]; // HE

    const result = gameReducer(state, {
      type: 'SUBMIT_WORD',
      payload: { word: 'HE', score: 10, path, detonate: false },
    });

    // Adjacent tiles should NOT be cleared
    expect(result.tiles[1][0].isCleared).toBe(false);
    expect(result.tiles[1][1].isCleared).toBe(false);
  });

  it('should add bonus score for detonated tiles', () => {
    const state = createDetonateState();
    const path = [{ row: 1, col: 1 }]; // B (center-ish for max adjacents)

    const result = gameReducer(state, {
      type: 'SUBMIT_WORD',
      payload: { word: 'B', score: 10, path, detonate: true },
    });

    // B at (1,1) has 8 adjacent tiles, all should be detonated
    // Score should be base + 8 * 10 = 10 + 80 = 90
    expect(result.gameState.score).toBe(90);
  });
});
