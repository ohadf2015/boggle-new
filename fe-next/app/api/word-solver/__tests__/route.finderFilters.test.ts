// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../dictionaryLoader', () => ({
  loadDictionaryWords: vi.fn(async () => [
    'crane', 'crate', 'trace', 'react', 'cater', 'grace', 'brace', 'plane', 'quiz', 'quit', 'tin', 'net', 'ten', 'a',
  ]),
}));

import { POST } from '../route';

let ip = 0;
async function solve(body: unknown) {
  ip += 1;
  const res = await POST(
    new NextRequest('http://localhost/api/word-solver', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${ip}` },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, data: await res.json() };
}

describe('POST /api/word-solver — finder filters', () => {
  it('keeps the plain letters request unchanged', async () => {
    const { status, data } = await solve({ letters: 'tenx', language: 'en' });
    expect(status).toBe(200);
    expect(data.words).toEqual(['net', 'ten']);
    expect(data.total).toBe(2);
    expect(data.capped).toBe(false);
  });

  it('finds words from a pattern alone, with no rack', async () => {
    const { status, data } = await solve({ pattern: '_ra_e', language: 'en' });
    expect(status).toBe(200);
    expect(data.words).toEqual(['brace', 'crane', 'crate', 'grace', 'trace']);
  });

  it('fills only the open pattern slots from the rack', async () => {
    const { data } = await solve({ letters: 'rtn', pattern: 'c_a_e', language: 'en' });
    expect(data.words).toEqual(['crane', 'crate']);

    const narrow = await solve({ letters: 'nx', pattern: 'cra_e', language: 'en' });
    expect(narrow.data.words).toEqual(['crane']);
  });

  it('lets a ? blank stand in for one missing rack letter', async () => {
    const without = await solve({ letters: 'crae', language: 'en' });
    expect(without.data.words).not.toContain('crane');

    const withBlank = await solve({ letters: 'crae?', language: 'en' });
    expect(withBlank.data.words).toEqual(expect.arrayContaining(['crane', 'crate', 'trace', 'react', 'cater', 'grace', 'brace']));
    expect(withBlank.data.words).not.toContain('plane');
  });

  it('applies starts-with, ends-with, contains and length filters', async () => {
    expect((await solve({ pattern: '_____', startsWith: 'cr', language: 'en' })).data.words).toEqual(['crane', 'crate']);
    expect((await solve({ pattern: '_____', endsWith: 'ace', language: 'en' })).data.words).toEqual(['brace', 'grace', 'trace']);
    expect((await solve({ letters: 'quizt', contains: 'qu', length: 4, language: 'en' })).data.words).toEqual(['quit', 'quiz']);
  });

  it('rejects a pattern with symbols that are not letters or wildcards', async () => {
    const { status, data } = await solve({ pattern: 'c#a_e', language: 'en' });
    expect(status).toBe(400);
    expect(data.error).toMatch(/Pattern/);
  });

  it('rejects more than three blanks and a request with neither letters nor pattern', async () => {
    expect((await solve({ letters: 'ab????', language: 'en' })).status).toBe(400);
    expect((await solve({ startsWith: 'cr', language: 'en' })).status).toBe(400);
  });
});
