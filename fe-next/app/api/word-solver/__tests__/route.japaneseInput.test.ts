// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../dictionaryLoader', () => ({
  loadDictionaryWords: vi.fn(async (lang: string) =>
    lang === 'ja' ? ['ちょこれーと', 'こーち', 'こねこ', 'こがね', 'ねこ', '会社', '社会'] : ['cat', 'act']
  ),
}));

import { POST } from '../route';

function req(body: unknown, ip: string) {
  return new NextRequest('http://localhost/api/word-solver', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('POST /api/word-solver — Japanese input', () => {
  it('given katakana letters, then it finds the hiragana words', async () => {
    const res = await POST(req({ letters: 'チョコレート', language: 'ja' }, '10.0.1.1'));
    const data = await res.json();
    expect(data.words).toEqual(expect.arrayContaining(['ちょこれーと', 'こーち']));
  });

  it('given a full-width question mark, then it counts as a blank', async () => {
    const res = await POST(req({ letters: 'ねこ？', language: 'ja' }, '10.0.1.2'));
    const data = await res.json();
    expect(data.words).toEqual(expect.arrayContaining(['こねこ', 'こがね', 'ねこ']));
  });

  it('given kanji, then it still matches kanji words', async () => {
    const res = await POST(req({ letters: '社会', language: 'ja' }, '10.0.1.3'));
    const data = await res.json();
    expect(data.words).toEqual(expect.arrayContaining(['会社', '社会']));
  });

  it('given katakana in English mode, then it is not folded', async () => {
    const res = await POST(req({ letters: 'キャット', language: 'en' }, '10.0.1.4'));
    expect((await res.json()).words).toEqual([]);
  });
});
