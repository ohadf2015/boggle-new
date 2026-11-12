import { describe, it, expect } from 'vitest';
import { parseClipManifest, withClip, CLIP_DIR } from '../clipManifest';
import { GAG_CATALOG, CLIP_IDS } from '../gagCatalog';
import { variantDurationMs } from '../gagDirector';

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
  const variant = GAG_CATALOG.flatMap((g) => g.variants).find((v) => v.clip === 'bonk-dizzy')!;

  it('every custom clip is used by at least one gag', () => {
    const used = new Set(GAG_CATALOG.flatMap((g) => g.variants).map((v) => v.clip));
    for (const id of CLIP_IDS) expect(used.has(id)).toBe(true);
  });

  it('falls back to the pose beats when the clip is not in the manifest', () => {
    expect(withClip(variant, new Map())).toBe(variant);
  });

  it('retimes the beats to the clip and plays the clip file', () => {
    const v = withClip(variant, parseClipManifest([entry]));
    expect(v.clipSrc).toBe(`${CLIP_DIR}/bonk-dizzy.webp`);
    const ms = (phase: string) => v.beats.filter((b) => b.phase === phase).reduce((s, b) => s + b.ms, 0);
    expect(ms('windup')).toBe(500);
    expect(ms('action')).toBe(150);
    expect(ms('freeze')).toBe(450);
    expect(variantDurationMs(v)).toBe(2400);
    expect(v.beats.find((b) => b.phase === 'action')!.cry).toBe(variant.beats.find((b) => b.phase === 'action')!.cry);
  });
});
