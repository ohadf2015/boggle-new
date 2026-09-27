import { describe, it, expect } from 'vitest';
import { KONAMI_SEQUENCE, advanceKonami } from '@/utils/konamiSequence';

/** Helper: feed a list of keys through the reducer, return final state. */
function feed(keys: string[]) {
  let progress = 0;
  let matched = false;
  for (const k of keys) {
    const r = advanceKonami(progress, k);
    progress = r.progress;
    matched = r.matched;
  }
  return { progress, matched };
}

describe('advanceKonami', () => {
  it('matches the full Konami code (case-insensitive B/A)', () => {
    const keys = [...KONAMI_SEQUENCE.slice(0, 8), 'B', 'A']; // shift-held letters
    expect(feed(keys).matched).toBe(true);
  });

  it('does not match on a partial sequence', () => {
    expect(feed(KONAMI_SEQUENCE.slice(0, 9)).matched).toBe(false);
  });

  it('resets progress to 0 on the full match (re-armable)', () => {
    const { progress, matched } = feed(KONAMI_SEQUENCE);
    expect(matched).toBe(true);
    expect(progress).toBe(0);
  });

  it('resets on a wrong key mid-sequence', () => {
    const r = feed(['ArrowUp', 'ArrowUp', 'x']);
    expect(r.matched).toBe(false);
    expect(r.progress).toBe(0);
  });

  it('forgives a restart: a wrong key that equals the first step keeps progress at 1', () => {
    // Up, Up, Up -> 3rd Up mismatches (expected Down) but is itself step 0 -> progress 1
    const r = feed(['ArrowUp', 'ArrowUp', 'ArrowUp']);
    expect(r.progress).toBe(1);
    expect(r.matched).toBe(false);
  });

  it('matches even after a failed earlier attempt', () => {
    const keys = ['ArrowDown', 'x', ...KONAMI_SEQUENCE]; // junk then the real code
    expect(feed(keys).matched).toBe(true);
  });

  it('matched is only true on the exact final keypress, not before', () => {
    let everEarly = false;
    let progress = 0;
    KONAMI_SEQUENCE.forEach((k, i) => {
      const r = advanceKonami(progress, k);
      progress = r.progress;
      if (i < KONAMI_SEQUENCE.length - 1 && r.matched) everEarly = true;
    });
    expect(everEarly).toBe(false);
  });
});
