/**
 * Tests for the /api/dictionary/check fallback validator (Capacitor/Android path
 * used when the client IndexedDB cache is unavailable).
 *
 * Regression: the Japanese branch loaded kanji_compounds.txt + approved but NOT
 * japanese_words.txt — so the entire ~9.6k base hiragana corpus was rejected on
 * this path, disagreeing with the primary loader (backend/dictionaryLoaders.ts).
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';

function checkReq(word: string, language: string): NextRequest {
  return new NextRequest('http://localhost/api/dictionary/check', {
    method: 'POST',
    body: JSON.stringify({ word, language }),
  });
}

async function isValid(word: string, language: string): Promise<boolean> {
  const res = await POST(checkReq(word, language));
  const json = await res.json();
  return json.isValid === true;
}

describe('POST /api/dictionary/check — Japanese', () => {
  it('accepts a base hiragana word present only in japanese_words.txt (regression)', async () => {
    // あいさつ (greeting) lives in the base file but not the approved file.
    expect(await isValid('あいさつ', 'ja')).toBe(true);
  });

  it('accepts a hiragana word present only in the approved file', async () => {
    expect(await isValid('ああいう', 'ja')).toBe(true);
  });

  it('rejects a non-word string', async () => {
    expect(await isValid('ぬぬぬぬぬ', 'ja')).toBe(false);
  });
});
