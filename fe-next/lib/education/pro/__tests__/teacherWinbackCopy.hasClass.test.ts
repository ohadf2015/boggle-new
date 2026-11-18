import { describe, it, expect } from 'vitest';
import { TEACHER_WINBACK_BODY_EN, teacherWinbackCopy } from '../teacherWinbackCopy';

describe('teacherWinbackCopy for a teacher who already has a class', () => {
  it('GIVEN no class yet WHEN read THEN the measured setup line stays', () => {
    expect(teacherWinbackCopy('en').title).toBe(TEACHER_WINBACK_BODY_EN);
  });

  it.each(['en', 'he', 'es', 'sv', 'ja', 'ru'])('GIVEN %s and a class WHEN read THEN it no longer asks them to create one', (locale) => {
    const setup = teacherWinbackCopy(locale).title;
    const withClass = teacherWinbackCopy(locale, { hasClass: true }).title;
    expect(withClass).toBeTruthy();
    expect(withClass).not.toBe(setup);
    expect(setup.startsWith(withClass)).toBe(true);
  });
});
