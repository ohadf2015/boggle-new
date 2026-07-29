/**
 * Shiritori bot — picks a valid next word: chains from the required head, not
 * already used, and (when possible) avoids ん so the bot doesn't lose its own
 * turn. Pure + dictionary-injected. Spec: docs/2026-05-21-shiritori-mode-spec.md.
 */
import { describe, it, expect } from 'vitest';
import { pickShiritoriWord } from '../shiritoriBot';

const WORDS = ['しりとり', 'りんご', 'りす', 'ごりら', 'みかん', 'ねこ'];

describe('pickShiritoriWord', () => {
  it('opening move (no required head) returns an unused dictionary word', () => {
    const w = pickShiritoriWord(null, new Set(), WORDS, () => 0);
    expect(WORDS).toContain(w);
  });

  it('picks a word whose head matches the required kana', () => {
    // requiredHead り → candidates りんご / りす (both start り); ねこ/ごりら excluded
    const w = pickShiritoriWord('り', new Set(), WORDS, () => 0);
    expect(['りんご', 'りす']).toContain(w);
  });

  it('skips already-used words', () => {
    // requiredHead り, りんご used → only りす remains
    const w = pickShiritoriWord('り', new Set(['りんご']), WORDS, () => 0);
    expect(w).toBe('りす');
  });

  it('prefers a non-ん word over a ん-ending one (survival)', () => {
    // requiredHead み → only みかん (ends ん). requiredHead り has safe options.
    // Here force a head with both: add a safe + risky candidate.
    const words = ['みかん', 'みち']; // both start み; みかん ends ん, みち is safe
    const w = pickShiritoriWord('み', new Set(), words, () => 0);
    expect(w).toBe('みち');
  });

  it('falls back to a ん-ending word only when nothing else chains', () => {
    const w = pickShiritoriWord('み', new Set(), ['みかん'], () => 0);
    expect(w).toBe('みかん');
  });

  it('returns null when no candidate chains (bot is stuck)', () => {
    const w = pickShiritoriWord('ぬ', new Set(), WORDS, () => 0);
    expect(w).toBeNull();
  });
});
