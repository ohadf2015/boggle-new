import { describe, it, expect } from 'vitest';
import { LOCALE_CONFIGS } from '../locale-config';

describe('ES LocaleConfig', () => {
  const es = LOCALE_CONFIGS.es;

  it('tilePool has 27 including Ñ', () => {
    expect(es.tilePool).toContain('Ñ');
    expect(es.tilePool).toHaveLength(27);
  });

  it('normalize folds accents and uppercases', () => {
    expect(es.normalize('murciélago')).toBe('MURCIELAGO');
  });

  it('normalize preserves Ñ', () => {
    expect(es.normalize('año')).toBe('AÑO');
  });

  it('tileExtraPadding is 2', () => {
    expect(es.tileExtraPadding).toBe(2);
  });

  it('rtl is false', () => {
    expect(es.rtl).toBe(false);
  });
});
