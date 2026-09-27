import { describe, it, expect, beforeEach } from 'vitest';
import {
  unseenSkinIds,
  readSeenSkins,
  markSkinsSeen,
  SEEN_SKINS_STORAGE_KEY,
} from '../menuNotice';

describe('unseenSkinIds', () => {
  it('is empty at zero height (only the default skin is unlocked, and it is never news)', () => {
    expect(unseenSkinIds(0, [])).toEqual([]);
  });

  it('reports a skin unlocked by a new personal best', () => {
    // 120m clears the first height-gated skin (copper).
    const unseen = unseenSkinIds(150, []);
    expect(unseen.length).toBeGreaterThan(0);
    expect(unseen).not.toContain('classic');
  });

  it('stops reporting a skin once it has been seen', () => {
    const unseen = unseenSkinIds(150, []);
    expect(unseenSkinIds(150, unseen)).toEqual([]);
  });

  it('reports only the NEWLY unlocked skin when the earlier ones are seen', () => {
    const early = unseenSkinIds(150, []);
    const later = unseenSkinIds(100000, early);
    expect(later.length).toBeGreaterThan(0);
    for (const id of early) expect(later).not.toContain(id);
  });
});

describe('seen-skin persistence', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips through localStorage', () => {
    expect(readSeenSkins()).toEqual([]);
    markSkinsSeen(['gold', 'onyx']);
    expect(readSeenSkins().sort()).toEqual(['gold', 'onyx']);
  });

  it('merges rather than replaces, so an older unlock stays seen', () => {
    markSkinsSeen(['gold']);
    markSkinsSeen(['onyx']);
    expect(readSeenSkins().sort()).toEqual(['gold', 'onyx']);
  });

  it('survives a corrupt blob instead of throwing', () => {
    localStorage.setItem(SEEN_SKINS_STORAGE_KEY, '{not json');
    expect(readSeenSkins()).toEqual([]);
  });
});
