import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

async function isValid(word: string, language: string): Promise<boolean> {
  const res = await POST(new NextRequest('http://localhost/api/validate-word', {
    method: 'POST',
    body: JSON.stringify({ word, language }),
  }));
  return (await res.json()).isValid === true;
}

describe('POST /api/validate-word — languages the client cache can miss', () => {
  it('accepts a Russian dictionary word typed in wheel tile case', async () => {
    expect(await isValid('ВЕДРО', 'ru')).toBe(true);
  });

  it('rejects a Russian non-word', async () => {
    expect(await isValid('ВДРЕО', 'ru')).toBe(false);
  });

  it('accepts a base hiragana word, as the client dictionary does', async () => {
    expect(await isValid('あいさつ', 'ja')).toBe(true);
  });

  it('still accepts a kanji compound for wheels already played', async () => {
    expect(await isValid('経済発展', 'ja')).toBe(true);
  });
});
