import { describe, expect, it } from 'vitest';
import { applyWord, buildMissions, type SoloMission, type SoloMissionId } from '../soloMissions';

const LETTERS = ['A', 'E', 'I', 'N', 'O', 'R', 'S', 'T'];
const IDS: SoloMissionId[] = ['long-word', 'volume', 'letter', 'sprint', 'giant'];

function mission(partial: Partial<SoloMission> & Pick<SoloMission, 'id'>): SoloMission {
  const defaults: Record<SoloMissionId, SoloMission> = {
    'long-word': { id: 'long-word', labelKey: 'singlePlayer.missions.longWord', progress: 0, target: 1, bonusPts: 40, done: false },
    volume: { id: 'volume', labelKey: 'singlePlayer.missions.volume', progress: 0, target: 10, bonusPts: 50, done: false },
    letter: { id: 'letter', labelKey: 'singlePlayer.missions.letter', progress: 0, target: 1, bonusPts: 30, done: false, letter: 'E' },
    sprint: { id: 'sprint', labelKey: 'singlePlayer.missions.sprint', progress: 0, target: 120, bonusPts: 40, done: false },
    giant: { id: 'giant', labelKey: 'singlePlayer.missions.giant', progress: 0, target: 1, bonusPts: 60, done: false },
  };
  return { ...defaults[partial.id], ...partial };
}

describe('buildMissions', () => {
  it('returns 3 distinct missions deterministically from a seed', () => {
    const a = buildMissions(42);
    const b = buildMissions(42);
    expect(a).toEqual(b);
    expect(new Set(a.map((m) => m.id)).size).toBe(3);
    for (const m of a) expect(IDS).toContain(m.id);
  });

  it('seeds the letter mission from A E I N O R S T', () => {
    const withLetter = buildMissions(7).find((m) => m.id === 'letter');
    const otherSeed = buildMissions(99).find((m) => m.id === 'letter');
    for (const found of [withLetter, otherSeed]) {
      if (!found) continue;
      expect(LETTERS).toContain(found.letter);
    }
    const forced = buildMissions(1);
    const letterMission = forced.find((m) => m.id === 'letter');
    if (letterMission) expect(LETTERS).toContain(letterMission.letter);
    expect(forced.filter((m) => m.id !== 'letter').every((m) => m.letter == null)).toBe(true);
  });

  it('different seeds can pick a different trio', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 30; seed++) {
      seen.add(buildMissions(seed).map((m) => m.id).sort().join(','));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('applyWord', () => {
  it('completes long-word at 6 letters and giant at 7, awarding the bonus once', () => {
    const start = [mission({ id: 'long-word' }), mission({ id: 'giant' }), mission({ id: 'volume' })];
    const short = applyWord(start, 'apple', 10, 5);
    expect(short.bonusPts).toBe(0);
    expect(short.missions[0].done).toBe(false);

    const six = applyWord(start, 'planet', 10, 5);
    expect(six.missions[0]).toMatchObject({ done: true, progress: 1 });
    expect(six.missions[1].done).toBe(false);
    expect(six.bonusPts).toBe(40);

    const again = applyWord(six.missions, 'planets', 10, 6);
    expect(again.missions[1]).toMatchObject({ done: true, progress: 1 });
    expect(again.bonusPts).toBe(60);
    expect(again.missions[0].done).toBe(true);
  });

  it('does not mutate the input array or mission objects', () => {
    const start = [mission({ id: 'volume', progress: 9 })];
    const snapshot = JSON.stringify(start);
    applyWord(start, 'cat', 5, 1);
    expect(JSON.stringify(start)).toBe(snapshot);
  });

  it('volume awards 50 on the 10th valid word and not again', () => {
    let missions = [mission({ id: 'volume' })];
    let lastBonus = 0;
    for (let i = 0; i < 11; i++) {
      const applied = applyWord(missions, 'cat', 5, 1);
      missions = applied.missions;
      lastBonus = applied.bonusPts;
    }
    expect(missions[0]).toMatchObject({ progress: 10, done: true });
    expect(lastBonus).toBe(0);
    const ninth = applyWord([mission({ id: 'volume', progress: 9 })], 'cat', 5, 1);
    expect(ninth.bonusPts).toBe(50);
    expect(ninth.missions[0].progress).toBe(10);
  });

  it('letter mission matches case-insensitively and only the seeded letter', () => {
    const hit = applyWord([mission({ id: 'letter', letter: 'E' })], 'Apple', 8, 2);
    expect(hit.bonusPts).toBe(30);
    expect(hit.missions[0].done).toBe(true);
    const miss = applyWord([mission({ id: 'letter', letter: 'T' })], 'Apple', 8, 2);
    expect(miss.bonusPts).toBe(0);
    expect(miss.missions[0].done).toBe(false);
  });

  it('sprint counts points only inside the first 60 seconds and awards at 120', () => {
    const early = applyWord([mission({ id: 'sprint', progress: 100 })], 'cat', 20, 60);
    expect(early.missions[0]).toMatchObject({ progress: 120, done: true });
    expect(early.bonusPts).toBe(40);
    const late = applyWord([mission({ id: 'sprint', progress: 100 })], 'cat', 50, 60.01);
    expect(late.missions[0]).toMatchObject({ progress: 100, done: false });
    expect(late.bonusPts).toBe(0);
  });
});
