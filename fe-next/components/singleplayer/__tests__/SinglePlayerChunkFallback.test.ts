import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const here = __dirname;

describe('singleplayer chunk fallback (no competing LCP img)', () => {
  it('is a navy box with no img and no winner.webp', () => {
    const src = readFileSync(join(here, '../SinglePlayerChunkFallback.tsx'), 'utf8');
    const body = src.slice(src.indexOf('export function'));
    expect(body).toContain('data-testid="sp-chunk-pending"');
    expect(body).not.toContain('<img');
    expect(body).not.toContain('PageLoader');
    expect(body).not.toContain('winner.webp');
    expect(body).not.toContain('winner-lcp.webp');
  });

  it('is what the playing-chunk loader and mp-handoff loader render', () => {
    const view = readFileSync(join(here, '../SinglePlayerView.tsx'), 'utf8');
    expect(view).toContain('loading: SinglePlayerChunkFallback');
    expect(view).toContain('<SinglePlayerChunkFallback />');
    expect(view).not.toMatch(/loading:\s*\(\)\s*=>[\s\S]*PageLoader/);
  });
});
