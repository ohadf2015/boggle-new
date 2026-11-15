import { describe, it, expect } from 'vitest';
import { buildClassWinOgImageUrl, parseClassWinParams, toClassWinQuery } from '@/lib/education/classWinOgModel';

const parse = (q: string) => parseClassWinParams(new URLSearchParams(q));

describe('classWinOgModel', () => {
  it('given valid numbers and a known mode, when parsed, then they are kept with a fixed English mode label', () => {
    expect(parse('words=42&students=18&found=9&total=10&mode=word-hunt')).toEqual({
      words: 42,
      students: 18,
      found: 9,
      total: 10,
      mode: 'word-hunt',
      modeLabel: 'Word Hunt',
    });
  });

  it('given an unknown or hostile mode, when parsed, then the mode is dropped', () => {
    expect(parse('words=3&mode=<script>alert(1)</script>').mode).toBeNull();
    expect(parse('words=3&mode=Noa').modeLabel).toBeNull();
  });

  it('given non-numbers, negatives and huge values, when parsed, then they become 0 or are clamped', () => {
    const p = parse('words=abc&students=-5&found=1e9&total=99999999');
    expect(p.words).toBe(0);
    expect(p.students).toBe(0);
    expect(p.found).toBeLessThanOrEqual(9999);
    expect(p.total).toBe(9999);
  });

  it('given found above total, when parsed, then found is capped at total', () => {
    expect(parse('found=12&total=10').found).toBe(10);
  });

  it('given names, a class code or free text in the query, when parsed, then none of it reaches the payload', () => {
    const p = parse('words=5&name=Noa&class=4B&code=JU35M6&teacher=Ms%20Cohen&lesson=Animals&mode=classic');
    const blob = JSON.stringify(p);
    for (const leak of ['Noa', '4B', 'JU35M6', 'Cohen', 'Animals']) expect(blob).not.toContain(leak);
    expect(Object.keys(p).sort()).toEqual(['found', 'mode', 'modeLabel', 'students', 'total', 'words']);
  });

  it('given a payload, when the OG image url is built, then it carries only numbers and the mode id', () => {
    const url = new URL(buildClassWinOgImageUrl({ words: 7, students: 3, found: 0, total: 0, mode: 'blast' }));
    expect(url.pathname).toBe('/api/og/class-win');
    expect([...url.searchParams.keys()].sort()).toEqual(['mode', 'students', 'words']);
    expect(toClassWinQuery({ words: 7, students: 3, found: 2, total: 4, mode: null }).toString()).toBe('words=7&students=3&found=2&total=4');
  });
});
