import { describe, it, expect } from 'vitest';
import { parseFaqProse } from './parseFaqProse';

describe('parseFaqProse', () => {
  it('returns empty array for empty input', () => {
    expect(parseFaqProse('')).toEqual([]);
  });

  it('parses straight ASCII quote Q/A blocks separated by blank lines', () => {
    const input = `"Which is harder?" Boggle. Not even close. Wordle ceiling is reachable in months.

"Which is more addictive?" Depends. Wordle hooks via scarcity.`;
    expect(parseFaqProse(input)).toEqual([
      { question: 'Which is harder?', answer: 'Boggle. Not even close. Wordle ceiling is reachable in months.' },
      { question: 'Which is more addictive?', answer: 'Depends. Wordle hooks via scarcity.' },
    ]);
  });

  it('parses Japanese 「」 quotes', () => {
    const input = `「どっちが難しい？」Boggle。比較にならない。

「どっちが中毒性高い？」性格による。`;
    expect(parseFaqProse(input)).toEqual([
      { question: 'どっちが難しい？', answer: 'Boggle。比較にならない。' },
      { question: 'どっちが中毒性高い？', answer: '性格による。' },
    ]);
  });

  it('handles Spanish inverted-question marks inside quotes', () => {
    const input = `"¿Cuál es más difícil?" Boggle. Ni de cerca.`;
    expect(parseFaqProse(input)).toEqual([
      { question: '¿Cuál es más difícil?', answer: 'Boggle. Ni de cerca.' },
    ]);
  });

  it('skips malformed blocks (no closing quote, missing answer) without throwing', () => {
    const input = `"unterminated question

"Real question?" Real answer.

"Question with no answer?"`;
    expect(parseFaqProse(input)).toEqual([
      { question: 'Real question?', answer: 'Real answer.' },
    ]);
  });

  it('preserves nested ASCII quotes inside the answer body', () => {
    const input = `"Is it free?" Yes. The "free" tier covers everything.`;
    const result = parseFaqProse(input);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe('Is it free?');
    expect(result[0].answer).toBe('Yes. The "free" tier covers everything.');
  });

  it('tolerates extra whitespace around blank-line separators', () => {
    const input = `"Q1?" A1.\n\n   \n"Q2?" A2.`;
    expect(parseFaqProse(input)).toHaveLength(2);
  });

  it('parses newline-separated Q/A (question on line 1, answer on next lines)', () => {
    const input = `Is Boggle harder than Scrabble?
Different kind of hard. Scrabble is harder to master.

Why is Scrabble more popular?
Longer games, established competitive scene.`;
    expect(parseFaqProse(input)).toEqual([
      { question: 'Is Boggle harder than Scrabble?', answer: 'Different kind of hard. Scrabble is harder to master.' },
      { question: 'Why is Scrabble more popular?', answer: 'Longer games, established competitive scene.' },
    ]);
  });

  it('treats Japanese full-width ？ as question terminator in newline format', () => {
    const input = `Boggleは難しい？
比較にならないほど。`;
    expect(parseFaqProse(input)).toEqual([
      { question: 'Boggleは難しい？', answer: '比較にならないほど。' },
    ]);
  });

  it('mixes quoted and newline formats in the same content body', () => {
    const input = `"Quoted question?" Quoted answer.

Plain question?
Plain answer.`;
    expect(parseFaqProse(input)).toHaveLength(2);
  });

  it('parses inline `Question? Answer.` single-line blocks', () => {
    const input = `Harder? Boggle, not even close.

More addictive? Depends on you. Wordle hooks via scarcity.`;
    expect(parseFaqProse(input)).toEqual([
      { question: 'Harder?', answer: 'Boggle, not even close.' },
      { question: 'More addictive?', answer: 'Depends on you. Wordle hooks via scarcity.' },
    ]);
  });

  it('skips intro paragraph (no question mark) but keeps following inline Q/A', () => {
    const input = `People keep asking me the same questions, so here.

Free? Yes. Always free.

Easy? Depends on the day.`;
    const result = parseFaqProse(input);
    expect(result).toHaveLength(2);
    expect(result[0].question).toBe('Free?');
  });
});
