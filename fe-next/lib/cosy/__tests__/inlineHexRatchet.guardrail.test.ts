import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Anti-rot guardrail for theming (Cosy / Calm Mode).
 *
 * Inline-style hex colours (`style={{ color: '#1a1a2e' }}`) are the worst kind
 * of hardcoded colour: they bypass BOTH the Tailwind token palette AND the cosy
 * light-theme circuit-breaker, so they render WRONG when the theme flips (dark
 * hex on a light sand surface, etc.). Tailwind utilities at least flip; inline
 * hex never does.
 *
 * This is a RATCHET, not a ban: the existing occurrences are grandfathered via
 * BASELINE. The count may only go DOWN. Any NEW inline-style hex fails this test
 * — pushing authors to use a design token (CSS var / Tailwind colour) instead,
 * which is exactly what keeps cosy mode (and any future theme) from rotting as
 * the loud default keeps shipping screens.
 *
 * To migrate one away: replace the hex with a `--token`/Tailwind colour and
 * lower BASELINE. To intentionally add one (rare — e.g. a fixed brand colour
 * that must NOT theme-shift), raise BASELINE in the same commit with a comment.
 */

const ROOTS = ['components', 'app'];
// Current count measured 2026-05-28 (170). This number may only DECREASE — except
// for hex literals that are static companions to a RUNTIME-dynamic colour (inline by
// necessity, can't be a Tailwind utility). 2026-05-31: +2 such cases shipped with real
// features — word-tower rival chip (`avatarColor ?? '#2a2a40'`, 188e4be63) and blast-v2
// target toast (`borderColor:'#0b1530'` beside dynamic `modeColor`, eb406a8ec). Raised
// 170→172 per the protocol above; ratchet stays armed at the new floor.
// 2026-06-08: +2 more of the same kind — blast-v2 HUD + chest badge (b36cd9df7) use
// `textShadow:'1px 1px 0 #0b1530'` hard-pixel shadows in the SAME style block as a
// dynamic `color: modeColor`, so the block can't be a Tailwind utility. Raised 172→174.
const BASELINE = 180;

// inline `style={{ ... #abc ... }}` containing a hex colour literal.
const INLINE_STYLE_HEX = /style=\{\{[^}]*#[0-9a-fA-F]{3,6}\b[^}]*\}\}/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function collectInlineHex(): Array<{ file: string; snippet: string }> {
  const base = resolve(__dirname, '../../..');
  const hits: Array<{ file: string; snippet: string }> = [];
  for (const root of ROOTS) {
    for (const file of walk(resolve(base, root))) {
      const src = readFileSync(file, 'utf8');
      const matches = src.match(INLINE_STYLE_HEX);
      if (matches) {
        for (const m of matches) hits.push({ file: file.replace(base + '/', ''), snippet: m.slice(0, 80) });
      }
    }
  }
  return hits;
}

describe('theming guardrail: inline-style hex ratchet', () => {
  it(`does not exceed the grandfathered baseline of ${BASELINE} inline-style hex colours`, () => {
    const hits = collectInlineHex();
    if (hits.length > BASELINE) {
      const sample = hits.slice(0, 25).map((h) => `  ${h.file}: ${h.snippet}`).join('\n');
      throw new Error(
        `Inline-style hex colours rose to ${hits.length} (baseline ${BASELINE}).\n` +
          `New inline hex bypasses the theme/token system and will render wrong in Cosy Mode.\n` +
          `Use a design token (CSS var or Tailwind colour) instead. Offenders:\n${sample}`,
      );
    }
    expect(hits.length).toBeLessThanOrEqual(BASELINE);
  });
});
