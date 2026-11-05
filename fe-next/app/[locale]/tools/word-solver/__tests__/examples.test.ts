// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/word-solver/route';
import { SOLVER_EXAMPLES } from '../examples';

let ipSeq = 0;
async function solve(letters: string, language: string) {
  ipSeq += 1;
  const res = await POST(
    new NextRequest('http://localhost/api/word-solver', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.2.${ipSeq}` },
      body: JSON.stringify({ letters, language }),
    })
  );
  return res.json();
}

const rows = Object.entries(SOLVER_EXAMPLES).flatMap(([locale, examples]) =>
  examples!.rows.map((row) => ({ locale, row }))
);

describe('word-solver worked examples match the real solver', () => {
  it.each(rows)('$locale: $row.letters', async ({ locale, row }) => {
    const data = await solve(row.letters, locale);
    expect(data.total).toBe(row.total);
    expect(data.words).toEqual(expect.arrayContaining(row.picks));
  }, 60_000);

  it('ja: katakana input gives the same words as hiragana', async () => {
    const hiragana = await solve('ちょこれーと', 'ja');
    const katakana = await solve('チョコレート', 'ja');
    expect(katakana.words).toEqual(hiragana.words);
  }, 60_000);
});
