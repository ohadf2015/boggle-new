import { describe, it, expect } from 'vitest';
import { attachTitles } from '../attachTitles';

describe('attachTitles', () => {
  it('Given signed-in rows, Then each gets its picked title or its level title; guests get none', () => {
    const rows = [{ identity: 'u:a' }, { identity: 'u:b' }, { identity: 'g:fp' }] as Array<{ identity: string; title?: string | null }>;
    attachTitles(rows, new Map([
      ['a', { chosen_title: 'NEMESIS', current_level: 3 }],
      ['b', { chosen_title: null, current_level: 25 }],
    ]));
    expect(rows.map((r) => r.title)).toEqual(['NEMESIS', 'LEXICAL_MASTER', undefined]);
  });
});
