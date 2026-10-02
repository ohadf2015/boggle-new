import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * jsdom does not resolve Tailwind colors, so these assert the class strings.
 * Bright fills (pink #ff1493, purple #8b5cf6, red #ff3366) need black text:
 * white on them is 3.64 / 4.23 / 3.55. Navy text on purple is 4.03. Pink and
 * purple text on navy-light need the *-light tokens (6.09 and 5.84). A hover
 * that only translates, or that fades the accent (`/80`), keeps the failure.
 */
const ROOT = path.resolve(__dirname, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function quoted(src: string): string[] {
  // Newlines stay out: an apostrophe in a comment would otherwise swallow the file.
  return [...src.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)].map((m) => m[1] ?? m[2]);
}

describe('education landing contrast', () => {
  const page = read('app/[locale]/education/page.tsx');
  const client = read('app/[locale]/education/PageClient.tsx');
  const strip = read('components/education/ComparisonStrip.tsx');
  const modes = read('components/education/SixModeTour.tsx');
  const mock = read('components/education/EducationModeMock.tsx');
  const upsell = read('components/education/DistrictUpsellStrip.tsx');
  const packages = read('components/education/EducationPackages.tsx');
  const header = read('components/education/EducationHeader.tsx');

  it('puts black text on pink, purple, and red fills', () => {
    const sources = [page, mock, packages, modes];
    for (const src of sources) {
      for (const cls of quoted(src)) {
        if (/bg-neo-(pink|purple|red)\b/.test(cls) && /text-neo-/.test(cls)) {
          expect(cls, cls).toMatch(/text-neo-black/);
          expect(cls, cls).not.toMatch(/text-neo-white/);
          expect(cls, cls).not.toMatch(/text-neo-navy(?!\/)/);
        }
      }
    }

    const duels = page.slice(
      page.indexOf('/education/duels'),
      page.indexOf('/education/classroom-game'),
    );
    expect(duels).not.toMatch(/text-neo-white/);
    expect(duels).not.toMatch(/text-neo-lime/);
    expect(duels).toMatch(/text-neo-black/);

    expect(mock).toContain("text: 'text-neo-black'");
    expect(mock).not.toContain("text: 'text-neo-white'");
    expect(modes).toContain("purple: 'text-neo-black'");
    expect(modes).not.toContain("purple: 'text-neo-white'");
  });

  it('uses the light accent on navy cards, including hover', () => {
    expect(page).not.toMatch(/'text-neo-pink'/);
    expect(page).not.toMatch(/'text-neo-purple'/);
    expect(page).toContain('text-neo-pink-light');
    expect(page).toContain('text-neo-purple-light');

    expect(client).not.toMatch(/text-neo-purple(?!-light)/);
    expect(client).not.toContain('hover:text-neo-purple');

    expect(upsell).not.toContain('text-neo-purple"');
    expect(upsell).toContain('text-neo-purple-light');
  });

  it('keeps the comparison table solid and above 4.5', () => {
    // cream/40 lets the page navy through (navy-on-navy). lime-dark on cream
    // is 2.40. navy/40 on cream is 2.49. navy/50 is 3.30; /80 is 8.91.
    expect(strip).not.toContain('bg-neo-cream/40');
    expect(strip).not.toContain('text-neo-lime-dark');
    expect(strip).not.toContain('text-neo-navy/40');
    expect(strip).toContain('text-neo-navy/80');
    expect(modes).not.toContain('text-neo-navy/50');
  });

  it('does not put black text on a pink wash over navy', () => {
    // pink/50 over navy is 2.42 with black text. Solid pink + black is 5.77
    // in both themes, so the hover wash is not required.
    expect(header).not.toContain('bg-neo-pink/50');
  });
});
