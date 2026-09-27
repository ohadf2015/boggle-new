import { describe, it, expect } from 'vitest';
import { validateUgcSubmission, rankUgc, MAX_UGC_WORD_LEN } from '../ugc';

function sub(over: Record<string, unknown> = {}) {
  return { word1: 'מיץ', word2: 'אדומים', bridge: 'תפוחים', language: 'he', displayName: 'Dana', ...over };
}

describe('validateUgcSubmission — community riddle gate', () => {
  it('accepts a well-formed riddle', () => {
    expect(validateUgcSubmission(sub()).ok).toBe(true);
  });

  it('rejects empty words', () => {
    expect(validateUgcSubmission(sub({ word1: '' })).ok).toBe(false);
    expect(validateUgcSubmission(sub({ bridge: '   ' })).ok).toBe(false);
  });

  it('rejects a degenerate riddle where the bridge equals a word', () => {
    expect(validateUgcSubmission(sub({ bridge: 'מיץ' })).ok).toBe(false); // == word1
    expect(validateUgcSubmission(sub({ bridge: 'אדומים' })).ok).toBe(false); // == word2
  });

  it('rejects when the two clue words are identical', () => {
    expect(validateUgcSubmission(sub({ word1: 'בית', word2: 'בית' })).ok).toBe(false);
  });

  it('rejects an over-long word', () => {
    expect(validateUgcSubmission(sub({ bridge: 'x'.repeat(MAX_UGC_WORD_LEN + 1) })).ok).toBe(false);
  });

  it('rejects an unknown language', () => {
    expect(validateUgcSubmission(sub({ language: 'fr' })).ok).toBe(false);
  });

  it('trims whitespace in the accepted value', () => {
    const r = validateUgcSubmission(sub({ word1: '  מיץ  ' }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.word1).toBe('מיץ');
  });
});

describe('rankUgc — dynamic ranking by community votes', () => {
  it('orders by upvotes desc, then earliest created', () => {
    const rows = [
      { id: 'a', upvotes: 2, created_at: '2026-05-01' },
      { id: 'b', upvotes: 5, created_at: '2026-05-03' },
      { id: 'c', upvotes: 5, created_at: '2026-05-02' },
    ];
    expect(rankUgc(rows).map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });
});
