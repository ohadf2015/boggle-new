import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { enemyArt, type ArtState } from '../combatView';

const STATES: ArtState[] = ['idle', 'hurt', 'attack', 'enraged', 'defeated'];
const WORLDS = Array.from({ length: 10 }, (_, i) => i + 1);
const onDisk = (p: string) => existsSync(join(process.cwd(), 'public', p));

describe('enemy art on disk', () => {
  for (const world of WORLDS) {
    it(`world ${world}: every boss and elite frame the stage can ask for exists`, () => {
      const missing: string[] = [];
      for (const isBoss of [true, false]) {
        for (const s of STATES) {
          const p = enemyArt(world, isBoss, s);
          if (!p || !onDisk(p)) missing.push(p || `(empty ${isBoss ? 'boss' : 'elite'} ${s})`);
        }
      }
      for (const p of [`/videos/adventure/boss-w${world}.mp4`, `/videos/adventure/boss-w${world}.webp`, `/images/adventure/play/world-${world}.webp`]) {
        if (!onDisk(p)) missing.push(p);
      }
      expect(missing).toEqual([]);
    });
  }

  it('the hero and the fx sprites exist', () => {
    for (const p of ['/images/adventure/play/hero-idle.webp', '/images/adventure/fx/fireball.webp', '/images/adventure/fx/ice-shard.webp']) {
      expect(onDisk(p), p).toBe(true);
    }
  });
});
