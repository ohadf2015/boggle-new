import { describe, expect, it } from 'vitest';
import { getPresetValues } from '@/lib/education/classroomPresets';
import { lobbySetupSummary, matchingPreset, type PresetFields } from '../lobbySetupModel';

const fields = (over: Partial<PresetFields> = {}): PresetFields => {
  const { vocabularyCap: _cap, ...standard } = getPresetValues('standard');
  return { ...standard, ...over };
};

describe('matchingPreset', () => {
  it('lights Standard for the lobby defaults', () => {
    expect(matchingPreset(fields())).toBe('standard');
  });

  it('lights each preset for exactly its own values', () => {
    for (const id of ['standard', 'friday-battle', 'sped'] as const) {
      const { vocabularyCap: _cap, ...values } = getPresetValues(id);
      expect(matchingPreset(values)).toBe(id);
    }
  });

  it('lights nothing once a value moves off every preset', () => {
    expect(matchingPreset(fields({ boardSize: 'large' }))).toBeNull();
    expect(matchingPreset(fields({ minWordLength: 4 }))).toBeNull();
    expect(matchingPreset(fields({ accessibility: { largeText: true } }))).toBeNull();
  });

  it('keeps the preset lit under a custom round length, so a session link with Support and its own minutes still caps words', () => {
    const { vocabularyCap: _cap, ...sped } = getPresetValues('sped');
    expect(matchingPreset({ ...sped, timerMinutes: 7 })).toBe('sped');
    expect(matchingPreset(fields({ timerMinutes: 5 }))).toBe('standard');
  });

  it('ignores the team count when nobody plays in teams', () => {
    expect(matchingPreset(fields({ teamCount: 4 }))).toBe('standard');
    expect(matchingPreset(fields({ playStyle: 'teams', teamCount: 4 }))).toBeNull();
  });

  it('treats an accessibility flag set to false as off', () => {
    expect(matchingPreset(fields({ accessibility: { largeText: false } }))).toBe('standard');
  });
});

describe('lobbySetupSummary', () => {
  const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${params.count}` : key);

  it('reads play style, rivals and the round length', () => {
    expect(lobbySetupSummary({ playStyle: 'teams', teamCount: 2, rivalry: true, roundMinutes: 3 }, t)).toBe(
      'teacher.classroom.playStyle.teams · eduShell.host.rivalsOn · education.modePicker.minutes:3',
    );
  });

  it('says rivals are off when they are', () => {
    expect(lobbySetupSummary({ playStyle: 'ffa', teamCount: 2, rivalry: false, roundMinutes: 5 }, t)).toBe(
      'teacher.classroom.playStyle.ffa · eduShell.host.rivalsOff · education.modePicker.minutes:5',
    );
  });
});
