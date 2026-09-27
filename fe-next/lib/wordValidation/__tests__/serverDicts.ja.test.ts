/**
 * serverDicts Japanese validation must be HIRAGANA, matching backend MP/SP
 * board generation + Dictionary. Before this, score-sync re-validation
 * (app/api/scores/sync) loaded kanji_compounds.txt and silently REJECTED valid
 * hiragana words players had already scored. Regression guard.
 * See docs/2026-05-21-japanese-multiplayer-gameplay-audit.md.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { validateWordOnServer, __resetServerDictsForTest } from '../serverDicts';

describe('validateWordOnServer (ja) — hiragana, not kanji', () => {
  beforeEach(() => __resetServerDictsForTest());

  it('accepts a hiragana word from japanese_words.txt (was rejected by kanji dict)', async () => {
    expect(await validateWordOnServer('ねこ', 'ja')).toBe(true);
    expect(await validateWordOnServer('さくら', 'ja')).toBe(true);
  });

  it('rejects kanji compounds (unreachable on a kana board)', async () => {
    expect(await validateWordOnServer('日本', 'ja')).toBe(false);
  });
});
