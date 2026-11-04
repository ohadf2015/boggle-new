import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Source-scan, not a render test, on purpose: happy-dom/jsdom do not run Tailwind, so a
 * rendered assertion about horizontal insets would pass no matter what the classes say.
 * Measured in a real browser at 1440px, the offending section reported left:0 width:1440
 * while every sibling sat inside max-w-3xl — its links ran flush into the viewport edge.
 */
const SOURCE = readFileSync(join(__dirname, '..', 'PageClient.tsx'), 'utf8');

/** The block tag (<section> or <p>) that wraps a given translation key. */
function sectionTagFor(key: string): string {
  const keyAt = SOURCE.indexOf(key);
  expect(keyAt, `translation key ${key} is not in PageClient.tsx`).toBeGreaterThan(-1);
  const openAt = Math.max(SOURCE.lastIndexOf('<section', keyAt), SOURCE.lastIndexOf('<p ', keyAt));
  expect(openAt, `no block wraps ${key}`).toBeGreaterThan(-1);
  return SOURCE.slice(openAt, SOURCE.indexOf('>', openAt) + 1);
}

describe('education landing — page-level horizontal rhythm', () => {
  // Every full-width section on this page must be inset the same way. A section without a
  // container is not "slightly off"; it touches the edge of the screen while its neighbours
  // are centred, which reads as a broken page rather than a design choice.
  const SECTION_KEYS = ['eg2Land.studentNote'];

  it.each(SECTION_KEYS)('%s sits in a centred, padded container', (key) => {
    const tag = sectionTagFor(key);
    expect(tag, `section for ${key} is not centred (mx-auto)`).toMatch(/\bmx-auto\b/);
    expect(tag, `section for ${key} has no max width`).toMatch(/\bmax-w-/);
    expect(tag, `section for ${key} has no horizontal padding`).toMatch(/\bpx-\d/);
  });

  it('centres the no-account join under the closing CTA with a gap above it', () => {
    const at = SOURCE.indexOf('<NoAccountCta');
    const open = SOURCE.lastIndexOf('<div', at);
    const tag = SOURCE.slice(open, SOURCE.indexOf('>', open) + 1);
    expect(tag).toMatch(/\bjustify-center\b/);
    expect(tag).toMatch(/\bw-full\b/);
    expect(tag).toMatch(/\bpt-\d/);
  });

  it('stretches the resource links section to the page column', () => {
    // A flex child with mx-auto loses stretch and shrinks to its content.
    const page = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
    const open = page.indexOf('<section aria-label={resourcesAriaLabel}');
    const tag = page.slice(open, page.indexOf('>', open) + 1);
    expect(tag).toMatch(/\bmx-auto\b/);
    expect(tag).toMatch(/\bw-full\b/);
  });
});
