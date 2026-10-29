import { describe, it, expect } from 'vitest';
import { parseSessionPack, parseSessionPreset, parseQuizQuestions, parseQuizSeconds } from '../sessionRunParams';

describe('ready-to-run session URL params', () => {
  it('Given a known preset, Then it is kept; junk is ignored', () => {
    expect(parseSessionPreset('friday-battle')).toBe('friday-battle');
    expect(parseSessionPreset('sped')).toBe('sped');
    expect(parseSessionPreset('turbo')).toBeUndefined();
    expect(parseSessionPreset(null)).toBeUndefined();
  });

  it('Given a question count inside the quiz bounds, Then it is kept; anything else is ignored', () => {
    expect(parseQuizQuestions('8')).toBe(8);
    expect(parseQuizQuestions('3')).toBeUndefined();
    expect(parseQuizQuestions('31')).toBeUndefined();
    expect(parseQuizQuestions('8.5')).toBeUndefined();
    expect(parseQuizQuestions('abc')).toBeUndefined();
  });

  it('Given seconds inside the quiz bounds, Then they are kept; anything else is ignored', () => {
    expect(parseQuizSeconds('20')).toBe(20);
    expect(parseQuizSeconds('4')).toBeUndefined();
    expect(parseQuizSeconds('91')).toBeUndefined();
    expect(parseQuizSeconds('')).toBeUndefined();
  });

  it('Given a themed pack code, Then it is kept; a malformed code is ignored', () => {
    expect(parseSessionPack('LC-EN-PK-AUTUMN')).toBe('LC-EN-PK-AUTUMN');
    expect(parseSessionPack('autumn')).toBeUndefined();
    expect(parseSessionPack(null)).toBeUndefined();
  });
});
