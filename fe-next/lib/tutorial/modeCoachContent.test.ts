import { describe, it, expect } from 'vitest';
import { MODE_COACH, getModeCoach, ALL_COACH_MODES } from './modeCoachContent';
import type { CoachModeKey } from './modeCoachStore';

const EXPECTED_MODES: CoachModeKey[] = [
  'classic',
  'wordHunt',
  'wheelRush',
  'blast',
  'wordTower',
  'connections',
  'wordCraft',
  'wordAlchemy',
  'crossword',
  'sealedBid',
  'shiritori',
  'adventure',
];

const ACCENTS = ['lime', 'cyan', 'pink', 'purple'];

describe('modeCoachContent', () => {
  it('covers every game mode (so no mode is left without a coach)', () => {
    for (const mode of EXPECTED_MODES) {
      expect(MODE_COACH[mode], `missing coach for ${mode}`).toBeDefined();
    }
    expect(ALL_COACH_MODES.sort()).toEqual([...EXPECTED_MODES].sort());
  });

  it('keeps every coach to at most 3 steps (non-overwhelming)', () => {
    for (const mode of ALL_COACH_MODES) {
      const c = MODE_COACH[mode];
      expect(c.steps.length).toBeGreaterThanOrEqual(1);
      expect(c.steps.length, `${mode} has too many steps`).toBeLessThanOrEqual(3);
    }
  });

  it('gives each coach a valid accent, title key and i18n caption keys', () => {
    for (const mode of ALL_COACH_MODES) {
      const c = MODE_COACH[mode];
      expect(ACCENTS).toContain(c.accent);
      expect(c.titleKey).toMatch(/^modeCoach\./);
      for (const step of c.steps) {
        expect(step.captionKey, `${mode} step caption`).toMatch(/^modeCoach\./);
      }
    }
  });

  it('marks the four high-traffic entry modes as rich animated demos', () => {
    expect(MODE_COACH.classic.tier).toBe('rich');
    expect(MODE_COACH.wordHunt.tier).toBe('rich');
    expect(MODE_COACH.wheelRush.tier).toBe('rich');
    expect(MODE_COACH.blast.tier).toBe('rich');
  });

  it('every rich step declares an animated demo type (not a plain icon)', () => {
    for (const mode of ALL_COACH_MODES) {
      const c = MODE_COACH[mode];
      if (c.tier !== 'rich') continue;
      for (const step of c.steps) {
        expect(step.demo, `${mode} rich step needs a demo`).not.toBe('icon');
      }
    }
  });

  it('getModeCoach returns the entry and is undefined-safe for unknown keys', () => {
    expect(getModeCoach('classic')).toBe(MODE_COACH.classic);
    // @ts-expect-error — exercising the runtime guard for an unmapped key
    expect(getModeCoach('nope')).toBeUndefined();
  });
});
