import { describe, it, expect } from 'vitest';
import { selectJaCandidates } from '../jaCandidates';

describe('selectJaCandidates', () => {
  const dict = new Set(['ねこ', 'さくら', 'つくえ', 'しゃしん', 'あいまっ', 'らーめん', 'くるまいす', 'ぁぃぅ']);

  it('keeps 3-4 hiragana words that are in the shipped dictionary', () => {
    const out = selectJaCandidates(['さくら', 'つくえ', 'しゃしん', 'らーめん'], dict);
    expect(out).toEqual(['さくら', 'つくえ', 'しゃしん', 'らーめん']);
  });

  it('drops words outside 3-4 characters, outside the dictionary, or not hiragana', () => {
    expect(selectJaCandidates(['ねこ', 'くるまいす', 'いるか', 'サクラ', '桜'], dict)).toEqual([]);
  });

  it('drops fragments that start or end on a small kana / ー', () => {
    expect(selectJaCandidates(['あいまっ', 'ぁぃぅ'], dict)).toEqual([]);
  });

  it('trims and dedupes the raw lines', () => {
    expect(selectJaCandidates([' さくら ', 'さくら', ''], dict)).toEqual(['さくら']);
  });
});
