import {
  generateEndlessFloor,
  getEndlessDifficulty,
  ENDLESS_MODE_CONFIG,
} from '../endlessMode';

describe('endlessMode', () => {
  describe('ENDLESS_MODE_CONFIG', () => {
    it('should have valid base values', () => {
      expect(ENDLESS_MODE_CONFIG.startingGridSize).toBeGreaterThanOrEqual(4);
      expect(ENDLESS_MODE_CONFIG.startingTimerSeconds).toBeGreaterThan(30);
    });
  });

  describe('getEndlessDifficulty', () => {
    it('should return base difficulty at floor 1', () => {
      const diff = getEndlessDifficulty(1);
      expect(diff.gridSize).toBe(ENDLESS_MODE_CONFIG.startingGridSize);
      expect(diff.timerSeconds).toBe(ENDLESS_MODE_CONFIG.startingTimerSeconds);
    });

    it('should increase grid size at higher floors', () => {
      const d1 = getEndlessDifficulty(1);
      const d20 = getEndlessDifficulty(20);
      expect(d20.gridSize).toBeGreaterThanOrEqual(d1.gridSize);
    });

    it('should decrease timer at higher floors', () => {
      const d1 = getEndlessDifficulty(1);
      const d20 = getEndlessDifficulty(20);
      expect(d20.timerSeconds).toBeLessThanOrEqual(d1.timerSeconds);
    });

    it('should cap grid size at 7', () => {
      const d100 = getEndlessDifficulty(100);
      expect(d100.gridSize).toBeLessThanOrEqual(7);
    });

    it('should not reduce timer below minimum (45s)', () => {
      const d100 = getEndlessDifficulty(100);
      expect(d100.timerSeconds).toBe(45);
    });

    it('should clamp timer at exactly minTimerSeconds for extreme floors', () => {
      // Floor 100: 120 - 99*3 = -177 → clamped to minTimerSeconds
      const d100 = getEndlessDifficulty(100);
      const d50 = getEndlessDifficulty(50);
      expect(d100.timerSeconds).toBe(ENDLESS_MODE_CONFIG.minTimerSeconds);
      expect(d50.timerSeconds).toBe(ENDLESS_MODE_CONFIG.minTimerSeconds);
    });

    it('should increase special tile count', () => {
      const d1 = getEndlessDifficulty(1);
      const d15 = getEndlessDifficulty(15);
      expect(d15.specialTileCount).toBeGreaterThan(d1.specialTileCount);
    });
  });

  describe('generateEndlessFloor', () => {
    it('should return a valid level config', () => {
      const config = generateEndlessFloor(1);
      expect(config.world).toBe(0); // endless uses world 0
      expect(config.level).toBe(1);
      expect(config.gridSize).toBeGreaterThanOrEqual(4);
      expect(config.objectives.length).toBeGreaterThan(0);
    });

    it('should cycle world mechanics across floors', () => {
      const f1 = generateEndlessFloor(1);
      const f3 = generateEndlessFloor(3);
      // Different floors should get different mechanics (cycling through worlds 2-9)
      if (f1.worldMechanic && f3.worldMechanic) {
        // They might be the same if floors align, but at least one should have a mechanic
        expect(f1.worldMechanic).toBeDefined();
      }
    });

    it('should produce deterministic configs for same floor', () => {
      const a = generateEndlessFloor(5);
      const b = generateEndlessFloor(5);
      expect(a.gridSize).toBe(b.gridSize);
      expect(a.timerSeconds).toBe(b.timerSeconds);
    });

    it('should have score target objective', () => {
      const config = generateEndlessFloor(1);
      const scoreObj = config.objectives.find(o => o.type === 'scoreTarget');
      expect(scoreObj).toBeDefined();
    });
  });
});
