import { createSeededRandom, generateParticleArray } from '../utils/seededRandom';

describe('createSeededRandom', () => {
  it('should produce deterministic output for same seed', () => {
    const rand1 = createSeededRandom(42);
    const rand2 = createSeededRandom(42);

    const values1 = Array.from({ length: 10 }, () => rand1());
    const values2 = Array.from({ length: 10 }, () => rand2());

    expect(values1).toEqual(values2);
  });

  it('should produce different output for different seeds', () => {
    const rand1 = createSeededRandom(42);
    const rand2 = createSeededRandom(123);

    const values1 = Array.from({ length: 10 }, () => rand1());
    const values2 = Array.from({ length: 10 }, () => rand2());

    expect(values1).not.toEqual(values2);
  });

  it('should return values in [0, 1) range', () => {
    const rand = createSeededRandom(999);
    const values = Array.from({ length: 1000 }, () => rand());

    values.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });
  });

  it('should produce varied distribution', () => {
    const rand = createSeededRandom(42);
    const values = Array.from({ length: 100 }, () => rand());
    const unique = new Set(values);
    // Should have high variance - at least 95 unique values out of 100
    expect(unique.size).toBeGreaterThan(95);
  });
});

describe('generateParticleArray', () => {
  it('should generate correct number of particles', () => {
    const particles = generateParticleArray(20, 1280, 720);
    expect(particles).toHaveLength(20);
  });

  it('should assign sequential ids', () => {
    const particles = generateParticleArray(5, 1280, 720);
    expect(particles.map((p) => p.id)).toEqual([0, 1, 2, 3, 4]);
  });

  it('should generate positions within bounds', () => {
    const width = 1280;
    const height = 720;
    const particles = generateParticleArray(50, width, height);

    particles.forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(height);
    });
  });

  it('should respect size range', () => {
    const particles = generateParticleArray(50, 1280, 720, 42, [10, 30]);

    particles.forEach((p) => {
      expect(p.size).toBeGreaterThanOrEqual(10);
      expect(p.size).toBeLessThan(30);
    });
  });

  it('should be deterministic with same seed', () => {
    const a = generateParticleArray(10, 1280, 720, 42);
    const b = generateParticleArray(10, 1280, 720, 42);
    expect(a).toEqual(b);
  });

  it('should differ with different seeds', () => {
    const a = generateParticleArray(10, 1280, 720, 42);
    const b = generateParticleArray(10, 1280, 720, 99);
    expect(a).not.toEqual(b);
  });
});
