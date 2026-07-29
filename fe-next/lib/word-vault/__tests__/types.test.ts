import { describe, expect, it } from 'vitest';
import {
  BOOK_1_HEARTH_ROOMS,
  BOOK_1_ITEMS,
  CINDER,
  type Riddle,
  type RoomConfig,
  type WordConstraintRiddle,
} from '../index';

describe('word-vault types & stub content', () => {
  it('Book 1 has exactly 6 rooms in chapter order', () => {
    expect(BOOK_1_HEARTH_ROOMS).toHaveLength(6);
    expect(BOOK_1_HEARTH_ROOMS.map((r) => r.id)).toEqual([
      'room-1-1',
      'room-1-2',
      'room-1-3',
      'room-1-4',
      'room-1-5',
      'room-1-6',
    ]);
  });

  it('room 1.1 is a word-constraint riddle whose target is אש', () => {
    const room = BOOK_1_HEARTH_ROOMS[0];
    expect(room.id).toBe('room-1-1');
    expect(room.riddle).not.toBeNull();
    const riddle = room.riddle as WordConstraintRiddle;
    expect(riddle.engine).toBe('word-constraint');
    expect(riddle.targetWords).toContain('אש');
    expect(riddle.tiles.map((t) => t.letter).sort()).toEqual(['א', 'ש']);
  });

  it('room 1.5 has a null riddle (story-only "just exist" room)', () => {
    const room = BOOK_1_HEARTH_ROOMS[4];
    expect(room.id).toBe('room-1-5');
    expect(room.riddle).toBeNull();
  });

  it('discriminated union narrows by engine field', () => {
    const r: Riddle = {
      engine: 'cipher',
      jars: [{ id: 'j1', scrambled: 'רכוס', answer: 'סוכר' }],
    };
    if (r.engine === 'cipher') {
      expect(r.jars[0].answer).toBe('סוכר');
    } else {
      throw new Error('narrowing failed');
    }
  });

  it('CINDER cousin metadata matches design doc', () => {
    expect(CINDER.id).toBe('cinder');
    expect(CINDER.nameHe.length).toBeGreaterThan(0);
    expect(CINDER.was).toMatch(/cook|warm/i);
  });

  it('BOOK_1_ITEMS exposes 6 room-reward items + 1 hotspot item (broom) per RPG-layer spec', () => {
    expect(BOOK_1_ITEMS).toHaveLength(7);
    const ids = BOOK_1_ITEMS.map((i) => i.id).sort();
    expect(ids).toEqual([
      'brass-key',
      'broom',
      'cael-recipe-book',
      'cinder-charm',
      'defrost-candle',
      'family-photo',
      'melo-lantern',
    ]);
  });

  it('CINDER renamed to native HE (גחלת) per critique pass 2026-05-03', () => {
    expect(CINDER.nameHe).toBe('גחלת');
    expect(CINDER.nameEn).toBe('Gachelet');
  });

  it('broom item description references soot — contract for the 1.2→1.3 cross-room flow', () => {
    const broom = BOOK_1_ITEMS.find((i) => i.id === 'broom');
    expect(broom).toBeDefined();
    // The HE description must mention soot (פיח) so the cross-room narrative arc reads correctly
    expect(broom?.description.he).toMatch(/פיח/);
  });

  it('every room declares a non-negative coin reward', () => {
    for (const room of BOOK_1_HEARTH_ROOMS) {
      const conf: RoomConfig = room;
      expect(conf.rewards.coins).toBeGreaterThanOrEqual(0);
    }
  });
});
