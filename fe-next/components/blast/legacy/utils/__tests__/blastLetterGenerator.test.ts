import { rollSpecialType } from '../blastLetterGenerator';

describe('rollSpecialType — DDA spawnModifier support', () => {
  beforeEach(() => {
    vi.spyOn(global.Math, 'random');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('without spawnModifier (backward compat)', () => {
    it('returns standard when random() >= specialTileChance', () => {
      (Math.random as jest.Mock).mockReturnValueOnce(0.5);
      const result = rollSpecialType(0.3);
      expect(result).toBe('standard');
    });

    it('returns a special type when random() < specialTileChance', () => {
      // First call: < 0.9 (triggers special), second call: pick distribution
      (Math.random as jest.Mock)
        .mockReturnValueOnce(0.1)  // < 0.9 → go into distribution
        .mockReturnValueOnce(0.0); // picks first type in distribution
      const result = rollSpecialType(0.9);
      expect(result).not.toBe('standard');
    });
  });

  describe('with positive spawnModifier (DDA boost)', () => {
    it('adds modifier to effective chance before the gate check', () => {
      // Base chance = 0.2, modifier = +0.15 → effective = 0.35
      // If random() = 0.30 → without modifier: no special (0.30 >= 0.20)
      //                      with modifier:    special  (0.30 < 0.35)
      (Math.random as jest.Mock)
        .mockReturnValueOnce(0.30) // gate check: < 0.35 → special
        .mockReturnValueOnce(0.0); // distribution pick
      const result = rollSpecialType(0.20, undefined, 0.15);
      expect(result).not.toBe('standard');
    });

    it('stays standard when roll exceeds boosted chance', () => {
      // Base chance = 0.2, modifier = +0.15 → effective = 0.35
      // If random() = 0.40 → still no special
      (Math.random as jest.Mock).mockReturnValueOnce(0.40);
      const result = rollSpecialType(0.20, undefined, 0.15);
      expect(result).toBe('standard');
    });
  });

  describe('with negative spawnModifier (DDA normalization)', () => {
    it('subtracts modifier from effective chance', () => {
      // Base chance = 0.5, modifier = -0.10 → effective = 0.40
      // If random() = 0.45 → without modifier: special (0.45 < 0.50)
      //                       with modifier:   standard (0.45 >= 0.40)
      (Math.random as jest.Mock).mockReturnValueOnce(0.45);
      const result = rollSpecialType(0.50, undefined, -0.10);
      expect(result).toBe('standard');
    });
  });

  describe('clamping', () => {
    it('clamps effective chance to minimum 0.05', () => {
      // Base = 0.0, modifier = -0.99 → would be -0.99 but clamps to 0.05
      // random() = 0.03 < 0.05 → special (only passes because floor is 0.05)
      (Math.random as jest.Mock)
        .mockReturnValueOnce(0.03)
        .mockReturnValueOnce(0.0);
      const result = rollSpecialType(0.0, undefined, -0.99);
      expect(result).not.toBe('standard');
    });

    it('clamps effective chance to maximum 0.95', () => {
      // Base = 1.0, modifier = +0.99 → would be 1.99 but clamps to 0.95
      // random() = 0.96 >= 0.95 → standard (the ceiling prevents 100% special)
      (Math.random as jest.Mock).mockReturnValueOnce(0.96);
      const result = rollSpecialType(1.0, undefined, 0.99);
      expect(result).toBe('standard');
    });
  });

  describe('zero modifier behaves identically to no modifier', () => {
    it('returns standard when roll exceeds base chance with zero modifier', () => {
      (Math.random as jest.Mock).mockReturnValueOnce(0.5);
      const result = rollSpecialType(0.3, undefined, 0);
      expect(result).toBe('standard');
    });
  });
});
