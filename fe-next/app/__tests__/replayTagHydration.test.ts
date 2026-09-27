/**
 * Session-replay tag on the root layout — the hydration-discipline half of
 * headScriptsHydration.test.ts, applied to app/layout.tsx (the root shell the
 * [locale] layout nests inside). Same bug class: a third-party <head> script
 * that lands before hydration shifts React's unkeyed head children and fires
 * #418s. The growthradar.app origin is in that test's THIRD_PARTY_HOSTS list,
 * and gr-replay.js loads a second script + POSTs chunks — the lazyOnload rule
 * applies exactly as it does to gr.js.
 *
 * Source-shape, not render, for the same reason the sibling test documents:
 * the failure needs a real third party mutating a real <head> mid-hydration.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = readFileSync(join(__dirname, '..', 'layout.tsx'), 'utf8');

const scriptTags: string[] = SOURCE.match(/<[Ss]cript\b[^>]*>/g) ?? [];
const replayTags = scriptTags.filter((t) => t.includes('gr-replay.js'));

describe('root-layout replay tag', () => {
  it('loads gr-replay.js through next/script with lazyOnload', () => {
    expect(replayTags).toHaveLength(1);
    expect(replayTags[0]).toContain('<Script');
    expect(replayTags[0]).toContain('strategy="lazyOnload"');
    // Never the raw form: same hydration race headScriptsHydration.test.ts pins for [locale].
    const raw: string[] = SOURCE.match(/<script\b[^>]*?src=[^>]*?>/g) ?? [];
    expect(raw.filter((t) => t.includes('gr-replay.js'))).toEqual([]);
  });

  it('uses the same project write key as gr.js — a replay under the wrong project is unviewable', () => {
    const keyOf = (src: string): string | null => {
      const m = SOURCE.match(new RegExp(`src="[^"]*${src}[^"]*"[^>]*data-key="([^"]+)"`));
      return m?.[1] ?? null;
    };
    const grKey = keyOf('gr\\.js');
    const replayKey = keyOf('gr-replay\\.js');
    expect(grKey).toBeTruthy();
    expect(replayKey).toBe(grKey);
  });
});
