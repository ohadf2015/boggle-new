/**
 * Structural contract: Word Wheel + Word Hunt coach mounts used by Quick Play
 * must honor hideModeCoach so arcade rounds never show ModeCoach / PracticeCoachTip.
 * (Full mount of these 700–1400 line games is out of scope; adapter + SP tests
 * drive runtime paths; this asserts the shipped gate expressions exist.)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dailyDir = resolve(__dirname, '..');

function src(name: string) {
  return readFileSync(resolve(dailyDir, name), 'utf8');
}

describe('WordWheelGame / DailyWordHuntSurvival hideModeCoach contract', () => {
  it('WordWheelGame declares hideModeCoach and gates ModeCoach on it', () => {
    const s = src('WordWheelGame.tsx');
    expect(s).toMatch(/hideModeCoach\??\s*:/);
    // Must not show ModeCoach when hideModeCoach is set
    expect(s).toMatch(/!hideModeCoach[\s\S]{0,60}<ModeCoach|!practice\s*&&\s*!hideModeCoach[\s\S]{0,40}<ModeCoach/);
    // Practice tip also suppressed under hideModeCoach
    expect(s).toMatch(/practice\s*&&\s*!hideModeCoach[\s\S]{0,80}PracticeCoachTip|!hideModeCoach\s*&&\s*practice[\s\S]{0,80}PracticeCoachTip/);
  });

  it('DailyWordHuntSurvival declares hideModeCoach and gates ModeCoach on it', () => {
    const s = src('DailyWordHuntSurvival.tsx');
    expect(s).toMatch(/hideModeCoach\??\s*:/);
    expect(s).toMatch(/!hideModeCoach[\s\S]{0,60}<ModeCoach|!practice\s*&&\s*!hideModeCoach[\s\S]{0,40}<ModeCoach/);
    expect(s).toMatch(/practice\s*&&\s*!hideModeCoach[\s\S]{0,80}PracticeCoachTip|!hideModeCoach\s*&&\s*practice[\s\S]{0,80}PracticeCoachTip/);
  });
});
