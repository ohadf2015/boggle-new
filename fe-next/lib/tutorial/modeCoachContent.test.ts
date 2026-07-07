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

  // The rich tier is defined by being animation-FORWARD: it must LEAD with an
  // animated gesture demo and never degrade into an all-static coach (that is
  // what the `simple` tier is for). A rich coach MAY still close with one static
  // info step where no gesture demo fits the copy — e.g. wordHunt's "Short words
  // cost no try" rule — so the contract is "leads animated + has ≥1 animated
  // demo", not "every single step is animated".
  it('every rich coach leads with an animated demo and is never all-static', () => {
    for (const mode of ALL_COACH_MODES) {
      const c = MODE_COACH[mode];
      if (c.tier !== 'rich') continue;
      expect(c.steps[0]?.demo, `${mode} rich coach must OPEN with an animated demo`).not.toBe('icon');
      const animated = c.steps.filter((step) => step.demo !== 'icon');
      expect(animated.length, `${mode} rich coach needs ≥1 animated demo`).toBeGreaterThan(0);
    }
  });

  it('getModeCoach returns the entry and is undefined-safe for unknown keys', () => {
    expect(getModeCoach('classic')).toBe(MODE_COACH.classic);
    // @ts-expect-error — exercising the runtime guard for an unmapped key
    expect(getModeCoach('nope')).toBeUndefined();
  });
});
