import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const read = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8');

/** A dropped hop silently brings back the floating mute over the clear meter. */
describe('ownMute reaches the Blast HUD from the game root', () => {
  it('BlastGame hands ownMute to the stage', () => {
    expect(read('BlastGame.tsx')).toMatch(/<BlastStage[\s\S]*?ownMute=\{ownMute\}/);
  });
  it('BlastStage hands ownMute to the HUD', () => {
    expect(read('BlastStage.tsx')).toMatch(/<BlastHUD[\s\S]*?ownMute=\{ownMute\}/);
  });
});
