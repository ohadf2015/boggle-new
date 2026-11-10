import { afterEach, describe, expect, it, vi } from 'vitest';
import { skyAt, type PropKind } from '@/lib/wordTowerV2/biomes';
import type { SkyProp } from '@/lib/wordTowerV2/scenery';
import { SkyLayer } from '../skyArt';

// Every prop the sky can draw. PixiJS prints a deprecation warning (Sentry
// JAVASCRIPT-NEXTJS-2M6, from the donut's sprinkles) when children are added
// to a Graphics; a later PixiJS drops those children, so the art would vanish.
const KINDS: PropKind[] = [
  'cloud', 'bird', 'balloon', 'jet', 'aurora', 'satellite', 'planet', 'comet',
  'puff', 'whale', 'astronaut', 'ufo', 'pizza', 'avocado', 'donut', 'duck', 'icecream',
];

const frame = (ts: number) => ({ w: 390, h: 844, ts, dt: 0.016, sky: skyAt(0), groundY: 844, scale: 1, floorPx: 60, reducedMotion: false });

afterEach(() => vi.restoreAllMocks());

describe('sky art', () => {
  it('given every sky prop, when drawn, then PixiJS reports no deprecated use', () => {
    const group = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const props: SkyProp[] = KINDS.map((kind, i) => ({ kind, floor: 0, x: (i / KINDS.length) * 2 - 1, size: 1, phase: 0.3 }));
    const sky = new SkyLayer(props);
    sky.update(frame(1000));
    sky.update(frame(1016));
    const text = [...group.mock.calls, ...warn.mock.calls].map((c) => c.join(' '));
    expect(text.filter((t) => t.includes('Deprecation'))).toEqual([]);
    sky.destroy();
  });
});
