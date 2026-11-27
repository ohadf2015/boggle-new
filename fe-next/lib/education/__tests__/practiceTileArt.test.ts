import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { practiceTileArt } from '../practiceTileArt';

describe('practiceTileArt posters', () => {
  it.each([
    ['blitz', 'bg-neo-pink'],
    ['flashcard', 'bg-neo-cyan'],
    ['spelling', 'bg-neo-yellow'],
  ])(
    'gives %s its accent-background poster that exists on disk',
    (id, field) => {
      const art = practiceTileArt(id);
      expect(art).toEqual({ kind: 'poster', src: `/mascot/teacher/practice-${id}-sky.webp`, field });
      expect(existsSync(join(process.cwd(), 'public', art.src))).toBe(true);
    }
  );
});
