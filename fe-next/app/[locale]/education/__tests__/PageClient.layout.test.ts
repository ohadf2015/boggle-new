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

/** The <section …> tag that wraps a given translation key. */
function sectionTagFor(key: string): string {
  const keyAt = SOURCE.indexOf(key);
  expect(keyAt, `translation key ${key} is not in PageClient.tsx`).toBeGreaterThan(-1);
  const openAt = SOURCE.lastIndexOf('<section', keyAt);
  expect(openAt, `no <section> wraps ${key}`).toBeGreaterThan(-1);
  return SOURCE.slice(openAt, SOURCE.indexOf('>', openAt) + 1);
}

describe('education landing — page-level horizontal rhythm', () => {
  // Every full-width section on this page must be inset the same way. A section without a
  // container is not "slightly off"; it touches the edge of the screen while its neighbours
  // are centred, which reads as a broken page rather than a design choice.
  const SECTION_KEYS = [
    'education.landing.trust.title',
    'education.landing.furtherReading.title',
  ];

  it.each(SECTION_KEYS)('%s sits in a centred, padded container', (key) => {
    const tag = sectionTagFor(key);
    expect(tag, `section for ${key} is not centred (mx-auto)`).toMatch(/\bmx-auto\b/);
    expect(tag, `section for ${key} has no max width`).toMatch(/\bmax-w-/);
    expect(tag, `section for ${key} has no horizontal padding`).toMatch(/\bpx-\d/);
  });
});
