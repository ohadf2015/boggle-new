import { describe, it, expect } from 'vitest';
import { joinSuccessHref } from '@/lib/navigation/eduExitTargets';
import { signedInJoinHref } from '@/lib/education/signedInJoin';
import { joinClassHref, joinNewCodeHref } from '../joinDestinations';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const EDU = /^\/[a-z]{2}\/(student|join|education|teacher)(\/|\?|$)/;

function everyJoinTarget(locale: string): string[] {
  return [
    joinSuccessHref(locale, 'ABC123'),
    joinSuccessHref(locale, null),
    joinSuccessHref(locale, ''),
    signedInJoinHref(locale, { gameCode: 'ABC123' }),
    signedInJoinHref(locale, { gameCode: null }),
    signedInJoinHref(locale, { gameCode: 'not-a-code' }),
    joinClassHref(locale),
    joinNewCodeHref(locale),
  ];
}

describe('every place a join can send a student', () => {
  it.each(LOCALES)('stays inside edu for %s', (locale) => {
    for (const href of everyJoinTarget(locale)) {
      expect(href).not.toBe(`/${locale}`);
      expect(href).not.toBe(`/${locale}/`);
      expect(href).not.toContain('/singleplayer');
      expect(href).toMatch(EDU);
    }
  });

  it('sends an ended-game student to their class view or back to the code form', () => {
    expect(joinClassHref('he')).toBe('/he/student?class=open');
    expect(joinNewCodeHref('he')).toBe('/he/join');
  });
});
