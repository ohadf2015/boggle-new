import { calculateStars, gameReducer, createInitialState, allObjectivesComplete } from '../adventureGameReducer';
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
  // Each completed objective = 1 star, capped at 3

  it('returns 0 when no objectives completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 50 }),
      makeObjective({ isPrimary: false, target: 10, current: 5 }),
    ];
    expect(calculateStars(objectives)).toBe(0);
  });

  it('returns 0 when only secondary completed (primary missed)', () => {
    // Primary must be complete to earn any stars — prevents 3-star failed levels
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 50 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
    ];
    expect(calculateStars(objectives)).toBe(0);
  });

  it('returns 1 when only primary completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 0 }),
      makeObjective({ isPrimary: false, target: 5, current: 0 }),
      makeObjective({ isPrimary: false, target: 8, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(1);
  });

  it('returns 2 when 2 objectives completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 0 }),
      makeObjective({ isPrimary: false, target: 8, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(2);
  });

  it('returns 3 when 3 or more objectives completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 5 }),
      makeObjective({ isPrimary: false, target: 8, current: 0 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  it('caps at 3 even when 4+ objectives completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
      makeObjective({ isPrimary: false, target: 10, current: 10 }),
      makeObjective({ isPrimary: false, target: 5, current: 5 }),
      makeObjective({ isPrimary: false, target: 8, current: 8 }),
      makeObjective({ isPrimary: false, target: 3, current: 3 }),
    ];
    expect(calculateStars(objectives)).toBe(3);
  });

  it('returns 1 when single objective exists and completed', () => {
    const objectives = [
      makeObjective({ isPrimary: true, target: 100, current: 100 }),
    ];
    expect(calculateStars(objectives)).toBe(1);
  });

  it('returns 0 for empty objectives', () => {
    expect(calculateStars([])).toBe(0);
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

// ==============================================
// AUTO-END WHEN ALL OBJECTIVES COMPLETE
// "If I finished all the relevant quests, the level should end."
// ==============================================

describe('allObjectivesComplete helper', () => {
  it('is true only when every objective meets its target', () => {
    expect(
      allObjectivesComplete([
        makeObjective({ isPrimary: true, target: 100, current: 100 }),
        makeObjective({ isPrimary: false, target: 5, current: 5 }),
      ])
    ).toBe(true);
  });

  it('is false when any objective is still short', () => {
    expect(
      allObjectivesComplete([
        makeObjective({ isPrimary: true, target: 100, current: 100 }),
        makeObjective({ isPrimary: false, target: 5, current: 4 }),
      ])
    ).toBe(false);
  });

  it('is false for an empty objective list (no false-complete)', () => {
    expect(allObjectivesComplete([])).toBe(false);
  });
});

describe('auto-end on all objectives complete', () => {
  const nonBossConfig = {
    world: 1, level: 1, gridSize: 4 as const, timerSeconds: 60,
    isBossLevel: false, specialTiles: [], difficulty: 'EASY' as const,
    chapterNumber: 1, levelInChapter: 1,
    objectives: [
      { type: 'wordCount', target: 2, isPrimary: true },
      { type: 'longWords', target: 1, isPrimary: false },
    ],
  } as LevelConfig;
  const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'A'));

  function play(config: LevelConfig) {
    return gameReducer(createInitialState(config, grid), { type: 'START_GAME' });
  }

  it('ends the level (isComplete + paused + full stars) once every objective is met', () => {
    let state = play(nonBossConfig);
    // wordCount 1/2, longWords 1/1 — primary still short, keep playing
    state = gameReducer(state, {
      type: 'SUBMIT_WORD',
      payload: { word: 'TESTS', score: 50, path: [], detonate: false },
    });
    expect(state.gameState.isComplete).toBe(false);
    expect(state.isPlaying).toBe(true);

    // Second word completes wordCount → all objectives met → auto-end
    state = gameReducer(state, {
      type: 'SUBMIT_WORD',
      payload: { word: 'WORD', score: 50, path: [], detonate: false },
    });
    expect(state.gameState.isComplete).toBe(true);
    expect(state.isPlaying).toBe(false);
    // 1 primary + 1 (only) secondary complete = 2 stars
    expect(state.gameState.stars).toBe(2);
  });

  it('keeps playing while a secondary objective is still open', () => {
    let state = play(nonBossConfig);
    // Two short words: wordCount 2/2 (primary done) but longWords 0/1 still open
    state = gameReducer(state, {
      type: 'SUBMIT_WORD',
      payload: { word: 'CAT', score: 50, path: [], detonate: false },
    });
    state = gameReducer(state, {
      type: 'SUBMIT_WORD',
      payload: { word: 'DOG', score: 50, path: [], detonate: false },
    });
    expect(state.gameState.isComplete).toBe(false);
    expect(state.isPlaying).toBe(true);
  });

  it('auto-ends from UPDATE_OBJECTIVE when it is the last-completing quest', () => {
    const config = {
      ...nonBossConfig,
      objectives: [
        { type: 'wordCount', target: 1, isPrimary: true },
        { type: 'mechanicTrigger', target: 1, isPrimary: false },
      ],
    } as LevelConfig;
    let state = play(config);
    // Clear the primary first
    state = gameReducer(state, {
      type: 'SUBMIT_WORD',
      payload: { word: 'CAT', score: 50, path: [], detonate: false },
    });
    expect(state.gameState.isComplete).toBe(false);

    // mechanicTrigger is the last quest, completed via UPDATE_OBJECTIVE
    state = gameReducer(state, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'mechanicTrigger', value: 1, mode: 'set' },
    });
    expect(state.gameState.isComplete).toBe(true);
    expect(state.isPlaying).toBe(false);
  });

  it('does NOT auto-end on boss levels (boss flow owns the ending)', () => {
    const bossConfig = {
      world: 1, level: 7, gridSize: 5 as const, timerSeconds: 120,
      isBossLevel: true, specialTiles: [], difficulty: 'HARD' as const,
      chapterNumber: 3, levelInChapter: 3,
      objectives: [
        { type: 'defeatBoss', target: 100, isPrimary: true },
        { type: 'mechanicTrigger', target: 1, isPrimary: false },
        { type: 'surviveBattle', target: 50, isPrimary: false },
      ],
    } as LevelConfig;
    const bossGrid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 'A'));
    let state = gameReducer(createInitialState(bossConfig, bossGrid), { type: 'START_GAME' });

    // Force every boss objective complete via UPDATE_OBJECTIVE
    state = gameReducer(state, { type: 'UPDATE_OBJECTIVE', payload: { objectiveType: 'surviveBattle', value: 100, mode: 'set' } });
    state = gameReducer(state, { type: 'UPDATE_OBJECTIVE', payload: { objectiveType: 'mechanicTrigger', value: 1, mode: 'set' } });
    state = gameReducer(state, { type: 'UPDATE_OBJECTIVE', payload: { objectiveType: 'defeatBoss', value: 100, mode: 'set' } });

    // Boss must NOT end via the objective path — its HP/health flow does
    expect(state.gameState.isComplete).toBe(false);
    expect(state.isPlaying).toBe(true);
  });
});

// ==============================================
// TICK, ADD_TIME, ACTIVATE_TIME_FREEZE, USE_SHUFFLE, TIMER_EXPIRED
// ==============================================

describe('TICK action', () => {
  const levelConfig = {
    world: 1, level: 1, gridSize: 4, timerSeconds: 60,
    isBossLevel: false, specialTiles: [], difficulty: 'EASY' as const,
    chapterNumber: 1, levelInChapter: 1,
    objectives: [makeObjective({ isPrimary: true, target: 100 })],
  } as LevelConfig;
  const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'A'));

  it('decrements time by 1 when playing', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const ticked = gameReducer(started, { type: 'TICK' });
    expect(ticked.timeRemaining).toBe(started.timeRemaining - 1);
  });

  it('does nothing when not playing', () => {
    const state = createInitialState(levelConfig, grid);
    const ticked = gameReducer(state, { type: 'TICK' });
    expect(ticked.timeRemaining).toBe(state.timeRemaining);
  });

  it('ends game when time reaches 0', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    // Set time to 1 so next tick = 0
    const nearEnd = { ...started, timeRemaining: 1 };
    const expired = gameReducer(nearEnd, { type: 'TICK' });
    expect(expired.timeRemaining).toBe(0);
    expect(expired.isPlaying).toBe(false);
    expect(expired.gameState.isComplete).toBe(true);
  });

  it('decrements freezeRemaining instead of timer when frozen', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const frozen = gameReducer(started, { type: 'ACTIVATE_TIME_FREEZE', payload: { seconds: 5 } });
    const ticked = gameReducer(frozen, { type: 'TICK' });
    expect(ticked.freezeRemaining).toBe(4);
    expect(ticked.timeRemaining).toBe(started.timeRemaining); // unchanged
  });
});

describe('ADD_TIME action', () => {
  const levelConfig = {
    world: 1, level: 1, gridSize: 4, timerSeconds: 60,
    isBossLevel: false, specialTiles: [], difficulty: 'EASY' as const,
    chapterNumber: 1, levelInChapter: 1,
    objectives: [makeObjective({ isPrimary: true, target: 100 })],
  } as LevelConfig;
  const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'A'));

  it('adds seconds to timer', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, { type: 'ADD_TIME', payload: { seconds: 10 } });
    expect(result.timeRemaining).toBe(started.timeRemaining + 10);
  });

  it('caps at MAX_TIMER_SECONDS (180)', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const highTime = { ...started, timeRemaining: 170 };
    const result = gameReducer(highTime, { type: 'ADD_TIME', payload: { seconds: 999 } });
    expect(result.timeRemaining).toBe(180);
  });

  it('does not go below 0', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, { type: 'ADD_TIME', payload: { seconds: -999 } });
    expect(result.timeRemaining).toBe(0);
  });
});

describe('ACTIVATE_TIME_FREEZE action', () => {
  const levelConfig = {
    world: 1, level: 1, gridSize: 4, timerSeconds: 60,
    isBossLevel: false, specialTiles: [], difficulty: 'EASY' as const,
    chapterNumber: 1, levelInChapter: 1,
    objectives: [makeObjective({ isPrimary: true, target: 100 })],
  } as LevelConfig;
  const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'A'));

  it('sets freezeRemaining and marks freezeUsed', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, { type: 'ACTIVATE_TIME_FREEZE', payload: { seconds: 10 } });
    expect(result.freezeRemaining).toBe(10);
    expect(result.freezeUsed).toBe(true);
  });

  it('is a no-op if already used', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const first = gameReducer(started, { type: 'ACTIVATE_TIME_FREEZE', payload: { seconds: 10 } });
    const second = gameReducer(first, { type: 'ACTIVATE_TIME_FREEZE', payload: { seconds: 5 } });
    expect(second.freezeRemaining).toBe(10); // unchanged
  });
});

describe('USE_SHUFFLE action', () => {
  const levelConfig = {
    world: 1, level: 1, gridSize: 4, timerSeconds: 60,
    isBossLevel: false, specialTiles: [], difficulty: 'EASY' as const,
    chapterNumber: 1, levelInChapter: 1,
    objectives: [makeObjective({ isPrimary: true, target: 100 })],
  } as LevelConfig;
  const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'A'));

  it('decrements shufflesRemaining', () => {
    const state = createInitialState(levelConfig, grid, { shuffleUses: 2 });
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, { type: 'USE_SHUFFLE' });
    expect(result.shufflesRemaining).toBe(1);
  });

  it('is a no-op when no shuffles remaining', () => {
    const state = createInitialState(levelConfig, grid, { shuffleUses: 0 });
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, { type: 'USE_SHUFFLE' });
    expect(result.shufflesRemaining).toBe(0);
  });
});

describe('TIMER_EXPIRED action', () => {
  const levelConfig = {
    world: 1, level: 1, gridSize: 4, timerSeconds: 60,
    isBossLevel: false, specialTiles: [], difficulty: 'EASY' as const,
    chapterNumber: 1, levelInChapter: 1,
    objectives: [makeObjective({ isPrimary: true, target: 100 })],
  } as LevelConfig;
  const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'A'));

  it('ends the game with isComplete=true and calculates stars', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, { type: 'TIMER_EXPIRED' });
    expect(result.timeRemaining).toBe(0);
    expect(result.isPlaying).toBe(false);
    expect(result.gameState.isComplete).toBe(true);
  });
});

describe('SUBMIT_WORD duplicate rejection', () => {
  const levelConfig = {
    world: 1, level: 1, gridSize: 4, timerSeconds: 60,
    isBossLevel: false, specialTiles: [], difficulty: 'EASY' as const,
    chapterNumber: 1, levelInChapter: 1,
    objectives: [{ type: 'wordCount', target: 50, isPrimary: true }],
  } as LevelConfig;
  const grid = [['H', 'E', 'L', 'P'], ['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'I'], ['J', 'K', 'L', 'M']];

  it('rejects duplicate word submission', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const first = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'HELP', score: 20, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }] },
    });
    const scoreBefore = first.gameState.score;
    const second = gameReducer(first, {
      type: 'SUBMIT_WORD',
      payload: { word: 'HELP', score: 20, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }] },
    });
    expect(second.gameState.score).toBe(scoreBefore); // no change
    expect(second.gameState.wordsFound).toHaveLength(1);
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

// ==============================================
// THEMED WORD BONUS (Sprint 2)
// ==============================================

describe('Themed word bonus on SUBMIT_WORD', () => {
  // World 1 themed words include 'BLOOM', 'LEAF', etc. (see themedWords.ts)
  const levelConfig = {
    world: 1,
    level: 1,
    gridSize: 4,
    timerSeconds: 60,
    isBossLevel: false,
    specialTiles: [],
    objectives: [{ type: 'wordCount', target: 50, isPrimary: true }],
    difficulty: 'EASY' as const,
    chapterNumber: 1,
    levelInChapter: 1,
  } as LevelConfig;
  const grid = [
    ['B', 'L', 'O', 'M'],
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
  ];

  it('applies 1.25x bonus multiplier for a themed word', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'BLOOM', score: 100, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 0, col: 3 }] },
    });
    // 100 * 1.25 = 125
    expect(result.gameState.score).toBe(125);
  });

  it('sets lastWordWasThemed to true for a themed word', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'BLOOM', score: 100 },
    });
    expect(result.lastWordWasThemed).toBe(true);
  });

  it('sets lastWordWasThemed to false for a non-themed word', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'BAD', score: 10 },
    });
    expect(result.lastWordWasThemed).toBe(false);
  });

  it('adds themed word to themedWordsFound array', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'BLOOM', score: 100 },
    });
    expect(result.themedWordsFound).toContain('BLOOM');
  });

  it('does not apply bonus for a non-themed word', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'BAD', score: 10 },
    });
    expect(result.gameState.score).toBe(10);
  });

  it('does not apply bonus when world is 0 (invalid)', () => {
    const noWorldConfig = { ...levelConfig, world: 0 };
    const state = createInitialState(noWorldConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'BLOOM', score: 100 },
    });
    expect(result.gameState.score).toBe(100); // no bonus
  });
});

// ==============================================
// UPGRADE TRIGGER TRACKING (Sprint 2)
// ==============================================

describe('upgradeTriggered state tracking', () => {
  const levelConfig = {
    world: 3,
    level: 1,
    gridSize: 4,
    timerSeconds: 60,
    isBossLevel: false,
    specialTiles: [
      { row: 0, col: 0, type: 'ice' as const },
      { row: 0, col: 3, type: 'ice' as const },
    ],
    objectives: [{ type: 'clearIce', target: 5, isPrimary: true }],
    difficulty: 'MEDIUM' as const,
    chapterNumber: 1,
    levelInChapter: 1,
  } as LevelConfig;
  const grid = [
    ['I', 'A', 'B', 'I'],
    ['C', 'D', 'E', 'F'],
    ['G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N'],
  ];

  it('upgradeTriggered is null in initial state', () => {
    const state = createInitialState(levelConfig, grid);
    expect(state.upgradeTriggered).toBeNull();
  });

  it('sets upgradeTriggered when deepDrill upgrade is active and extra ice is cleared', () => {
    // deepDrill T1 or higher: upgradeState.deepDrill >= 1
    // word at (1,1) is adjacent to ice at (0,0) and (0,3) is outside range 1
    // With deepDrill (range stays 1 for now, but we track the trigger when ice is cleared)
    const state = createInitialState(levelConfig, grid, undefined, { deepDrill: 1 });
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      // Path adjacent to ice at (0,0)
      payload: { word: 'CD', score: 10, path: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
    });
    // deepDrill is active, ice was cleared, so upgradeTriggered should be set
    expect(result.upgradeTriggered).not.toBeNull();
    expect(result.upgradeTriggered?.upgradeId).toBe('deepDrill');
    expect(result.upgradeTriggered?.effectValue).toBeGreaterThan(0);
  });

  it('upgradeTriggered is null after non-ice-clearing submission when deepDrill active', () => {
    const state = createInitialState(levelConfig, grid, undefined, { deepDrill: 1 });
    const started = gameReducer(state, { type: 'START_GAME' });
    // Submit word in row 3 — far from ice tiles
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'KL', score: 5, path: [{ row: 3, col: 0 }, { row: 3, col: 1 }] },
    });
    expect(result.upgradeTriggered).toBeNull();
  });

  it('upgradeTriggered is cleared on the next action after being set', () => {
    const state = createInitialState(levelConfig, grid, undefined, { deepDrill: 1 });
    const started = gameReducer(state, { type: 'START_GAME' });
    const triggered = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'CD', score: 10, path: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
    });
    // Verify it was set
    expect(triggered.upgradeTriggered).not.toBeNull();
    // Next action (no ice adjacent) should clear it
    const next = gameReducer(triggered, {
      type: 'SUBMIT_WORD',
      payload: { word: 'KL', score: 5, path: [{ row: 3, col: 0 }, { row: 3, col: 1 }] },
    });
    expect(next.upgradeTriggered).toBeNull();
  });
});

describe('Blast Shield T1 (iceTileReduction) — extended ice melt range', () => {
  const levelConfig = {
    world: 5,
    level: 1,
    gridSize: 5,
    timerSeconds: 120,
    isBossLevel: false,
    specialTiles: [
      { row: 0, col: 0, type: 'ice' as const },
      { row: 0, col: 4, type: 'ice' as const },
    ],
    objectives: [
      { type: 'wordCount', target: 50, isPrimary: true },
    ],
    difficulty: 'MEDIUM' as const,
    chapterNumber: 2,
    levelInChapter: 1,
  } as LevelConfig;

  const grid = [
    ['I', 'C', 'E', 'D', 'F'],
    ['A', 'B', 'C', 'D', 'E'],
    ['F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O'],
    ['P', 'Q', 'R', 'S', 'T'],
  ];

  it('without iceTileReduction, ice at (0,0) does NOT melt from word at row 2', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });

    // Word at (2,2) — 2 tiles away from ice at (0,0)
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'H', score: 5, path: [{ row: 2, col: 2 }] },
    });

    // Ice at (0,0) is 2 tiles away — should NOT melt with default range=1
    expect(result.tiles[0][0].isFrozen).toBe(true);
  });

  it('with iceTileReduction, ice melts at range 2', () => {
    const state = createInitialState(levelConfig, grid, { iceTileReduction: true });
    const started = gameReducer(state, { type: 'START_GAME' });

    // Word at (2,2) — 2 tiles away from ice at (0,0)
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'H', score: 5, path: [{ row: 2, col: 2 }] },
    });

    // Ice at (0,0) is exactly 2 tiles away — should melt with iceTileReduction
    expect(result.tiles[0][0].isFrozen).toBe(false);
    expect(result.tiles[0][0].type).toBe('standard');
  });

  it('ice at distance 3 does not melt even with iceTileReduction', () => {
    const state = createInitialState(levelConfig, grid, { iceTileReduction: true });
    const started = gameReducer(state, { type: 'START_GAME' });

    // Word at (3,3) — 3+ tiles from ice at (0,0)
    const result = gameReducer(started, {
      type: 'SUBMIT_WORD',
      payload: { word: 'N', score: 5, path: [{ row: 3, col: 3 }] },
    });

    expect(result.tiles[0][0].isFrozen).toBe(true);
  });
});

// ==============================================
// COMPLETE_LEVEL action (Sprint 3 backfill — H15)
// ==============================================

describe('COMPLETE_LEVEL action', () => {
  const levelConfig = {
    world: 1, level: 3, gridSize: 4, timerSeconds: 60,
    isBossLevel: false, specialTiles: [], difficulty: 'EASY' as const,
    chapterNumber: 1, levelInChapter: 3,
    objectives: [
      { type: 'scoreTarget', target: 100, isPrimary: true },
      { type: 'timeBonus', target: 30, isPrimary: false },
    ],
  } as LevelConfig;
  const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'A'));

  it('sets isPlaying to false and isComplete to true', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, { type: 'COMPLETE_LEVEL' });
    expect(result.isPlaying).toBe(false);
    expect(result.gameState.isComplete).toBe(true);
  });

  it('finalizes timeBonus objective against timeRemaining', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    // Simulate some time passing — 45 seconds left
    const midGame = { ...started, timeRemaining: 45 };
    const result = gameReducer(midGame, { type: 'COMPLETE_LEVEL' });
    const timeBonus = result.objectives.find(o => o.type === 'timeBonus');
    expect(timeBonus?.current).toBe(45);
    expect(timeBonus?.isComplete).toBe(true); // 45 >= 30 target
  });

  it('timeBonus marked incomplete when time below target', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const lowTime = { ...started, timeRemaining: 10 };
    const result = gameReducer(lowTime, { type: 'COMPLETE_LEVEL' });
    const timeBonus = result.objectives.find(o => o.type === 'timeBonus');
    expect(timeBonus?.current).toBe(10);
    expect(timeBonus?.isComplete).toBe(false); // 10 < 30
  });

  it('calculates stars correctly with all objectives met', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    // Complete primary objective
    const withScore = gameReducer(started, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'scoreTarget', value: 100, mode: 'set' },
    });
    // Leave enough time for timeBonus
    const withTime = { ...withScore, timeRemaining: 40 };
    const result = gameReducer(withTime, { type: 'COMPLETE_LEVEL' });
    expect(result.gameState.stars).toBe(2); // primary + timeBonus secondary
  });

  it('calculates 0 stars when primary not met', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    // Primary scoreTarget not met — current still 0
    const withTime = { ...started, timeRemaining: 40 };
    const result = gameReducer(withTime, { type: 'COMPLETE_LEVEL' });
    expect(result.gameState.stars).toBe(0);
  });

  it('does not affect non-timeBonus objectives', () => {
    const state = createInitialState(levelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const withScore = gameReducer(started, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'scoreTarget', value: 75, mode: 'set' },
    });
    const result = gameReducer(withScore, { type: 'COMPLETE_LEVEL' });
    const scoreObj = result.objectives.find(o => o.type === 'scoreTarget');
    expect(scoreObj?.current).toBe(75); // unchanged
  });
});

// ==============================================
// TAKE_DAMAGE action (Sprint 3 backfill — H15)
// ==============================================

describe('TAKE_DAMAGE action', () => {
  const hpLevelConfig = {
    world: 2, level: 7, gridSize: 5, timerSeconds: 120,
    isBossLevel: true, showBossIntro: true, specialTiles: [],
    difficulty: 'HARD' as const, chapterNumber: 3, levelInChapter: 3,
    lifePoints: 100,
    objectives: [
      { type: 'defeatBoss', target: 100, isPrimary: true },
    ],
  } as LevelConfig;
  const grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 'A'));

  const noHpConfig = {
    world: 1, level: 1, gridSize: 4, timerSeconds: 60,
    isBossLevel: false, specialTiles: [], difficulty: 'EASY' as const,
    chapterNumber: 1, levelInChapter: 1,
    objectives: [makeObjective({ isPrimary: true, target: 100 })],
  } as LevelConfig;
  const smallGrid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'A'));

  it('is a no-op when currentHP is null (no HP system)', () => {
    const state = createInitialState(noHpConfig, smallGrid);
    const started = gameReducer(state, { type: 'START_GAME' });
    expect(started.currentHP).toBeUndefined();
    const result = gameReducer(started, { type: 'TAKE_DAMAGE', payload: { amount: 25 } });
    expect(result).toBe(started); // exact same reference — no-op
  });

  it('reduces HP by damage amount', () => {
    const state = createInitialState(hpLevelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    expect(started.currentHP).toBe(100);
    const result = gameReducer(started, { type: 'TAKE_DAMAGE', payload: { amount: 25 } });
    expect(result.currentHP).toBe(75);
    expect(result.isPlaying).toBe(true);
  });

  it('triggers game over when HP reaches 0', () => {
    const state = createInitialState(hpLevelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, { type: 'TAKE_DAMAGE', payload: { amount: 100 } });
    expect(result.currentHP).toBe(0);
    expect(result.isPlaying).toBe(false);
    expect(result.gameState.isComplete).toBe(true);
  });

  it('clamps HP to 0 when damage exceeds remaining HP', () => {
    const state = createInitialState(hpLevelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const hurt = gameReducer(started, { type: 'TAKE_DAMAGE', payload: { amount: 60 } });
    const overkill = gameReducer(hurt, { type: 'TAKE_DAMAGE', payload: { amount: 999 } });
    expect(overkill.currentHP).toBe(0);
    expect(overkill.isPlaying).toBe(false);
  });

  it('calculates stars at death based on current objective state', () => {
    const state = createInitialState(hpLevelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    // Partially complete boss objective — not enough for star
    const partial = gameReducer(started, {
      type: 'UPDATE_OBJECTIVE',
      payload: { objectiveType: 'defeatBoss', value: 50, mode: 'set' },
    });
    const dead = gameReducer(partial, { type: 'TAKE_DAMAGE', payload: { amount: 100 } });
    expect(dead.gameState.stars).toBe(0); // primary not met
  });
});

// ==============================================
// HEAL action (Sprint 3 backfill — H15)
// ==============================================

describe('HEAL action', () => {
  const hpLevelConfig = {
    world: 2, level: 7, gridSize: 5, timerSeconds: 120,
    isBossLevel: true, showBossIntro: true, specialTiles: [],
    difficulty: 'HARD' as const, chapterNumber: 3, levelInChapter: 3,
    lifePoints: 100,
    objectives: [
      { type: 'defeatBoss', target: 100, isPrimary: true },
    ],
  } as LevelConfig;
  const grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 'A'));

  const noHpConfig = {
    world: 1, level: 1, gridSize: 4, timerSeconds: 60,
    isBossLevel: false, specialTiles: [], difficulty: 'EASY' as const,
    chapterNumber: 1, levelInChapter: 1,
    objectives: [makeObjective({ isPrimary: true, target: 100 })],
  } as LevelConfig;
  const smallGrid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'A'));

  it('is a no-op when HP system absent', () => {
    const state = createInitialState(noHpConfig, smallGrid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, { type: 'HEAL', payload: { amount: 20 } });
    expect(result).toBe(started);
  });

  it('heals HP by given amount', () => {
    const state = createInitialState(hpLevelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const hurt = gameReducer(started, { type: 'TAKE_DAMAGE', payload: { amount: 40 } });
    expect(hurt.currentHP).toBe(60);
    const healed = gameReducer(hurt, { type: 'HEAL', payload: { amount: 20 } });
    expect(healed.currentHP).toBe(80);
  });

  it('clamps HP to maxHP', () => {
    const state = createInitialState(hpLevelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const hurt = gameReducer(started, { type: 'TAKE_DAMAGE', payload: { amount: 10 } });
    const overhealed = gameReducer(hurt, { type: 'HEAL', payload: { amount: 999 } });
    expect(overhealed.currentHP).toBe(100); // clamped to maxHP
  });

  it('does not exceed maxHP when already at full', () => {
    const state = createInitialState(hpLevelConfig, grid);
    const started = gameReducer(state, { type: 'START_GAME' });
    const result = gameReducer(started, { type: 'HEAL', payload: { amount: 50 } });
    expect(result.currentHP).toBe(100);
  });
});
