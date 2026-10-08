import { describe, it, expect } from 'vitest';
import { evaluateRuClue } from '../evaluateRuClue';

describe('evaluateRuClue', () => {
  it('accepts a short, clean, non-circular clue', () => {
    expect(evaluateRuClue('книга', 'Печатное издание в переплёте').score).toBe(1);
  });

  it('rejects a clue containing the answer', () => {
    const r = evaluateRuClue('кот', 'Домашний кот с усами');
    expect(r.score).toBe(0);
    expect(r.reason).toMatch(/circular/i);
  });

  it('rejects a clue echoing the first 4 letters of the answer (inflected form)', () => {
    expect(evaluateRuClue('лошадь', 'Лошади пасутся на лугу').score).toBe(0);
  });

  it('treats ё and е as the same letter when checking circularity', () => {
    expect(evaluateRuClue('ёжик', 'Колючий ежик из леса').score).toBe(0);
  });

  it('does not flag an unrelated word that merely shares letters mid-word', () => {
    expect(evaluateRuClue('сад', 'Место, где растут яблони').score).toBe(1);
  });

  it('rejects clues that are too short or too long', () => {
    expect(evaluateRuClue('книга', 'Том').score).toBe(0);
    expect(evaluateRuClue('книга', 'А'.repeat(65)).score).toBe(0);
  });

  it.each([
    'Часть [[речи]] в языке',
    'Предмет {{помета|разг.}} дома',
    "Животное ''домашнее''",
    'Предмет <b>мебели</b> дома',
    'Вещь&nbsp;для сидения людей',
    'Вещь | для сидения людей',
  ])('rejects leftover Wiktionary markup: %s', (clue) => {
    const r = evaluateRuClue('стул', clue);
    expect(r.score).toBe(0);
    expect(r.reason).toMatch(/markup/i);
  });

  it('rejects leftover grammar-tag / reference junk', () => {
    expect(evaluateRuClue('книга', 'Печатное издание, см. также').score).toBe(0);
    expect(evaluateRuClue('книга', 'Печатное издание —').score).toBe(0);
  });
  it.each([
    'Только ед',
    'То же, что плоть',
    'Зоол., орнитол',
    'Геол., неисч',
    'Действие по значению гл',
    'Общее прототипическое значение',
    'Кукла: детская игрушка в виде фигурки и т',
    'Круглый предмет, как правило',
    'Искусство',
  ])('rejects grammar-tag, abbreviation-cut or stub clue: %s', (clue) => {
    expect(evaluateRuClue('слово', clue).score).toBe(0);
  });

  it('keeps ordinary comma clauses', () => {
    expect(evaluateRuClue('весло', 'Приспособление для гребли, шест').score).toBe(1);
  });
});

describe('shipped Russian clue bank', () => {
  it('every entry passes the Russian gate', async () => {
    const bank = (await import('../../data/clueBank.ru.json')).default as Record<string, { clue: string }>;
    expect(Object.keys(bank).length).toBeGreaterThan(100);
    const bad = Object.entries(bank).filter(([a, e]) => evaluateRuClue(a, e.clue).score !== 1).map(([a]) => a);
    expect(bad).toEqual([]);
  });
});
