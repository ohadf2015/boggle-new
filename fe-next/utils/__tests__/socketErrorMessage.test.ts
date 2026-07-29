import { describe, it, expect } from 'vitest';
import { socketErrorMessage, isBotErrorCode } from '../socketErrorMessage';

type Dict = Record<string, string>;
const makeT = (dict: Dict) => (key: string) => dict[key] ?? key;

describe('socketErrorMessage', () => {
  it('returns translated string for known code', () => {
    const t = makeT({ 'socketErrors.GAME_NOT_FOUND': 'Mesiba lo nimtzeet' });
    const payload = { code: 'GAME_NOT_FOUND', message: 'Game not found' };
    expect(socketErrorMessage(payload, t as any)).toBe('Mesiba lo nimtzeet');
  });

  it('falls back to backend message when translation key missing', () => {
    const t = makeT({});
    const payload = { code: 'OBSCURE_CODE', message: 'specific backend text' };
    expect(socketErrorMessage(payload, t as any)).toBe('specific backend text');
  });

  it('falls back to generic errorOccurred when no message and no key', () => {
    const t = makeT({ 'common.errorOccurred': 'Something broke!' });
    const payload = { code: 'OBSCURE_CODE' };
    expect(socketErrorMessage(payload, t as any)).toBe('Something broke!');
  });

  it('accepts string payload (pre-typed legacy callers)', () => {
    const t = makeT({});
    expect(socketErrorMessage('raw text', t as any)).toBe('raw text');
  });

  it('accepts undefined payload without throwing', () => {
    const t = makeT({ 'common.errorOccurred': 'Something broke!' });
    expect(socketErrorMessage(undefined, t as any)).toBe('Something broke!');
  });
});

describe('isBotErrorCode', () => {
  it('true for BOT_ prefixed code', () => {
    expect(isBotErrorCode({ code: 'BOT_NOT_FOUND' })).toBe(true);
  });

  it('true for legacy message containing bot substring (back-compat)', () => {
    expect(isBotErrorCode({ code: 'INTERNAL_ERROR', message: 'Cannot add bot right now' })).toBe(true);
  });

  it('false for unrelated code and message', () => {
    expect(isBotErrorCode({ code: 'GAME_NOT_FOUND', message: 'Game not found' })).toBe(false);
  });
});
