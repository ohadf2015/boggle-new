// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Regression (prod QA 2026-10-07): /he/tools/word-solver listed "שלומ", "משלו"…
 * with a regular mem at the end, because the Hebrew dictionary stores
 * sofit-folded forms and the route returned them verbatim. Results must use
 * the real final letter (שלום) and not duplicate.
 */
vi.mock('../dictionaryLoader', () => ({
  loadDictionaryWords: vi.fn(async (lang: string) =>
    lang === 'he' ? ['שלומ', 'משלו', 'שלום', 'מול', 'לכ'] : ['listen', 'silent', 'tin']
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

describe('POST /api/word-solver — Hebrew final letters', () => {
  it('returns words with sofit letters at the end, deduped', async () => {
    const res = await POST(req({ letters: 'שלום', language: 'he' }, '10.0.0.1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.words).toContain('שלום');
    expect(data.words).not.toContain('שלומ');
    expect(data.words.filter((w: string) => w === 'שלום')).toHaveLength(1);
    expect(data.words).toContain('משלו');
    expect(data.words).toContain('מול');
    expect(data.total).toBe(data.words.length);
  });

  it('leaves non-Hebrew words untouched', async () => {
    const res = await POST(req({ letters: 'listen', language: 'en' }, '10.0.0.2'));
    const data = await res.json();
    expect(data.words).toEqual(['listen', 'silent', 'tin']);
  });
});
