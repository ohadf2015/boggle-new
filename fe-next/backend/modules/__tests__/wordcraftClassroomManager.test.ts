/**
 * Live classroom Wordcraft — the per-student solo race, server-side.
 *
 * Every student in the room gets their OWN board + rack + bot opponent dealt
 * from the SAME lesson word list (the deal is nudged so lesson words are
 * reachable, exactly like the homework workshop). The room leaderboard
 * aggregates each student's score; the teacher's projector watches the race.
 *
 * These tests pin the session arithmetic WITHOUT sockets: the handler only
 * forwards placements here and broadcasts what comes back, so if the loop is
 * wrong it is wrong here.
 */
import { describe, it, expect } from 'vitest';
import {
  createWordcraftLiveSession,
  ensureWordcraftPlayer,
  applyWordcraftMove,
  wordcraftSnapshotFor,
  wordcraftTargetsProgress,
  WORDCRAFT_LIVE_BOARD_SIZE,
  WORDCRAFT_LIVE_RACK_SIZE,
  type WordcraftLiveSession,
} from '../wordcraftClassroomManager';
import { getCell, isFirstMove } from '@/lib/word-craft/board';
import { RACK_SIZE } from '@/lib/word-craft/tileBag';
import type { PlacedTile, RackTile } from '@/lib/word-craft/types';

/** A dictionary stub that accepts everything 2+ letters — the bot always moves. */
const acceptAll = (w: string) => [...w].length >= 2;
/** Only these words exist — bot passes unless its rack spells one. */
const only =
  (...words: string[]) =>
  (w: string) =>
    words.includes(w.toUpperCase());

function makeSession(usernames: string[] = ['Ada', 'Ben']): WordcraftLiveSession {
  return createWordcraftLiveSession({
    gameCode: 'CRAFT1',
    vocabularyWords: ['cat', 'dog', 'sun'],
    language: 'en',
    usernames,
    seed: 'test-seed',
  });
}

/** Build placements for `word` across row `row` starting at col 2 from the player's rack. */
function placeFromRack(rack: RackTile[], word: string, row = 4, col = 2): PlacedTile[] {
  const pool = rack.slice();
  const out: PlacedTile[] = [];
  for (const ch of word.toUpperCase()) {
    const i = pool.findIndex((t) => !t.isBlank && t.letter === ch);
    if (i < 0) throw new Error(`rack lacks ${ch}: ${rack.map((t) => t.letter).join('')}`);
    const t = pool.splice(i, 1)[0];
    out.push({
      row,
      col: col + out.length,
      letter: t.letter,
      value: t.value,
      isBlank: t.isBlank,
      rackTileId: t.id,
    });
  }
  return out;
}

describe('createWordcraftLiveSession', () => {
  it('deals every student their own board, rack and bot on the classroom board size', () => {
    const session = makeSession();
    expect(session.boardSize).toBe(WORDCRAFT_LIVE_BOARD_SIZE);
    for (const name of ['Ada', 'Ben']) {
      const p = session.players[name];
      expect(p).toBeDefined();
      expect(p.rack).toHaveLength(WORDCRAFT_LIVE_RACK_SIZE);
      expect(p.botRack).toHaveLength(RACK_SIZE); // the rival keeps the classic 7-tile search envelope
      expect(p.botScore).toBe(0);
      expect(p.board.size).toBe(WORDCRAFT_LIVE_BOARD_SIZE);
      expect(isFirstMove(p.board)).toBe(true);
    }
  });

  it('nudges the deal so the first lesson target sits in the opening rack', () => {
    const session = makeSession();
    expect(session.targets[0]).toBe('CAT');
    const letters = session.players.Ada.rack.filter((t) => !t.isBlank).map((t) => t.letter);
    for (const ch of 'CAT') {
      const i = letters.indexOf(ch);
      expect(i).toBeGreaterThanOrEqual(0);
      letters.splice(i, 1);
    }
  });

  it('gives each student an independent board and bag', () => {
    const session = makeSession();
    const ada = session.players.Ada;
    const ben = session.players.Ben;
    const placements = placeFromRack(ada.rack, 'CAT');
    const result = applyWordcraftMove(session, 'Ada', placements, acceptAll);
    expect(result.ok).toBe(true);
    expect(isFirstMove(ben.board)).toBe(true);
  });
});

describe('applyWordcraftMove', () => {
  it('accepts a valid lesson word: scores it, refills the rack, replies with the bot', () => {
    const session = makeSession(['Ada']);
    const ada = session.players.Ada;
    const result = applyWordcraftMove(session, 'Ada', placeFromRack(ada.rack, 'CAT'), acceptAll);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.words.map((w) => w.word)).toContain('CAT');
    expect(result.score).toBeGreaterThan(0);
    // Rack back to full after the draw.
    expect(session.players.Ada.rack).toHaveLength(WORDCRAFT_LIVE_RACK_SIZE);
    // The Baron's reply landed on the same board and is scored for the student to chase.
    expect(result.bot).not.toBeNull();
    expect(session.players.Ada.botScore).toBeGreaterThan(0);
    // Placed tiles belong to the player; the bot's to the bot.
    expect(getCell(session.players.Ada.board, 4, 2).tile?.letter).toBe('C');
  });

  it('rejects a word the dictionary refuses, and nothing moves', () => {
    const session = makeSession(['Ada']);
    const ada = session.players.Ada;
    const before = ada.rack.length;
    const result = applyWordcraftMove(session, 'Ada', placeFromRack(ada.rack, 'CAT'), only('DOG'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('INVALID_WORD');
    expect(ada.rack).toHaveLength(before);
    expect(isFirstMove(ada.board)).toBe(true);
    expect(ada.botScore).toBe(0);
  });

  it('rejects placements that did not come from the player rack (forged tiles)', () => {
    const session = makeSession(['Ada']);
    const forged: PlacedTile[] = [
      { row: 4, col: 2, letter: 'Z', value: 10, isBlank: false, rackTileId: 't-999' },
      { row: 4, col: 3, letter: 'Z', value: 10, isBlank: false, rackTileId: 't-998' },
    ];
    const result = applyWordcraftMove(session, 'Ada', forged, acceptAll);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('NOT_IN_RACK');
  });

  it('scores from the dealt tile values, not the payload values', () => {
    const session = makeSession(['Ada']);
    const honest = makeSession(['Ada']);
    const tampered = placeFromRack(session.players.Ada.rack, 'CAT').map((p) => ({ ...p, value: 99 }));
    const result = applyWordcraftMove(session, 'Ada', tampered, acceptAll);
    const baseline = applyWordcraftMove(honest, 'Ada', placeFromRack(honest.players.Ada.rack, 'CAT'), acceptAll);
    expect(result.ok).toBe(true);
    expect(baseline.ok).toBe(true);
    if (!result.ok || !baseline.ok) return;
    expect(result.score).toBe(baseline.score);
  });

  it('rejects a placement whose letter was tampered with after leaving the rack', () => {
    const session = makeSession(['Ada']);
    const ada = session.players.Ada;
    const placements = placeFromRack(ada.rack, 'CAT');
    placements[0] = { ...placements[0], letter: 'Q' };
    const result = applyWordcraftMove(session, 'Ada', placements, acceptAll);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('NOT_IN_RACK');
  });

  it('rejects a second move that floats free of the board', () => {
    const session = makeSession(['Ada']);
    applyWordcraftMove(session, 'Ada', placeFromRack(session.players.Ada.rack, 'CAT'), acceptAll);
    const ada = session.players.Ada;
    // Any two tiles far from the placed word: the engine must say DISCONNECTED.
    const far = [ada.rack[0], ada.rack[1]].map((t, i) => ({
      row: 0,
      col: 8 - i,
      letter: t.letter,
      value: t.value,
      isBlank: t.isBlank,
      rackTileId: t.id,
    }));
    const result = applyWordcraftMove(session, 'Ada', far, acceptAll);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(['DISCONNECTED', 'INVALID_WORD', 'NOT_LINEAR']).toContain(result.error);
  });

  it('pays the bingo bonus on a seven-tile placement', () => {
    const session = createWordcraftLiveSession({
      gameCode: 'CRAFT1',
      vocabularyWords: ['teacher'],
      language: 'en',
      usernames: ['Ada'],
      seed: 'bingo-seed',
    });
    const ada = session.players.Ada;
    const result = applyWordcraftMove(session, 'Ada', placeFromRack(ada.rack, 'TEACHER'), acceptAll);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bingo).toBe(true);
    expect(result.bingoBonus).toBe(50);
    const wordSum = result.words.reduce((s, w) => s + w.score, 0);
    expect(result.score).toBe(wordSum + 50);
  });

  it('lets the bot pass quietly when nothing in its rack is a word', () => {
    const session = makeSession(['Ada']);
    const result = applyWordcraftMove(
      session,
      'Ada',
      placeFromRack(session.players.Ada.rack, 'CAT'),
      only('CAT'),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bot).toBeNull();
    expect(session.players.Ada.botScore).toBe(0);
  });
});

describe('ensureWordcraftPlayer', () => {
  it('seats a late joiner with a fresh deal on the same lesson targets', () => {
    const session = makeSession(['Ada']);
    const late = ensureWordcraftPlayer(session, 'Cid');
    expect(late.rack).toHaveLength(WORDCRAFT_LIVE_RACK_SIZE);
    expect(session.players.Cid).toBe(late);
    expect(session.targets).toContain('CAT');
  });

  it('returns the existing seat for a reconnecting student — their board survives', () => {
    const session = makeSession(['Ada']);
    applyWordcraftMove(session, 'Ada', placeFromRack(session.players.Ada.rack, 'CAT'), acceptAll);
    const again = ensureWordcraftPlayer(session, 'Ada');
    expect(isFirstMove(again.board)).toBe(false);
  });
});

describe('wordcraftSnapshotFor', () => {
  it('carries the student view: rack, owned cells, bot score, target progress', () => {
    const session = makeSession(['Ada']);
    applyWordcraftMove(session, 'Ada', placeFromRack(session.players.Ada.rack, 'CAT'), acceptAll);
    const snap = wordcraftSnapshotFor(session, 'Ada');

    expect(snap.boardSize).toBe(WORDCRAFT_LIVE_BOARD_SIZE);
    expect(snap.rack).toHaveLength(WORDCRAFT_LIVE_RACK_SIZE);
    expect(snap.cells.some((c) => c.by === 'player' && c.letter === 'C')).toBe(true);
    expect(snap.cells.some((c) => c.by === 'bot')).toBe(true);
    expect(snap.botScore).toBe(session.players.Ada.botScore);
    expect(snap.targets).toEqual([
      { word: 'CAT', built: true },
      { word: 'DOG', built: false },
      { word: 'SUN', built: false },
    ]);
  });

  it('never ships the bot rack — a student devtools must not see the answer key', () => {
    const session = makeSession(['Ada']);
    const snap = wordcraftSnapshotFor(session, 'Ada');
    expect(JSON.stringify(snap)).not.toContain('botRack');
    expect((snap as Record<string, unknown>).botRack).toBeUndefined();
  });
});

describe('wordcraftTargetsProgress', () => {
  it('reports which lesson words the CLASS has built, and by whom', () => {
    const session = makeSession(['Ada', 'Ben']);
    applyWordcraftMove(session, 'Ada', placeFromRack(session.players.Ada.rack, 'CAT'), acceptAll);
    const progress = wordcraftTargetsProgress(session);
    const cat = progress.find((p) => p.target === 'CAT');
    expect(cat?.builtBy).toContain('Ada');
    expect(progress.find((p) => p.target === 'DOG')?.builtBy).toEqual([]);
  });
});
