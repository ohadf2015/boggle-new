/**
 * Hebrew education copy must read like Hebrew, not like translated English.
 *
 * "תמיכה ילידית" is a word-for-word rendering of "native support". `ילידי` in Hebrew is the
 * indigenous-peoples register (ילידים = native inhabitants) — it has no software sense at all,
 * so the marketing page was telling teachers we have "aboriginal support for every language".
 * A native speaker reads it as a machine translation, on the one page that asks for money.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const HE = readFileSync(join(__dirname, '../../../translations/he.js'), 'utf8');

describe('Hebrew education copy', () => {
  it('has the education block at all', () => {
    // Guards the guard: a bad path would make the assertion below vacuously pass.
    expect(HE).toContain('native_multilingual');
  });

  it('never renders "native" as the indigenous-peoples word', () => {
    const calques = HE.split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /ילידי|ילידית|ילידיות|ילידיים/.test(line));

    expect(
      calques.map(({ n, line }) => `he.js:${n} ${line}`),
      'calque of English "native" — use "כשפת אם" / "מהיסוד" / "מלאה" instead',
    ).toEqual([]);
  });
});
