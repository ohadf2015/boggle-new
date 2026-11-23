import { describe, it, expect } from 'vitest';
import { wordVerdict, verdictMessage, reasonFromCode, noticeFromCode, VERDICT_MS, VERDICT_REPEAT_MS, WORD_VERDICT_REASONS } from '../wordVerdict';
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
  it('given an error reason, it buzzes and holds the standard time', () => {
    const v = wordVerdict('not-a-word');
    expect(v).toMatchObject({ tone: 'error', sound: true, haptic: 'error', durationMs: VERDICT_MS });
    expect(wordVerdict('too-short', { min: 3 })).toMatchObject({ tone: 'error', sound: true });
  });

  it('given an already-found word, it keeps the reject sound and error haptic the modes had, in the soft tone', () => {
    expect(wordVerdict('already-found')).toMatchObject({ tone: 'soft', sound: true, haptic: 'error' });
  });

  it('given a word that could not be checked, it only warns', () => {
    expect(wordVerdict('cant-check')).toMatchObject({ tone: 'warn', sound: false, haptic: null });
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
    const keys = [...WORD_VERDICT_REASONS.flatMap(r => [wordVerdict(r).key, wordVerdict(r, {}, true).key]), 'wordVerdict.withPenalty'];
    for (const [name, dict] of Object.entries({ en, he, es, sv, ja, ru })) {
      for (const key of keys) {
        expect(typeof lookup(dict as Record<string, unknown>, key), `${name}:${key}`).toBe('string');
      }
    }
  });

  it('maps a server error to "could not check" and an inappropriate word to its own neutral reason', () => {
    expect(reasonFromCode('error')).toBe('cant-check');
    expect(reasonFromCode('inappropriate')).toBe('inappropriate');
    expect(wordVerdict('inappropriate').key).toBe('wordVerdict.inappropriate');
  });

  it('keeps rate limits, pauses and freezes out of the word verdicts', () => {
    for (const code of ['rate_limited', 'paused', 'frozen', 'boss_frozen']) expect(reasonFromCode(code)).toBeNull();
    expect(noticeFromCode('rate_limited')).toBe('slow-down');
    expect(noticeFromCode('paused')).toBe('paused');
    expect(noticeFromCode('frozen')).toBe('frozen');
    expect(noticeFromCode('boss_frozen')).toBe('frozen');
    expect(noticeFromCode('not_in_dictionary')).toBeNull();
  });

  it('given a life cost, it appends the penalty to the reason', () => {
    expect(verdictMessage(fakeT, wordVerdict('not-on-board', { penalty: 4 }))).toBe('wordVerdict.withPenalty{"reason":"wordVerdict.notOnBoard","n":4}');
    expect(verdictMessage(fakeT, wordVerdict('not-a-word', { penalty: 0 }))).toBe('wordVerdict.notAWord');
  });
});
