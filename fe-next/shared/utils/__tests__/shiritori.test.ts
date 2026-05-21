/**
 * Shiritori (しりとり) chain engine — the linguistic core of the JA-native mode.
 * Spec: docs/2026-05-21-shiritori-mode-spec.md §2.
 *
 * The chain rule is "next word's HEAD kana == previous word's TAIL kana", but
 * Japanese orthography makes head/tail non-trivial: long vowel ー resolves to a
 * vowel, small kana (ゃゅょ) map to their large form, dakuten voicing is kept
 * (strict), and a word ending in ん has no successor (losing move).
 */
import { describe, it, expect } from 'vitest';
import { shiritoriHead, shiritoriTail, endsInN, chains } from '../shiritori';

describe('shiritoriHead', () => {
  it('returns the first kana', () => {
    expect(shiritoriHead('りんご')).toBe('り');
    expect(shiritoriHead('ねこ')).toBe('ね');
  });
  it('keeps dakuten on the head (strict)', () => {
    expect(shiritoriHead('ごりら')).toBe('ご');
  });
  it('first kana of a small-y mora is the leading base kana', () => {
    // ぎゅうにゅう starts ぎ (the small ゅ attaches to it) → next-after-ぎ matches
    expect(shiritoriHead('ぎゅうにゅう')).toBe('ぎ');
  });
});

describe('shiritoriTail', () => {
  it('returns the last kana for a plain word', () => {
    expect(shiritoriTail('しりとり')).toBe('り');
    expect(shiritoriTail('たまご')).toBe('ご'); // dakuten kept
  });
  it('resolves a trailing long-vowel ー to the vowel of the preceding kana', () => {
    expect(shiritoriTail('すきー')).toBe('い'); // き → vowel い
    expect(shiritoriTail('こーひー')).toBe('い'); // ひ → vowel い
    expect(shiritoriTail('かれー')).toBe('え'); // れ → vowel え
  });
  it('maps a trailing small kana to its large form', () => {
    expect(shiritoriTail('きんぎょ')).toBe('よ'); // ょ → よ
    expect(shiritoriTail('しゃ')).toBe('や'); // ゃ → や
  });
  it('returns ん when the word ends in ん', () => {
    expect(shiritoriTail('みかん')).toBe('ん');
  });
});

describe('endsInN', () => {
  it('detects the losing ん ending', () => {
    expect(endsInN('みかん')).toBe(true);
    expect(endsInN('りんご')).toBe(false);
  });
});

describe('chains', () => {
  it('accepts a valid chain (tail == head)', () => {
    expect(chains('しりとり', 'りんご')).toBe(true); // り → り
    expect(chains('たまご', 'ごりら')).toBe(true); // ご → ご
    expect(chains('すきー', 'いぬ')).toBe(true); // ー→い → い
    expect(chains('きんぎょ', 'よる')).toBe(true); // ょ→よ → よ
  });
  it('rejects a broken chain', () => {
    expect(chains('ねこ', 'いぬ')).toBe(false); // こ != い
  });
  it('is strict on dakuten (が-row does not match か-row)', () => {
    expect(chains('たまご', 'こい')).toBe(false); // ご != こ
  });
});
