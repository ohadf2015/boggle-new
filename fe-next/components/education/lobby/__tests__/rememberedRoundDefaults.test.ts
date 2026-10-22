import { describe, it, expect, beforeEach } from 'vitest';
import { readRememberedRoundDefaults } from '@/components/education/lobby/rememberedRoundDefaults';

const KEY = 'lexiclash_recent_game_settings';
const entry = (savedAt: number, settings: Record<string, unknown>) => ({
  id: String(savedAt), classroomId: 'c1', classroomName: '5B', lessonIds: ['l1'], lessonNames: ['Cells'], settings, savedAt,
});

describe('readRememberedRoundDefaults', () => {
  beforeEach(() => window.localStorage.clear());

  it('given a teacher who ran a 5-minute large-board game last, when the lobby opens, then those are the defaults', () => {
    window.localStorage.setItem(KEY, JSON.stringify([
      entry(100, { timerMinutes: 2, boardSize: 'small', allowLateJoin: true }),
      entry(200, { timerMinutes: 5, boardSize: 'large', allowLateJoin: false }),
    ]));
    expect(readRememberedRoundDefaults()).toEqual({ timerMinutes: 5, boardSize: 'large', allowLateJoin: false });
  });

  it('given nothing saved, when the lobby opens, then there are no remembered defaults', () => {
    expect(readRememberedRoundDefaults()).toBeNull();
  });

  it('given corrupt storage, when read, then it falls back quietly instead of breaking the lobby', () => {
    window.localStorage.setItem(KEY, '{not json');
    expect(readRememberedRoundDefaults()).toBeNull();
  });

  it('given an entry written before a field existed or with a value the picker no longer offers, when read, then only the valid fields come back', () => {
    window.localStorage.setItem(KEY, JSON.stringify([entry(100, { timerMinutes: 7, boardSize: 'huge' })]));
    expect(readRememberedRoundDefaults()).toEqual({});
    window.localStorage.setItem(KEY, JSON.stringify([{ savedAt: 1 }]));
    expect(readRememberedRoundDefaults()).toEqual({});
  });
});
