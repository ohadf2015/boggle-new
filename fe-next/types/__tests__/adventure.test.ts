/**
 * Adventure Mode Types Tests
 *
 * TDD RED Phase: These tests define the contract for adventure mode types.
 * Tests validate type structure and constraints before implementation.
 */

import {
  WORLD_NAMES,
  TileType,
  TileState,
  SpecialTile,
  ObjectiveType,
  LevelObjective,
  LevelConfig,
  LevelCompletion,
  PlayerProgression,
  AdventureGameState,
  WorldName,
} from '../adventure';

describe('Adventure Types', () => {
  describe('TileType', () => {
    it('should accept valid tile type values', () => {
      const validTypes: TileType[] = ['standard', 'gold', 'ice', 'bomb', 'time'];
      expect(validTypes).toHaveLength(5);
      validTypes.forEach((type) => {
        expect(['standard', 'gold', 'ice', 'bomb', 'time']).toContain(type);
      });
    });
  });

  describe('TileState', () => {
    it('should have required letter and type fields', () => {
      const tile: TileState = {
        letter: 'A',
        type: 'standard',
        isCleared: false,
      };
      expect(tile.letter).toBe('A');
      expect(tile.type).toBe('standard');
      expect(tile.isCleared).toBe(false);
    });

    it('should support optional cascade delay', () => {
      const tile: TileState = {
        letter: 'B',
        type: 'gold',
        isCleared: true,
        cascadeDelay: 100,
      };
      expect(tile.cascadeDelay).toBe(100);
    });

    it('should support optional frozen state for ice tiles', () => {
      const tile: TileState = {
        letter: 'C',
        type: 'ice',
        isCleared: false,
        isFrozen: true,
      };
      expect(tile.isFrozen).toBe(true);
    });
  });

  describe('SpecialTile', () => {
    it('should define position and type', () => {
      const specialTile: SpecialTile = {
        row: 2,
        col: 3,
        type: 'gold',
      };
      expect(specialTile.row).toBe(2);
      expect(specialTile.col).toBe(3);
      expect(specialTile.type).toBe('gold');
    });
  });

  describe('ObjectiveType', () => {
    it('should accept valid objective types', () => {
      const validObjectives: ObjectiveType[] = [
        'wordCount',
        'scoreTarget',
        'clearIce',
        'longWords',
        'timeBonus',
        'collectGems',
      ];
      expect(validObjectives).toHaveLength(6);
    });
  });

  describe('LevelObjective', () => {
    it('should have type and target', () => {
      const objective: LevelObjective = {
        type: 'wordCount',
        target: 10,
      };
      expect(objective.type).toBe('wordCount');
      expect(objective.target).toBe(10);
    });

    it('should support tracking current progress', () => {
      const objective: LevelObjective = {
        type: 'scoreTarget',
        target: 500,
        current: 250,
        isComplete: false,
      };
      expect(objective.current).toBe(250);
      expect(objective.isComplete).toBe(false);
    });

    it('should support primary objective marker', () => {
      const objective: LevelObjective = {
        type: 'clearIce',
        target: 5,
        isPrimary: true,
      };
      expect(objective.isPrimary).toBe(true);
    });
  });

  describe('LevelConfig', () => {
    it('should require all mandatory fields', () => {
      const config: LevelConfig = {
        world: 1,
        level: 1,
        gridSize: 5,
        timerSeconds: 90,
        objectives: [{ type: 'wordCount', target: 10 }],
        specialTiles: [],
        difficulty: 'MEDIUM',
        chapterNumber: 1,
        levelInChapter: 1,
        isBossLevel: false,
      };
      expect(config.world).toBe(1);
      expect(config.level).toBe(1);
      expect(config.gridSize).toBe(5);
      expect(config.timerSeconds).toBe(90);
      expect(config.objectives).toHaveLength(1);
      expect(config.specialTiles).toHaveLength(0);
      expect(config.difficulty).toBe('MEDIUM');
    });

    it('should support optional hidden word', () => {
      const config: LevelConfig = {
        world: 2,
        level: 5,
        gridSize: 6,
        timerSeconds: 120,
        objectives: [{ type: 'scoreTarget', target: 300 }],
        specialTiles: [{ row: 0, col: 0, type: 'gold' }],
        difficulty: 'HARD',
        hiddenWord: 'LEXICON',
        chapterNumber: 2,
        levelInChapter: 2,
        isBossLevel: false,
      };
      expect(config.hiddenWord).toBe('LEXICON');
    });

    it('should support world mechanic identifier', () => {
      const config: LevelConfig = {
        world: 3,
        level: 1,
        gridSize: 5,
        timerSeconds: 90,
        objectives: [{ type: 'clearIce', target: 3 }],
        specialTiles: [],
        difficulty: 'EASY',
        worldMechanic: 'rootCaverns',
        chapterNumber: 1,
        levelInChapter: 1,
        isBossLevel: false,
      };
      expect(config.worldMechanic).toBe('rootCaverns');
    });

    it('should only accept valid grid sizes', () => {
      const validSizes: Array<4 | 5 | 6 | 7> = [4, 5, 6, 7];
      validSizes.forEach((size) => {
        const config: LevelConfig = {
          world: 1,
          level: 1,
          gridSize: size,
          timerSeconds: 90,
          objectives: [],
          specialTiles: [],
          difficulty: 'MEDIUM',
          chapterNumber: 1,
          levelInChapter: 1,
          isBossLevel: false,
        };
        expect(config.gridSize).toBe(size);
      });
    });

    it('should only accept valid difficulty values', () => {
      const validDifficulties: Array<'EASY' | 'MEDIUM' | 'HARD'> = ['EASY', 'MEDIUM', 'HARD'];
      validDifficulties.forEach((difficulty) => {
        const config: LevelConfig = {
          world: 1,
          level: 1,
          gridSize: 5,
          timerSeconds: 90,
          objectives: [],
          specialTiles: [],
          difficulty,
          chapterNumber: 1,
          levelInChapter: 1,
          isBossLevel: false,
        };
        expect(config.difficulty).toBe(difficulty);
      });
    });
  });

  describe('LevelCompletion', () => {
    it('should track completion data', () => {
      const completion: LevelCompletion = {
        world: 1,
        level: 1,
        stars: 2,
        bestScore: 450,
        bestWords: 15,
        completedAt: new Date().toISOString(),
      };
      expect(completion.world).toBe(1);
      expect(completion.level).toBe(1);
      expect(completion.stars).toBe(2);
      expect(completion.bestScore).toBe(450);
      expect(completion.bestWords).toBe(15);
      expect(completion.completedAt).toBeDefined();
    });

    it('should only accept valid star values', () => {
      const validStars: Array<0 | 1 | 2 | 3> = [0, 1, 2, 3];
      validStars.forEach((stars) => {
        const completion: LevelCompletion = {
          world: 1,
          level: 1,
          stars,
          bestScore: 100,
          bestWords: 5,
          completedAt: new Date().toISOString(),
        };
        expect(completion.stars).toBeGreaterThanOrEqual(0);
        expect(completion.stars).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('PlayerProgression', () => {
    it('should track full player progress', () => {
      const progression: PlayerProgression = {
        userId: 'user-123',
        playerLevel: 5,
        xp: 1250,
        currentWorld: 2,
        currentLevel: 3,
        totalStars: 24,
        gold: 150,
        upgrades: { timeBonus: 1, scoreBonus: 0, xpBonus: 0 },
        skillPoints: 0,
        skillTree: {},
        runeFragments: 5,
        runes: [{ runeId: 'rune-swiftword', equipped: true }],
        completions: [
          {
            world: 1,
            level: 1,
            stars: 3,
            bestScore: 500,
            bestWords: 20,
            completedAt: '2024-01-15T10:00:00Z',
          },
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };
      expect(progression.userId).toBe('user-123');
      expect(progression.playerLevel).toBe(5);
      expect(progression.xp).toBe(1250);
      expect(progression.currentWorld).toBe(2);
      expect(progression.currentLevel).toBe(3);
      expect(progression.totalStars).toBe(24);
      expect(progression.completions).toHaveLength(1);
    });
  });

  describe('AdventureGameState', () => {
    it('should contain all game state fields', () => {
      const gameState: AdventureGameState = {
        levelConfig: {
          world: 1,
          level: 1,
          gridSize: 5,
          timerSeconds: 90,
          objectives: [{ type: 'wordCount', target: 10, current: 3, isComplete: false }],
          specialTiles: [],
          difficulty: 'MEDIUM',
          chapterNumber: 1,
          levelInChapter: 1,
          isBossLevel: false,
        },
        tiles: [
          [
            { letter: 'A', type: 'standard', isCleared: false },
            { letter: 'B', type: 'gold', isCleared: false },
          ],
        ],
        score: 150,
        wordsFound: ['CAT', 'DOG'],
        objectives: [{ type: 'wordCount', target: 10, current: 3, isComplete: false }],
        comboCount: 2,
        cascadeActive: false,
        isComplete: false,
        stars: 0,
      };
      expect(gameState.levelConfig).toBeDefined();
      expect(gameState.tiles).toHaveLength(1);
      expect(gameState.score).toBe(150);
      expect(gameState.wordsFound).toHaveLength(2);
      expect(gameState.comboCount).toBe(2);
      expect(gameState.cascadeActive).toBe(false);
      expect(gameState.isComplete).toBe(false);
      expect(gameState.stars).toBe(0);
    });
  });

  describe('WORLD_NAMES', () => {
    it('should have 10 world names', () => {
      expect(WORLD_NAMES).toHaveLength(10);
    });

    it('should contain all expected world names', () => {
      const expectedNames = [
        'alphabetMeadows',
        'synonymSprings',
        'rootCaverns',
        'idiomArchipelago',
        'compoundCanyon',
        'anagramLabyrinth',
        'mirrorPalace',
        'neologismNebula',
        'polyglotPeaks',
        'lexiconThrone',
      ];
      expectedNames.forEach((name) => {
        expect(WORLD_NAMES).toContain(name);
      });
    });
  });

  describe('WorldName', () => {
    it('should accept valid world names', () => {
      const worldName: WorldName = 'alphabetMeadows';
      expect(worldName).toBe('alphabetMeadows');
    });
  });
});
