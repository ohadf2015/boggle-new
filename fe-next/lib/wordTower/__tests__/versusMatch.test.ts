import { describe, it, expect } from 'vitest';
import {
  initVersusMatch,
  submitVersusWord,
  scrambleVersus,
  sendVersusBomb,
  versusStandings,
  isMatchOver,
  matchResult,
  type VersusMatchState,
} from '../versusMatch';
import {
  WORD_TOWER_VERSUS_MATCH_S,
  WORD_TOWER_BOMB_COOLDOWN_S,
  WORD_TOWER_BOMB_CHARGE_PER_BAR,
} from '@/shared/constants/wordTowerConstants';

const acceptAll = () => true;

function twoPlayerMatch(now = 0): VersusMatchState {
  return initVersusMatch('G', 'en', [{ id: 'a', username: 'A' }, { id: 'b', username: 'B' }], now);
}

function floors(n: number, metersEach = 3) {
  return Array.from({ length: n }, (_, i) => ({ word: `W${i}`, len: 2, meters: metersEach }));
}

describe('versusMatch — init', () => {
  it('creates a tower per player and a timed window', () => {
    const m = twoPlayerMatch(1000);
    expect(Object.keys(m.players)).toEqual(['a', 'b']);
    expect(m.players.a.game.heightM).toBe(0);
    expect(m.endsAtMs).toBe(1000 + WORD_TOWER_VERSUS_MATCH_S * 1000);
    expect(m.order).toEqual(['a', 'b']);
  });

  it('gives players different starting trays (per-player seed)', () => {
    const m = twoPlayerMatch();
    expect(m.players.a.game.tray).not.toEqual(m.players.b.game.tray);
  });
});

describe('versusMatch — submit', () => {
  it('raises the submitting player height on a valid word; leaves others untouched', () => {
    let m = twoPlayerMatch();
    // Build a word from a's anchor + two tray tiles (dict accepts all).
    const a = m.players.a.game;
    const word = a.anchorLetter + a.tray[0] + a.tray[1];
    const out = submitVersusWord(m, 'a', word, acceptAll);
    expect(out.accepted).toBe(true);
    expect(out.state.players.a.game.floors).toHaveLength(1);
    expect(out.state.players.b.game.floors).toHaveLength(0);
  });

  it('rejects unknown player', () => {
    const m = twoPlayerMatch();
    expect(submitVersusWord(m, 'ghost', 'cat', acceptAll)).toMatchObject({ accepted: false, error: 'no_player' });
  });

  it('rejects a non-dictionary word', () => {
    const m = twoPlayerMatch();
    const a = m.players.a.game;
    const word = a.anchorLetter + a.tray[0] + a.tray[1];
    expect(submitVersusWord(m, 'a', word, () => false)).toMatchObject({ accepted: false, error: 'not_in_dictionary' });
  });
});

describe('versusMatch — scramble', () => {
  it('spends a scramble for the player', () => {
    const m = twoPlayerMatch();
    const before = m.players.a.game.scramblesLeft;
    const next = scrambleVersus(m, 'a');
    expect(next.players.a.game.scramblesLeft).toBe(before - 1);
  });
});

describe('versusMatch — bombs', () => {
  function loaded(now = 1_000_000) {
    const m = twoPlayerMatch(now - 500_000);
    // A: ahead, charged, has scrambles. B: 10 floors of 3m = 30m.
    m.players.a.game = { ...m.players.a.game, heightM: 100, bombCharge: WORD_TOWER_BOMB_CHARGE_PER_BAR, scramblesLeft: 2 };
    m.players.b.game = { ...m.players.b.game, heightM: 30, floors: floors(10, 3) };
    return m;
  }

  it('sends a bomb when ahead + charged: damages target, spends charge+scramble, sets cooldown', () => {
    const now = 1_000_000;
    const m = loaded(now);
    const out = sendVersusBomb(m, 'a', 'b', now);
    expect(out.sent).toBe(true);
    expect(out.damage).toBe(Math.floor((100 - 30) / 15)); // lead 70 -> 4 floors
    expect(out.removed).toBe(Math.min(out.damage!, 5, 10)); // capped at 5
    expect(out.state.players.a.game.bombCharge).toBe(0);
    expect(out.state.players.a.game.scramblesLeft).toBe(1);
    expect(out.state.players.a.bombCooldownUntilMs).toBe(now + WORD_TOWER_BOMB_COOLDOWN_S * 1000);
    expect(out.state.players.b.game.floors.length).toBe(10 - out.removed!);
  });

  it('blocks self-targeting', () => {
    const m = loaded();
    expect(sendVersusBomb(m, 'a', 'a', 1_000_000)).toMatchObject({ sent: false, error: 'self_target' });
  });

  it('blocks when the sender lacks the lead', () => {
    const now = 1_000_000;
    const m = loaded(now);
    m.players.a.game = { ...m.players.a.game, heightM: 35 }; // lead 5 < 15
    expect(sendVersusBomb(m, 'a', 'b', now)).toMatchObject({ sent: false, error: 'no_lead' });
  });

  it('blocks an unknown target', () => {
    expect(sendVersusBomb(loaded(), 'a', 'ghost', 1_000_000)).toMatchObject({ sent: false, error: 'no_player' });
  });
});

describe('versusMatch — standings + result', () => {
  it('ranks by height and flags below-median players', () => {
    const m = twoPlayerMatch();
    m.players.a.game = { ...m.players.a.game, heightM: 90 };
    m.players.b.game = { ...m.players.b.game, heightM: 10 };
    const s = versusStandings(m);
    expect(s[0].playerId).toBe('a');
    expect(s[0].rank).toBe(1);
    expect(s[1].playerId).toBe('b');
  });

  it('reports match over and winner', () => {
    const m = twoPlayerMatch(0);
    m.players.a.game = { ...m.players.a.game, heightM: 200 };
    expect(isMatchOver(m, m.endsAtMs)).toBe(true);
    expect(matchResult(m).winnerId).toBe('a');
  });
});
