import { describe, it, expect } from 'vitest';
import { endsDangling } from '../danglingEnd';
import { evaluateRuClue } from '../evaluateRuClue';

describe('endsDangling', () => {
  it('flags Spanish clues cut off after an article or preposition', () => {
    expect(endsDangling('Utensilio compuesto por cerdas agrupadas en el', 'es')).toBe(true);
    expect(endsDangling('Forma de energía causada por la vibración rápida de las', 'es')).toBe(true);
  });
  it('flags Russian clues cut off after a conjunction or preposition', () => {
    expect(endsDangling('Выражение стоимости товара или', 'ru')).toBe(true);
  });
  it('passes complete clues', () => {
    expect(endsDangling('Pez de la familia de los gádidos', 'es')).toBe(false);
    expect(endsDangling('Безлесная равнина', 'ru')).toBe(false);
  });
  it('is wired into the Russian gate', () => {
    expect(evaluateRuClue('цена', 'Выражение стоимости товара или').score).toBe(0);
  });
});
