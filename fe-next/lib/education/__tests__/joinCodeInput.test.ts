import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { foldJoinCode, joinCodeStripped } from '../joinCodeInput';
import { sanitizeJoinCode, joinCodeOverflows } from '@/components/education/join/JoinCodeField';

/** What the SI-1452 Hebrew layout (desktop and Gboard/iOS Hebrew) types for each Latin key. */
const TYPED_ON_HEBREW_LAYOUT: Record<string, string> = {
  ABC234: 'שנב234',
  QWERTY: "/'קראט",
  UPDGHJ: 'ופגעיח',
  KLZXVN: 'לךזסהמ',
  M5S6F7: 'צ5ד6כ7',
};

describe('foldJoinCode', () => {
  it.each(Object.entries(TYPED_ON_HEBREW_LAYOUT))(
    'Given %s typed with the phone still on a Hebrew layout, When folded, Then the Latin code comes back',
    (code, typed) => {
      expect(foldJoinCode(typed)).toBe(code);
    },
  );

  it('Given full-width IME input, When folded, Then it becomes ASCII', () => {
    expect(foldJoinCode('ＡＢ１２３４')).toBe('AB1234');
    expect(foldJoinCode('ｐ４５ｋｒｔ')).toBe('P45KRT');
  });

  it('Given a Latin code pasted inside quotes or after a slash, When sanitized, Then the punctuation is not read as Q or W', () => {
    expect(sanitizeJoinCode("'ABC234'")).toBe('ABC234');
    expect(sanitizeJoinCode('"ABC234"')).toBe('ABC234');
    expect(sanitizeJoinCode('/ABC234')).toBe('ABC234');
    expect(joinCodeOverflows("'ABC234'")).toBe(false);
  });

  it('Given an ordinary code with padding, When folded, Then it is trimmed and uppercased', () => {
    expect(foldJoinCode('  p45krt ')).toBe('P45KRT');
  });
});

describe('foldJoinCode on a Russian (ЙЦУКЕН) layout', () => {
  it.each([
    ['QWERTY', 'ЙЦУКЕН'],
    ['ASDFGH', 'фывапр'],
    ['ZXCVBN', 'ЯЧСМИТ'],
    ['UIOPJK', 'гшщзол'],
    ['LM12', 'дь12'],
  ])('Given %s typed with the phone still on Russian, When folded, Then the Latin key under each letter comes back', (code, typed) => {
    expect(foldJoinCode(typed)).toBe(code);
  });

  it('Given Cyrillic-layout input, When sanitized, Then no character is dropped', () => {
    expect(sanitizeJoinCode('иыв234')).toBe('BSD234');
  });
});

describe('joinCodeStripped', () => {
  it('Given a code with characters no layout can map, When checked, Then it reports they were stripped', () => {
    expect(joinCodeStripped('αβγ')).toBe(true);
    expect(joinCodeStripped('AB!')).toBe(true);
  });

  it('Given spaces, dashes or mapped layouts, When checked, Then nothing counts as stripped', () => {
    expect(joinCodeStripped('AB-12 3')).toBe(false);
    expect(joinCodeStripped('ЙЦУ')).toBe(false);
    expect(joinCodeStripped('שנב')).toBe(false);
    expect(joinCodeStripped('')).toBe(false);
  });
});

describe('sanitizeJoinCode', () => {
  it('Given Hebrew-layout input, When sanitized, Then no character is silently dropped', () => {
    expect(sanitizeJoinCode('שנב234')).toBe('ABC234');
  });

  it('Given a full-width paste with a space, When sanitized, Then the six code characters remain', () => {
    expect(sanitizeJoinCode('ＰＡＢ ２３４')).toBe('PAB234');
    expect(joinCodeOverflows('ＰＡＢ ２３４')).toBe(false);
  });
});

describe('every server door folds the code the same way', () => {
  const ROOT = path.resolve(__dirname, '..', '..', '..');
  it.each([
    'app/api/education/classroom/join/route.ts',
    'app/api/education/classroom/preview/route.ts',
    'app/api/education/classroom/live-game/route.ts',
    'app/api/education/join-code/resolve/route.ts',
    'app/api/education/guest-name/route.ts',
  ])('Given %s, Then it normalises the code with foldJoinCode', (file) => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    expect(src).toMatch(/foldJoinCode\(/);
    expect(src).not.toMatch(/[cC]ode\.trim\(\)\.toUpperCase\(\)|raw\.trim\(\)\.toUpperCase\(\)/);
  });
});
