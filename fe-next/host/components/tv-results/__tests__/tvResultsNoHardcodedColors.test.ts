import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const DIR = join(__dirname, '..');
const OTHER_OWNER = new Set(['ClassroomTvResultsScreen.tsx']);
const FILES = readdirSync(DIR).filter((f) => /\.tsx?$/.test(f) && !OTHER_OWNER.has(f));

const HARDCODED = new RegExp([
  /#[0-9a-fA-F]{3,8}\b/.source,
  /rgba?\((?!var\()/.source,
  /\b(?:bg|text|border|ring|from|via|to|shadow|fill|stroke)-(?:gray|slate|zinc|neutral|stone|amber|yellow|green|emerald|red|orange|blue|sky|indigo|violet|purple|pink|rose|lime|teal|cyan)-\d{2,3}\b/.source,
  /\b(?:bg|text|border|ring|from|via|to|fill|stroke)-(?:white|black)\b/.source,
  /\bbg-(?:linear|radial|conic|gradient)-/.source,
  /\b(?:from|via|to)-neo-/.source,
  /\bbackdrop-blur|\bblur-(?:sm|md|lg|xl|\d)/.source,
].join('|'));
// A QR code must be true black on white for scanners; SVG presentation attributes cannot read a CSS var.
const ALLOWED = /^\s*(?:bgColor|fgColor)=/;

describe('TV results colours come from neo tokens', () => {
  it('scans the results files', () => {
    expect(FILES.length).toBeGreaterThan(8);
  });

  for (const file of FILES) {
    it(`${file} has no hardcoded colour, gradient or blur`, () => {
      const offenders = readFileSync(join(DIR, file), 'utf8')
        .split('\n')
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
        .filter(({ line }) => HARDCODED.test(line) && !ALLOWED.test(line))
        .map(({ line, n }) => `${n}: ${line.trim()}`);
      expect(offenders).toEqual([]);
    });
  }
});
