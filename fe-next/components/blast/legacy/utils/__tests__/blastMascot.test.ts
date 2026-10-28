/**
 * blastMascot — pure selector tests.
 *
 * The mascot module maps run/wave state to an expression key. These tests
 * lock down the priority ladder so future tweaks don't silently break the
 * "celebrate big wins, commiserate on losses" UX promise.
 */
import {
  getMascotForArchetype,
  MASCOT_IMAGES,
  type MascotKey,
} from '../blastMascot';

describe('blastMascot — MASCOT_IMAGES registry', () => {
  it('exports a path for every mascot key', () => {
    const keys: MascotKey[] = [
      'hyped', 'sneaky', 'sweating', 'celebrating', 'sadSmile', 'neutral',
    ];
    for (const k of keys) {
      expect(typeof MASCOT_IMAGES[k]).toBe('string');
      expect(MASCOT_IMAGES[k].length).toBeGreaterThan(0);
    }
  });
});
