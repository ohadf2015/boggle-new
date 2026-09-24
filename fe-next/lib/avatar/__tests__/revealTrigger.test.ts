import { describe, it, expect, beforeEach } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import { LEVEL_UNLOCK_LADDER } from '@/lib/avatar/unlocks';
import {
  applyUnlockToConfig,
  buildUnlockReveal,
  getNextUnlock,
  getPublishedReveal,
  hasUnseenUnlock,
  levelUpFromRecordGame,
  markRevealShown,
  publishLevelUp,
  clearPublishedReveal,
  clearUnseenUnlock,
  revealPartNameKey,
  subscribeReveal,
  __resetRevealSessionForTests,
} from '@/lib/avatar/revealTrigger';

const LOCALES = { en, he, sv, ja, es, ru } as Record<string, Record<string, unknown>>;

function resolve(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

beforeEach(() => __resetRevealSessionForTests());

describe('buildUnlockReveal', () => {
  it('returns null for no payload, same level, or a level-up that crosses no rung', () => {
    expect(buildUnlockReveal(null)).toBeNull();
    expect(buildUnlockReveal(undefined)).toBeNull();
    expect(buildUnlockReveal({ oldLevel: 4, newLevel: 4 })).toBeNull();
    // 10 -> 12 crosses nothing (next rung is 13)
    expect(buildUnlockReveal({ oldLevel: 10, newLevel: 12 })).toBeNull();
  });

  it('returns every unlock crossed, in ladder order, with the max rarity', () => {
    const r = buildUnlockReveal({ oldLevel: 4, newLevel: 6 })!;
    expect(r.unlocks.map(u => `${u.category}:${u.partId}`)).toEqual([
      'accessory:cowboyHat',
      'bgColor:#4B0082',
      'eyes:heartEye',
    ]);
    expect(r.level).toBe(6);
    expect(r.fromLevel).toBe(4);
    expect(r.rarity).toBe('epic');
    expect(r.key).toBe('4->6');
  });

  it('treats a missing oldLevel as newLevel - 1', () => {
    const r = buildUnlockReveal({ newLevel: 2 })!;
    expect(r.unlocks.map(u => u.partId)).toEqual(['headphones']);
  });

  it('skips unlocks already revealed earlier in this session', () => {
    const first = buildUnlockReveal({ oldLevel: 1, newLevel: 3 })!;
    markRevealShown(first);
    // a stale oldLevel (profile not refreshed) must not re-reveal L2-L3
    const second = buildUnlockReveal({ oldLevel: 1, newLevel: 4 })!;
    expect(second.unlocks.map(u => u.partId)).toEqual(['cottonCandy']);
    expect(buildUnlockReveal({ oldLevel: 1, newLevel: 3 })).toBeNull();
  });

  it('includeRevealed replays the full payload (user-initiated chip)', () => {
    markRevealShown(buildUnlockReveal({ oldLevel: 1, newLevel: 3 })!);
    const replay = buildUnlockReveal({ oldLevel: 1, newLevel: 3 }, { includeRevealed: true })!;
    expect(replay.unlocks.map(u => u.partId)).toEqual(['headphones', 'kawaii']);
  });
});

describe('markRevealShown', () => {
  it('returns true once per reveal key (telemetry fires once)', () => {
    const r = buildUnlockReveal({ oldLevel: 1, newLevel: 2 })!;
    expect(markRevealShown(r)).toBe(true);
    expect(markRevealShown(r)).toBe(false);
  });

  it('flags an unseen unlock for the header until cleared', () => {
    expect(hasUnseenUnlock()).toBe(false);
    markRevealShown(buildUnlockReveal({ oldLevel: 1, newLevel: 2 })!);
    expect(hasUnseenUnlock()).toBe(true);
    clearUnseenUnlock();
    expect(hasUnseenUnlock()).toBe(false);
  });
});

describe('levelUpFromRecordGame', () => {
  it('returns null when the response did not level up or is malformed', () => {
    expect(levelUpFromRecordGame(null)).toBeNull();
    expect(levelUpFromRecordGame({ leveledUp: false, newLevel: 3, newTotalXp: 500, xpEarned: 20 })).toBeNull();
    expect(levelUpFromRecordGame({ leveledUp: true })).toBeNull();
    expect(levelUpFromRecordGame('nope')).toBeNull();
  });

  it('derives the old level from the XP before this game', () => {
    // 0 XP before the game -> level 1
    const up = levelUpFromRecordGame({ leveledUp: true, newLevel: 2, newTotalXp: 150, xpEarned: 150 });
    expect(up).toEqual({ oldLevel: 1, newLevel: 2 });
  });

  it('never reports an old level at or above the new one', () => {
    const up = levelUpFromRecordGame({ leveledUp: true, newLevel: 3, newTotalXp: 999999, xpEarned: 0 });
    expect(up).toEqual({ oldLevel: 2, newLevel: 3 });
  });
});

describe('publish / subscribe (in-memory, no storage)', () => {
  it('publishes a reveal for a level-up with unlocks and notifies subscribers', () => {
    let calls = 0;
    const unsub = subscribeReveal(() => { calls += 1; });
    publishLevelUp({ oldLevel: 1, newLevel: 2 });
    expect(getPublishedReveal()?.unlocks[0].partId).toBe('headphones');
    expect(calls).toBe(1);
    clearPublishedReveal();
    expect(getPublishedReveal()).toBeNull();
    unsub();
  });

  it('ignores a level-up with nothing to reveal', () => {
    publishLevelUp({ oldLevel: 10, newLevel: 11 });
    expect(getPublishedReveal()).toBeNull();
  });

  it('never touches localStorage', () => {
    const before = window.localStorage.length;
    const r = publishLevelUp({ oldLevel: 1, newLevel: 5 });
    markRevealShown(r!);
    expect(window.localStorage.length).toBe(before);
  });
});

describe('getNextUnlock', () => {
  it('finds the first rung above the level, null past the top', () => {
    expect(getNextUnlock(1)?.level).toBe(2);
    expect(getNextUnlock(10)?.level).toBe(13);
    expect(getNextUnlock(40)).toBeNull();
    expect(getNextUnlock(Number.NaN)?.level).toBe(2);
  });
});

describe('applyUnlockToConfig', () => {
  it('writes the unlock into its own config key', () => {
    const bg = LEVEL_UNLOCK_LADDER.find(u => u.category === 'bgColor')!;
    const next = applyUnlockToConfig(DEFAULT_AVATAR_CONFIG, bg);
    expect(next.bgColor).toBe(bg.partId);
    const hat = LEVEL_UNLOCK_LADDER.find(u => u.partId === 'cowboyHat')!;
    expect(applyUnlockToConfig(DEFAULT_AVATAR_CONFIG, hat).accessory).toBe('cowboyHat');
    // input untouched
    expect(DEFAULT_AVATAR_CONFIG.accessory).not.toBe('cowboyHat');
  });
});

// The reveal's staged face (per-item attitude) is covered in
// components/avatar/reveal/__tests__/revealAttitude.test.ts (attitudeConfig).

describe('part names', () => {
  it('every ladder unlock has a name in all 6 locales', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      const key = revealPartNameKey(u);
      for (const [loc, msgs] of Object.entries(LOCALES)) {
        const v = resolve(msgs, key);
        expect(typeof v === 'string' && v.length > 0, `${loc} ${key}`).toBe(true);
      }
    }
  });

  it('names differ between locales (native copy, not pasted English)', () => {
    const key = revealPartNameKey(LEVEL_UNLOCK_LADDER[0]);
    const vals = Object.values(LOCALES).map(m => resolve(m, key));
    expect(new Set(vals).size).toBeGreaterThanOrEqual(5);
  });
});
