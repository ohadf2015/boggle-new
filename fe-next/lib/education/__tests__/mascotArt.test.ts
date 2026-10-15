import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { EDU_MASCOT } from '../mascotArt';

const PUBLIC = path.resolve(__dirname, '..', '..', '..', 'public');

describe('EDU_MASCOT', () => {
  it('Given every moment, When its art is resolved, Then each file ships in public/', () => {
    for (const [moment, pose] of Object.entries(EDU_MASCOT)) {
      for (const src of [pose.still, 'video' in pose ? pose.video : undefined, 'poster' in pose ? pose.poster : undefined]) {
        if (!src) continue;
        expect(existsSync(path.join(PUBLIC, src)), `${moment}: ${src}`).toBe(true);
      }
    }
  });

  it('Given a looped pose, Then it always carries a poster for reduced motion', () => {
    for (const pose of Object.values(EDU_MASCOT)) {
      if ('video' in pose && pose.video) expect('poster' in pose && pose.poster).toBeTruthy();
    }
  });
});
