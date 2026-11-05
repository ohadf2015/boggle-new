// @vitest-environment node
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

const loadDictionaryWords = vi.hoisted(() => vi.fn(async () => [] as string[]));
vi.mock('../dictionaryLoader', () => ({ loadDictionaryWords }));

import { POST } from '../route';
import { BLANK_CHARS, buildMatcher } from '../matcher';

let cachedList: string[] | null = null;
const russianList = () =>
  (cachedList ??= readFileSync(join(process.cwd(), 'backend', 'russian_words.txt'), 'utf8').split('\n').filter(Boolean));

let ip = 0;
async function solve(body: Record<string, unknown>) {
  ip += 1;
  const res = await POST(
    new NextRequest('http://localhost/api/word-solver', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.3.${ip >> 8}.${ip & 255}` },
      body: JSON.stringify({ language: 'ru', ...body }),
    }),
  );
  return { status: res.status, data: await res.json() };
}

describe('POST /api/word-solver, Russian', () => {
  it('finds real words from Russian letters, longest first', async () => {
    const { status, data } = await solve({ letters: 'слово' });
    expect(status).toBe(200);
    expect(data.total).toBe(data.words.length);
    expect(data.words).toEqual(expect.arrayContaining(['слово', 'волос', 'ослов', 'вол', 'сов']));
    expect(data.words.slice(0, 3).every((w: string) => w.length === 5)).toBe(true);
    const lengths = data.words.map((w: string) => w.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
  });

  it('never counts a letter more often than the rack holds it', async () => {
    const { data } = await solve({ letters: 'слово' });
    for (const word of data.words as string[]) {
      for (const ch of new Set(word.replace(/ё/g, 'е'))) {
        const inWord = [...word.replace(/ё/g, 'е')].filter((c) => c === ch).length;
        const inRack = [...'слово'].filter((c) => c === ch).length;
        expect(inWord).toBeLessThanOrEqual(inRack);
      }
    }
  });

  it('does not build the in-memory word list', async () => {
    await solve({ letters: 'кошка' });
    expect(loadDictionaryWords).not.toHaveBeenCalled();
  });

  it('treats upper and lower case alike, ignores spaces and Latin', async () => {
    const lower = await solve({ letters: 'кошка' });
    expect((await solve({ letters: 'КОШКА' })).data).toEqual(lower.data);
    expect((await solve({ letters: 'ко шка' })).data).toEqual(lower.data);
    expect((await solve({ letters: 'кошкаabc' })).data).toEqual(lower.data);
  });

  it('counts е and ё as one letter and shows the dictionary spelling', async () => {
    const withYe = await solve({ letters: 'елка' });
    const withYo = await solve({ letters: 'ёлка' });
    expect(withYo.data).toEqual(withYe.data);
    expect(withYe.data.words).toContain('ёлка');
    expect((await solve({ letters: 'ЁЛКА' })).data).toEqual(withYe.data);
  });

  it('accepts decomposed й and ё from pasted text', async () => {
    const composed = await solve({ letters: 'йод' });
    expect(composed.data.words).toContain('йод');
    expect((await solve({ letters: 'йод'.normalize('NFD') })).data).toEqual(composed.data);
  });

  it('spends blanks only on missing letters', async () => {
    const none = await solve({ letters: 'кт' });
    const blank = await solve({ letters: 'кт?' });
    expect(none.data.words).not.toContain('кот');
    expect(blank.data.words).toEqual(expect.arrayContaining(['кот', 'кит', 'кто']));
    expect(blank.data.words.every((w: string) => w.length <= 3)).toBe(true);
  });

  it('keeps the shared limits', async () => {
    expect((await solve({ letters: 'а' })).status).toBe(400);
    expect((await solve({ letters: 'а'.repeat(21) })).status).toBe(400);
    expect((await solve({ letters: 'ко????' })).status).toBe(400);
  });

  it('returns nothing for letters that are not Russian', async () => {
    const { status, data } = await solve({ letters: 'hello' });
    expect(status).toBe(200);
    expect(data).toMatchObject({ words: [], total: 0 });
  });

  it('caps the widest rack at 500 words and still reports the full count', async () => {
    const { data } = await solve({ letters: 'аеиоунстрлкмпдвгя???' });
    expect(data.capped).toBe(true);
    expect(data.total).toBeGreaterThan(100_000);
    expect(data.words).toHaveLength(500);
    const lengths = data.words.map((w: string) => w.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
  });

  it('sorts ё beside е, not after я', async () => {
    const { data } = await solve({ letters: 'елкасо', length: 4 });
    const words = data.words as string[];
    expect(words).toContain('ёлка');
    expect(words.indexOf('ёлка')).toBeLessThan(words.findIndex((w) => w.startsWith('к')));
  });

  it('applies the finder filters', async () => {
    const pattern = await solve({ letters: '', pattern: 'к_т' });
    expect(pattern.data.words).toEqual(expect.arrayContaining(['кот', 'кит']));
    expect(pattern.data.words.every((w: string) => w.length === 3 && w[0] === 'к' && w[2] === 'т')).toBe(true);

    const fromRack = await solve({ letters: 'о', pattern: 'к_т' });
    expect(fromRack.data.words).toEqual(['кот']);

    const starts = await solve({ letters: 'слово', startsWith: 'СЛ' });
    expect(starts.data.words.every((w: string) => w.startsWith('сл'))).toBe(true);
    expect(starts.data.words).toContain('слово');

    const yoFilter = await solve({ letters: 'ёлка', startsWith: 'е' });
    expect(yoFilter.data.words).toContain('ёлка');

    const exact = await solve({ letters: 'слово', length: 3 });
    expect(exact.data.words.length).toBeGreaterThan(0);
    expect(exact.data.words.every((w: string) => w.length === 3)).toBe(true);
  });

  it.each([
    { letters: 'собака' },
    { letters: 'собака??' },
    { letters: 'ёлка', length: 3 },
    { letters: 'аеиоунстр', startsWith: 'с', endsWith: 'а' },
    { letters: 'аеиоунстр?', contains: 'ст' },
    { letters: 'лка', startsWith: 'ё' },
    { letters: '', pattern: 'к_т' },
    { letters: 'о?', pattern: 'к__т' },
    { letters: 'ол', pattern: 'ё_к_' },
    { letters: '', pattern: '_____', endsWith: 'ка', contains: 'ш' },
    { letters: '', pattern: '___', length: 4 },
  ])('byte scan agrees with the shared matcher over the whole list: %j', async (body) => {
    const fold = (t: string) => t.replace(/ё/g, 'е');
    const blanks = (body.letters.match(BLANK_CHARS) || []).length;
    const matches = buildMatcher({
      rack: fold(body.letters.replace(BLANK_CHARS, '')),
      blanks,
      pattern: body.pattern ? [...fold(body.pattern)].map((ch) => (ch === '_' ? null : ch)) : null,
      startsWith: fold(body.startsWith ?? ''),
      endsWith: fold(body.endsWith ?? ''),
      contains: fold(body.contains ?? ''),
      length: body.length ?? null,
    });
    const expected = russianList().filter((w) => matches(fold(w)));
    const { data } = await solve(body);
    expect(data.total).toBe(expected.length);
    expect([...data.words].sort()).toEqual(expected.length <= 500 ? [...expected].sort() : expect.anything());
  });

  it('relies on a list of only lowercase Russian letters', () => {
    expect(russianList().every((w) => /^[а-яё]+$/.test(w))).toBe(true);
  });
});
