import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { practiceTileArt } from '../practiceTileArt';
import { BASE_PRACTICE_MODES, PRODUCE_TILE_PREFIX, WORD_TOWER_TILE_ID } from '../practicePicker';
import { VOCAB_FOCUSES } from '../vocabFocus';
import { PRODUCE_FOCUSES } from '../produceQuestions';

const EVERY_TILE_ID = [
  ...BASE_PRACTICE_MODES,
  WORD_TOWER_TILE_ID,
  ...VOCAB_FOCUSES.map((focus) => `vocab_focus:${focus}`),
  ...PRODUCE_FOCUSES.map((focus) => `${PRODUCE_TILE_PREFIX}${focus}`),
];

describe('practiceTileArt', () => {
  it.each(EVERY_TILE_ID)('gives %s its own cube-mascot sticker that exists on disk', (id) => {
    const src = practiceTileArt(id);
    expect(src).toBe(`/mascot/teacher/practice/${id.replace(':', '-')}.webp`);
    expect(existsSync(join(process.cwd(), 'public', src))).toBe(true);
  });

  it('never repeats a picture across tiles', () => {
    expect(new Set(EVERY_TILE_ID.map(practiceTileArt)).size).toBe(EVERY_TILE_ID.length);
  });

  it('falls back to a sticker that exists for an unknown tile', () => {
    expect(existsSync(join(process.cwd(), 'public', practiceTileArt('nope')))).toBe(true);
  });
});
