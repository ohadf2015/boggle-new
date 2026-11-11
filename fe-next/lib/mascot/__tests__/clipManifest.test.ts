import { describe, it, expect } from 'vitest';
import { parseClipManifest, withClip, CLIP_DIR } from '../clipManifest';
import { LEGENDARY_GAGS, gagDurationMs, type LegendaryGag } from '../legendary';

const entry = {
  id: 'bonk-dizzy',
  file: 'bonk-dizzy.webp',
  poster: 'bonk-dizzy-poster.webp',
  durationMs: 2400,
  loop: false,
  beats: { windupMs: 500, actionMs: 150, holdMs: 450 },
  tags: ['bonk'],
};

describe('parseClipManifest', () => {
  it('keeps valid entries keyed by id', () => {
    const map = parseClipManifest([entry]);
    expect(map.get('bonk-dizzy')?.durationMs).toBe(2400);
  });

  it('accepts a {clips: [...]} wrapper too', () => {
    expect(parseClipManifest({ clips: [entry] }).size).toBe(1);
  });

  it('drops malformed entries instead of throwing', () => {
    const map = parseClipManifest([entry, { id: 'x' }, null, { ...entry, id: 'bad', beats: { windupMs: 'a' } }]);
    expect([...map.keys()]).toEqual(['bonk-dizzy']);
    expect(parseClipManifest('nope').size).toBe(0);
  });
});

describe('withClip', () => {
  const bonk = LEGENDARY_GAGS.find((g) => g.clip === 'bonk-dizzy') as LegendaryGag;

  it('pilot gags reference the pilot clip ids', () => {
    const clips = LEGENDARY_GAGS.map((g) => g.clip).filter(Boolean);
    expect(clips).toEqual(expect.arrayContaining(['bonk-dizzy', 'glass-press', 'faceplant-popup']));
  });

  it('falls back to the pose beats when the clip is not in the manifest', () => {
    expect(withClip(bonk, new Map())).toBe(bonk);
  });

  it('retimes the beats to the clip and plays the clip file', () => {
    const gag = withClip(bonk, parseClipManifest([entry]));
    expect(gag.clipSrc).toBe(`${CLIP_DIR}/bonk-dizzy.webp`);
    const ms = (phase: string) => gag.beats.filter((b) => b.phase === phase).reduce((s, b) => s + b.ms, 0);
    expect(ms('windup')).toBe(500);
    expect(ms('action')).toBe(150);
    expect(ms('freeze')).toBe(450);
    expect(gagDurationMs(gag)).toBe(2400);
    expect(gag.beats.find((b) => b.phase === 'action')!.cry).toBe(true);
  });
});
