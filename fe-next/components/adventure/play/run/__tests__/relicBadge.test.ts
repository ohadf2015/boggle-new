import { describe, it, expect } from 'vitest';
import { relicBadge, relicTag } from '../relicBadge';
import { RELIC_IDS, RELICS } from '@/lib/adventure/play/relics';

/**
 * The judge's blocker: "no stack/charge count" on the icons. Every relic must
 * carry a numeral, including the ten STAT relics that score no points and so
 * never appear in `relicRunContributions`.
 */
describe('relicTag — every relic in the catalog has a language-free numeral', () => {
  it.each(RELIC_IDS)('Given %s, then it has a non-empty tag', (id) => {
    expect(relicTag(id)).not.toBe('');
  });

  it('Given the whole catalog, then no tag needs translating (digits + symbols only)', () => {
    for (const id of RELIC_IDS) expect(relicTag(id)).toMatch(/^[+×↺−]?[\d.]+[s%]?$|^[\d.]+%$/);
  });

  it('Given a scoring relic, then the tag is its PEAK effect, read from the catalog', () => {
    expect(relicTag('storm-rune')).toBe('+5'); // flat +5 on a 5-letter word
    expect(relicTag('long-bow')).toBe('×2'); // ×2 on 7+
    expect(relicTag('sharp-quill')).toBe('+50%'); // ×1.5 on 6+
    expect(relicTag('magnet')).toBe('+20%');
    expect(relicTag('echo-stone')).toBe('+10'); // capped chain bonus
  });

  it('Given a stat relic, then the tag comes from the catalog constant, so it cannot drift', () => {
    expect(relicTag('heart-locket')).toBe('+1'); // +1 max HP
    expect(relicTag('hourglass')).toBe('+10s');
    expect(relicTag('gold-tooth')).toBe('+50%'); // ×1.5 gold, formatted like every other multiplier
    expect(relicTag('frost-ward')).toBe('−50%');
  });
});

describe('relicBadge — live points win, the static tag is the fallback', () => {
  it('Given a relic that has paid out this run, then the badge is its live +points', () => {
    expect(relicBadge('storm-rune', 37)).toEqual({ text: '+37', tone: 'points' });
  });

  it('Given a scoring relic that has paid nothing yet, then the badge still shows what it WILL do', () => {
    expect(relicBadge('storm-rune', 0)).toEqual({ text: '+5', tone: 'stat' });
    expect(relicBadge('storm-rune', undefined)).toEqual({ text: '+5', tone: 'stat' });
  });

  it('Given a stat relic, then the badge is always its catalog tag — it has no points share', () => {
    expect(relicBadge('phoenix-feather', undefined).tone).toBe('stat');
    expect(relicBadge('phoenix-feather', undefined).text).toBe('↺1');
  });

  it('Given every relic, then the badge is never empty — no bare icon in the rail', () => {
    for (const id of RELIC_IDS) {
      expect(relicBadge(id, undefined).text.length).toBeGreaterThan(0);
      expect(RELICS[id]).toBeTruthy();
    }
  });
});
