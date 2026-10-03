import { describe, it, expect } from 'vitest';
import { HQ_MODES, hqModeFacts } from '../hqModes';
import { modeDurationMinutes, teacherGameMode } from '@/lib/education/gameModes';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';

describe('hqModeFacts — the facts card reads the catalog, never a retyped copy', () => {
  it.each(HQ_MODES.map((m) => m.id))('Given %s, Then poster and minutes come from the teacher game catalog', (id) => {
    const facts = hqModeFacts(id);
    expect(facts.poster).toBe(teacherGameMode(id)?.poster);
    expect(facts.minutes).toBe(modeDurationMinutes(id));
  });

  it('Given any mode, Then the player cap is the real room cap', () => {
    for (const m of HQ_MODES) {
      expect(hqModeFacts(m.id).maxPlayers).toBe(MAX_PLAYERS_PER_ROOM);
    }
  });

  it('Given the five HQ modes, Then each names a skill and a pitch under eduHq.modes', () => {
    const skills = new Set<string>();
    for (const m of HQ_MODES) {
      const facts = hqModeFacts(m.id);
      expect(facts.skillKey).toMatch(/^eduHq\.modes\.skill\./);
      expect(facts.pitchKey).toMatch(/^eduHq\.modes\.pitch\./);
      skills.add(facts.skillKey);
    }
    expect(skills.size).toBeGreaterThanOrEqual(4);
  });
});
