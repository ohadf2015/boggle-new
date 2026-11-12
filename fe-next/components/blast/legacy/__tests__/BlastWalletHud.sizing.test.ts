import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '..', 'BlastWalletHud.module.css'), 'utf8');

/** Every declaration block for an exact selector, e.g. `.reel` (not `.reels`). */
const blocks = (selector: string) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => m[1].split(',').some((s) => s.trim() === selector))
    .map((m) => m[2])
    .join(';');

describe('coin wallet digit reels', () => {
  it('Given a wide or fallback-font digit, Then its reel is not a fixed 1ch slot that cuts its sides off', () => {
    expect(blocks('.reel')).not.toMatch(/(?:^|[;\s])width\s*:/);
  });

  it('sizes each reel from its own strip, which stays in flow', () => {
    expect(blocks('.reel::before')).not.toMatch(/position\s*:\s*absolute/);
  });

  it('clips the rolling strip only top and bottom where the browser can', () => {
    expect(blocks('.reel')).toMatch(/overflow-y\s*:\s*clip/);
    expect(blocks('.reel')).toMatch(/overflow-x\s*:\s*visible/);
  });
});
