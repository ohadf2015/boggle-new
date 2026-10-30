import { describe, it, expect } from 'vitest';
import {
  HERO_CODE_TEXT,
  HERO_QR_SIZE,
  ROSTER_TIERS,
  WIDE_MIN_REM,
  arrivalsSince,
  isArrivalBurst,
  projectorStartLabel,
  recordArrivals,
  rosterTier,
} from '../projectorLobbyModel';

/** Evaluates a shipped `min(Xcqw,Ycqh)` literal for a container of w x h px. */
function cqMin(literal: string, w: number, h: number): number {
  const m = /min\(([\d.]+)cqw,([\d.]+)cqh\)/.exec(literal);
  if (!m) throw new Error(`no cq literal in ${literal}`);
  return Math.min((Number(m[1]) * w) / 100, (Number(m[2]) * h) / 100);
}

/** Picks the stacked or the wide (@5xl) half of a responsive literal for a container width. */
function sizeAt(classes: string, prefix: string, w: number, h: number): number {
  const wide = w >= WIDE_MIN_REM * 16;
  const parts = classes.split(' ');
  const pick = parts.find((c) => (wide ? c.startsWith(`@5xl:${prefix}`) : c.startsWith(prefix)));
  if (!pick) throw new Error(`no ${prefix} class for ${wide ? 'wide' : 'stacked'}`);
  return cqMin(pick, w, h);
}

const WALLS: Array<[number, number]> = [
  [1024, 768],
  [1280, 720],
  [1920, 1080],
  [2560, 1440],
];
const ALL: Array<[number, number]> = [[360, 740], [768, 1024], ...WALLS];

/** Six tiles of ~0.85em plus five 0.06em gaps. */
const CODE_EM = 6 * 0.85 + 5 * 0.06;

describe('hero join code sizing (container units)', () => {
  it.each(WALLS)('Given a %ix%i wall, Then the code is at least a tenth of the container height', (w, h) => {
    expect(sizeAt(HERO_CODE_TEXT, 'text-', w, h)).toBeGreaterThanOrEqual(h * 0.1);
  });

  it('Given a portrait 768x1024 tablet, Then the stacked code still reaches 10% of the height', () => {
    expect(sizeAt(HERO_CODE_TEXT, 'text-', 768, 1024)).toBeGreaterThanOrEqual(102);
  });

  it.each(ALL)('Given %ix%i, Then six tiles fit the hero column with no horizontal scroll', (w, h) => {
    const wide = w >= WIDE_MIN_REM * 16;
    const column = wide ? w / 2 - 0.06 * w : w - 64;
    expect(sizeAt(HERO_CODE_TEXT, 'text-', w, h) * CODE_EM).toBeLessThanOrEqual(column);
  });

  it.each(ALL)('Given %ix%i, Then the QR is at least 7rem so a phone can scan it from the room', (w, h) => {
    expect(sizeAt(HERO_QR_SIZE, 'size-', w, h)).toBeGreaterThanOrEqual(w < 400 ? 112 : 140);
  });

  it('never uses viewport units', () => {
    expect(`${HERO_CODE_TEXT} ${HERO_QR_SIZE} ${ROSTER_TIERS.map((t) => `${t.grid} ${t.chip}`).join(' ')}`).not.toMatch(/\d(vw|vh|dvh|svh)\b/);
  });
});

describe('rosterTier: chips shrink as the room fills, in container units', () => {
  it('is monotonic: one more arrival never makes a chip bigger', () => {
    let last = rosterTier(0);
    for (let n = 1; n <= 80; n++) {
      const next = rosterTier(n);
      expect(ROSTER_TIERS.indexOf(next)).toBeGreaterThanOrEqual(ROSTER_TIERS.indexOf(last));
      last = next;
    }
  });

  it('fits a real class of up to 40 without scrolling, and only scrolls far past a class', () => {
    expect(rosterTier(40).scrolls).toBe(false);
    expect(rosterTier(41).scrolls).toBe(true);
  });

  it('writes every tier as whole literal classes (Tailwind v4 sees only verbatim utilities)', () => {
    for (const tier of ROSTER_TIERS) {
      expect(`${tier.grid} ${tier.chip}`).not.toMatch(/\$\{/);
      expect(tier.chip).toMatch(/cqw/);
    }
  });
});

describe('arrival bursts', () => {
  it('Given 30 arrivals in one second, Then chips still pop', () => {
    expect(isArrivalBurst(recordArrivals([], 20, 1000).length, 10)).toBe(false);
  });

  it('Given more than 30 arrivals in one second, Then the pop is throttled', () => {
    expect(isArrivalBurst(recordArrivals([], 20, 1000).length, 11)).toBe(true);
  });

  it('forgets arrivals older than a second, so a later trickle pops again', () => {
    expect(recordArrivals(recordArrivals([], 50, 0), 1, 5000)).toEqual([5000]);
    expect(isArrivalBurst(recordArrivals(recordArrivals([], 40, 1000), 0, 2100).length, 1)).toBe(false);
  });

  it('still treats a first paint as no arrival', () => {
    expect(arrivalsSince(null, ['Maya'])).toEqual([]);
  });
});

describe('projectorStartLabel', () => {
  const base = { starting: false, canStart: true, isBoss: false, switched: false, isQuiz: false, startLabelKey: 'hostView.startQuiz' };

  it('says it is waiting while nobody is in', () => {
    expect(projectorStartLabel({ ...base, canStart: false })).toBe('education.projectorLobby.startWhenReady');
  });

  it('keeps the teacher label while the round is being created, so the button holds its size', () => {
    expect(projectorStartLabel({ ...base, starting: true })).toBe('hostView.startQuiz');
  });

  it('follows an in-place switch instead of the stale launch label', () => {
    expect(projectorStartLabel({ ...base, switched: true })).toBe('hostView.startClassGame');
    expect(projectorStartLabel({ ...base, switched: true, isQuiz: true })).toBe('hostView.startQuiz');
  });

  it('names the boss fight for Boss Battle', () => {
    expect(projectorStartLabel({ ...base, isBoss: true })).toBe('eg2Modes.boss.start');
  });
});
