import { describe, it, expect } from 'vitest';
import { wordVerdict, verdictMessage, reasonFromCode, VERDICT_MS, VERDICT_REPEAT_MS, WORD_VERDICT_REASONS } from '../wordVerdict';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

const lookup = (dict: Record<string, unknown>, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dict);
const fakeT = (key: string, params?: Record<string, string | number>) =>
  `${key}${params ? JSON.stringify(params) : ''}`;

describe('wordVerdict', () => {
  it('given an error reason, it buzzes, breaks the combo and holds the standard time', () => {
    const v = wordVerdict('not-a-word');
    expect(v).toMatchObject({ tone: 'error', sound: true, haptic: 'error', breaksCombo: true, durationMs: VERDICT_MS });
  });

  it('given a rule slip (too short, missing center), it buzzes but keeps the combo: only real misses break it', () => {
    expect(wordVerdict('too-short', { min: 3 })).toMatchObject({ tone: 'error', sound: true, breaksCombo: false });
    expect(wordVerdict('not-on-board').breaksCombo).toBe(true);
  });

  it('given an already-found word, it is soft: no buzzer, a light tap, combo kept', () => {
    expect(wordVerdict('already-found')).toMatchObject({ tone: 'soft', sound: false, haptic: 'tap', breaksCombo: false });
  });

  it('given a word that could not be checked, it only warns', () => {
    expect(wordVerdict('cant-check')).toMatchObject({ tone: 'warn', sound: false, haptic: null, breaksCombo: false });
  });

  it('given a repeat, it holds longer and swaps to the "again" line where one exists', () => {
    expect(wordVerdict('not-a-word', {}, true)).toMatchObject({ key: 'wordVerdict.notAWordAgain', durationMs: VERDICT_REPEAT_MS });
    expect(wordVerdict('not-on-board', {}, true).key).toBe('wordVerdict.notOnBoardAgain');
    expect(wordVerdict('too-short', { min: 3 }, true).key).toBe('wordVerdict.tooShort');
  });

  it('names the rule in the message params', () => {
    expect(verdictMessage(fakeT, wordVerdict('too-short', { min: 4 }))).toBe('wordVerdict.tooShort{"min":4}');
    expect(verdictMessage(fakeT, wordVerdict('no-center', { letter: 'A' }))).toBe('wordVerdict.missingCenter{"letter":"A"}');
    expect(verdictMessage(fakeT, wordVerdict('not-a-word', { min: 3, letter: 'A' }))).toBe('wordVerdict.notAWord');
  });

  it('maps every mode and server code onto one reason without changing the codes', () => {
    expect(reasonFromCode('not_in_dictionary')).toBe('not-a-word');
    expect(reasonFromCode('invalid_shape')).toBe('not-a-word');
    expect(reasonFromCode('not_on_board')).toBe('not-on-board');
    expect(reasonFromCode('too_short')).toBe('too-short');
    expect(reasonFromCode('duplicate')).toBe('already-found');
    expect(reasonFromCode('no-center')).toBe('no-center');
    expect(reasonFromCode('bad-letters')).toBe('bad-letters');
    expect(reasonFromCode('boss_frozen')).toBeNull();
    expect(reasonFromCode(undefined)).toBeNull();
  });

  it('every verdict key resolves to a string in all six locales', () => {
    const keys = WORD_VERDICT_REASONS.flatMap(r => [wordVerdict(r).key, wordVerdict(r, {}, true).key]);
    for (const [name, dict] of Object.entries({ en, he, es, sv, ja, ru })) {
      for (const key of keys) {
        expect(typeof lookup(dict as Record<string, unknown>, key), `${name}:${key}`).toBe('string');
      }
    }
  });
});
