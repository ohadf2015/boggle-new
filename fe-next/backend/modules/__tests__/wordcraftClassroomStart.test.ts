/**
 * The startGame branch for live classroom Wordcraft.
 *
 * Wordcraft rides the normal startGame path (like Wheel Rush): the room keeps
 * its timer, its endGame, its classroom summary. What the branch must decide
 * is pinned here so the 900-line handler stays a wiring diagram:
 *
 *  - a classroom room whose teacher chose wordcraft gets per-student race
 *    sessions dealt from the lesson;
 *  - 'wordcraft' in a NON-classroom room is a crafted payload — the mode is
 *    classroom-only, so the room loudly falls back to classic rather than
 *    silently playing a grid game under a wordcraft label.
 */
import { describe, it, expect, vi } from 'vitest';

const mockWarn = vi.fn();
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: (...a: unknown[]) => mockWarn(...a), debug: vi.fn() },
}));

import { resolveWordcraftClassroomStart } from '../wordcraftClassroomManager';

describe('resolveWordcraftClassroomStart', () => {
  const classroomGame = {
    vocabularyWords: ['cat', 'dog'],
    lessonIds: ['l1'],
    settings: { gameMode: 'wordcraft' },
  };

  it('deals race sessions for a classroom wordcraft round', () => {
    const result = resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft',
      classroomGame,
      gameCode: 'CRAFT1',
      gameSessionId: 2,
      playerUsernames: ['Ada', 'Ben'],
      language: 'en',
    });
    expect(result.mode).toBe('wordcraft');
    if (result.mode !== 'wordcraft') return;
    expect(Object.keys(result.session.players)).toEqual(['Ada', 'Ben']);
    expect(result.session.targets).toContain('CAT');
  });

  it('keeps lesson words up to the live rack width — a 9-letter vocab word is the whole point', () => {
    const result = resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft',
      classroomGame: { ...classroomGame, vocabularyWords: ['juxtapose', 'cat'] },
      gameCode: 'CRAFT1',
      gameSessionId: 3,
      playerUsernames: ['Ada'],
      language: 'en',
    });
    expect(result.mode).toBe('wordcraft');
    if (result.mode !== 'wordcraft') return;
    expect(result.session.targets).toEqual(['CAT', 'JUXTAPOSE']);
    expect(result.session.players.Ada.rack).toHaveLength(9);
  });

  it('warns with the dropped words when SOME lesson words outgrow the rack — a partial drop must not be silent', () => {
    mockWarn.mockClear();
    const result = resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft',
      classroomGame: { ...classroomGame, vocabularyWords: ['juxtapose', 'anachronism', 'cat'] },
      gameCode: 'CRAFT1',
      gameSessionId: 5,
      playerUsernames: ['Ada'],
      language: 'en',
    });
    expect(result.mode).toBe('wordcraft');
    const dropWarns = mockWarn.mock.calls.filter((c) => String(c[1]).includes('anachronism'));
    expect(dropWarns).toHaveLength(1);
    expect(String(dropWarns[0][1])).not.toContain('juxtapose');
  });

  it('does not warn when every lesson word fits the rack', () => {
    mockWarn.mockClear();
    resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft',
      classroomGame: { ...classroomGame, vocabularyWords: ['cat', 'dog'] },
      gameCode: 'CRAFT1',
      gameSessionId: 6,
      playerUsernames: ['Ada'],
      language: 'en',
    });
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('falls back to classic when no lesson word fits the rack — never an unplayable round', () => {
    const result = resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft',
      classroomGame: { ...classroomGame, vocabularyWords: ['anachronism', 'antidisestablishmentarianism'] },
      gameCode: 'CRAFT1',
      gameSessionId: 4,
      playerUsernames: ['Ada'],
      language: 'en',
    });
    expect(result.mode).toBe('classic');
  });

  it('does nothing for any other mode — the board path is untouched', () => {
    const result = resolveWordcraftClassroomStart({
      resolvedMode: 'classic',
      classroomGame: { ...classroomGame, settings: { gameMode: 'classic' } },
      gameCode: 'CRAFT1',
      gameSessionId: 1,
      playerUsernames: ['Ada'],
      language: 'en',
    });
    expect(result.mode).toBe('classic');
  });

  it('falls back to classic when a crafted payload names wordcraft outside a classroom', () => {
    const result = resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft',
      classroomGame: null,
      gameCode: 'PUBL1C',
      gameSessionId: 1,
      playerUsernames: ['Ada'],
      language: 'en',
    });
    expect(result.mode).toBe('classic');
  });

  it('falls back when the classroom record disagrees with the payload (record wins)', () => {
    const result = resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft',
      classroomGame: { ...classroomGame, settings: { gameMode: 'blast' } },
      gameCode: 'CRAFT1',
      gameSessionId: 1,
      playerUsernames: ['Ada'],
      language: 'en',
    });
    // The Redis record is the teacher's actual choice — a forged startGame
    // payload cannot talk a blast room into a wordcraft race.
    expect(result.mode).toBe('blast');
  });

  it('seeds each ROUND differently — a rematch deals fresh racks', () => {
    const round1 = resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft', classroomGame, gameCode: 'CRAFT1', gameSessionId: 1,
      playerUsernames: ['Ada'], language: 'en',
    });
    const round2 = resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft', classroomGame, gameCode: 'CRAFT1', gameSessionId: 2,
      playerUsernames: ['Ada'], language: 'en',
    });
    if (round1.mode !== 'wordcraft' || round2.mode !== 'wordcraft') {
      throw new Error('expected wordcraft sessions');
    }
    const rack1 = round1.session.players.Ada.rack.map((t) => t.letter).join('');
    const rack2 = round2.session.players.Ada.rack.map((t) => t.letter).join('');
    expect(rack1).not.toBe(rack2);
  });
});
