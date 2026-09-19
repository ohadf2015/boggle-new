import { describe, it, expect } from 'vitest';
import { wordCraftErrorText } from '../wordCraftErrorText';

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key}(${Object.values(params).join(',')})` : key);

describe('wordCraftErrorText', () => {
  it('maps engine codes to copy, keeping the rejected word', () => {
    expect(wordCraftErrorText(null, t)).toBeNull();
    expect(wordCraftErrorText('INVALID_WORD:QXZ', t)).toBe('wordcraft.error.invalidWord(QXZ)');
    expect(wordCraftErrorText('DISCONNECTED', t)).toBe('wordcraft.error.disconnected');
  });
});
