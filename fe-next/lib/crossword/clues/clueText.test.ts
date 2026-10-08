import { describe, it, expect } from 'vitest';
import { cleanDefinition, isCircularClue, clueLengthOk, normalizeClue, definitionToClue, clueEndsAtClause } from './clueText';

describe('cleanDefinition', () => {
  it('strips the Datamuse POS prefix and parentheticals', () => {
    expect(
      cleanDefinition('n\t(countable) One of the large bodies of water separating the continents. '),
    ).toBe('One of the large bodies of water separating the continents');
  });
  it('strips a leading article', () => {
    expect(cleanDefinition('n\tA blue colour, like that of the ocean')).toBe(
      'Blue colour, like that of the ocean',
    );
  });
  it('collapses whitespace and trims trailing period', () => {
    expect(cleanDefinition('v\tTo   move  swiftly.')).toBe('To move swiftly');
  });
});

describe('isCircularClue', () => {
  it('flags the answer appearing verbatim', () => {
    expect(isCircularClue('A large ocean body', 'ocean')).toBe(true);
  });
  it('flags a stem/derivative of the answer', () => {
    expect(isCircularClue('One who runs fast', 'running')).toBe(true);
  });
  it('passes a clean clue', () => {
    expect(isCircularClue('Atlantic or Pacific', 'ocean')).toBe(false);
  });
  // The gate must fire for non-Latin scripts too — Hebrew banks were ~20% circular because the
  // old /[a-z]+/ tokenizer matched zero Hebrew characters and silently passed everything.
  it('flags a Hebrew answer that appears verbatim in its clue', () => {
    expect(isCircularClue('רחב; גדול', 'רחב')).toBe(true);
    expect(isCircularClue('כעס; זעם', 'כעס')).toBe(true);
  });
  it('passes a clean Hebrew clue', () => {
    expect(isCircularClue('צבע השמיים', 'כחול')).toBe(false);
  });
  it('flags a Spanish answer with accents appearing in its clue', () => {
    expect(isCircularClue('león; el rey', 'león')).toBe(true);
  });
});

describe('clueLengthOk', () => {
  it('rejects clues over the cap', () => {
    expect(clueLengthOk('x'.repeat(80))).toBe(false);
  });
  it('accepts a tight clue', () => {
    expect(clueLengthOk('Atlantic or Pacific')).toBe(true);
  });
  it('rejects empty', () => {
    expect(clueLengthOk('')).toBe(false);
  });
});

describe('normalizeClue', () => {
  it('sentence-cases and trims', () => {
    expect(normalizeClue('  swift  ocean current ')).toBe('Swift ocean current');
  });
});

describe('definitionToClue', () => {
  it('takes the first sentence and trims a definition into a clue', () => {
    expect(definitionToClue('A domestic species of feline animal. Often kept as a pet.', 'cat'))
      .toBe('Domestic species of feline animal');
  });
  it('drops a trailing "— extra" gloss and an upstream ellipsis', () => {
    expect(definitionToClue('Large stream that drains a land mass…', 'river'))
      .toBe('Large stream that drains a land mass');
    expect(definitionToClue('Elevation of land — a big hill', 'mountain')).toBe('Elevation of land');
  });
  it('caps an over-long definition on a word boundary (no ellipsis)', () => {
    const clue = definitionToClue('A series of connected metal links used for fastening pulling lifting or securing heavy objects together', 'chain')!;
    expect(clue.length).toBeLessThanOrEqual(64);
    expect(clue.endsWith('…')).toBe(false);
    expect(clue.startsWith('Series of connected metal links')).toBe(true);
  });
  it('rejects a circular clue (definition contains the answer or a derivative)', () => {
    expect(definitionToClue('A house is a building for living', 'house')).toBeNull();
    expect(definitionToClue('Houses where people live', 'house')).toBeNull();
  });
  it('works on native (non-Latin) glosses', () => {
    expect(definitionToClue('פרי אדום ועסיסי ממשפחת הסולניים', 'עגבנייה')).toBe('פרי אדום ועסיסי ממשפחת הסולניים');
  });
  it('returns null for empty input', () => {
    expect(definitionToClue('', 'x')).toBeNull();
  });
});

describe('clueEndsAtClause', () => {
  const check = (def: string) => clueEndsAtClause(def, definitionToClue(def, 'zzz')!);

  it('accepts a whole first sentence', () => {
    expect(check('Pez marino comestible. Otro sentido')).toBe(true);
  });

  it('accepts a cut at a comma clause boundary', () => {
    expect(check('самец домашней кошки, а также некоторых других из семейства кошачьих и прочих')).toBe(true);
  });

  it('accepts a comma cut before a participle or relative clause', () => {
    expect(check('Узор со множеством небольших сквозных участков, образующих рисунок на ткани или металле и прочем')).toBe(true);
    expect(check('Edificio grande de varias plantas, destinado a viviendas u oficinas de muchas personas y empresas')).toBe(true);
    expect(check('Embarcación pequeña sin cubierta, que se mueve a remo o con un motor fuera de borda y velas')).toBe(true);
  });

  it('rejects a comma cut that leaves fewer than three words', () => {
    expect(check('Отдельная территория, засаженная деревьями, кустами, цветами и прочими растениями для отдыха')).toBe(false);
  });

  it('rejects a comma cut that drops part of a list', () => {
    expect(check('глубокая убеждённость в существовании, истинности или неизбежности чего-либо, не требующая доказательств')).toBe(false);
  });

  it('rejects a hard word-boundary cut that stops mid-clause', () => {
    expect(check('Архитектурное сооружение предназначенное для жилья и имеющее стены крышу окна и двери')).toBe(false);
  });
});
