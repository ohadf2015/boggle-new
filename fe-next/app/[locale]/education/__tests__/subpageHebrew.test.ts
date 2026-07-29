/**
 * Native-Hebrew guard for the education SEO sub-pages.
 *
 * These four landing pages shipped with machine-translation artifacts:
 * wrong plural (מילונות → מילונים), calques (בחיים ישירים → בזמן אמת,
 * דשבורד → לוח מורה), and outright typos (קוקח → לוקח, הקוצ → הקוד,
 * בעיתי → בעייתי). The tokens below are Hebrew-only, so scanning raw file
 * text catches a regression in any locale block without coupling to each
 * file's differing export shape.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const FILES = [
  'app/[locale]/education/esl-word-games/content.ts',
  'app/[locale]/education/games-for-teachers/content.ts',
  'app/[locale]/education/spelling-bee-practice/content.ts',
  'app/[locale]/education/vocabulary-games-classroom/content.ts',
];

// Each token is a known machine-translation defect, never correct Hebrew.
const FORBIDDEN = [
  'מילונות',       // wrong plural of מילון — should be מילונים
  'בחיים ישירים',  // calque of "live" — should be בזמן אמת
  'דשבורד',        // transliterated "dashboard" — should be לוח מורה
  'קוקח',          // typo for לוקח
  'הקוצ',          // typo for הקוד
  'בעיתי',         // typo for בעייתי
  'מגברת',         // typo for מגבירה
  'יש למי בוגרים', // broken sentence fragment
];

describe('education sub-pages — no machine-translation artifacts', () => {
  it.each(FILES)('%s is free of known MT defects', (rel) => {
    const text = readFileSync(resolve(process.cwd(), rel), 'utf8');
    for (const bad of FORBIDDEN) {
      expect(text, `"${bad}" found in ${rel}`).not.toContain(bad);
    }
  });
});
