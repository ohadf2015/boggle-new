import { describe, expect, it } from 'vitest';
import { teacherDay2Value } from '../teacherDay2Value';
import { day2ReportUrl, day2UpgradeUrl } from '@/lib/education/day2ValueEmail';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

/** Softened claim only. Hard line is forbidden — a Polar trial can leave a card on file. */
const REASSURANCE: Record<(typeof LOCALES)[number], string> = {
  en: 'The free plan stays free. No card is needed to keep using it, and you will not be charged unless you choose to upgrade.',
  es: 'El plan gratuito sigue siendo gratis. No necesitas tarjeta para seguir usándolo, y no te cobraremos a menos que decidas mejorar a Pro.',
  he: 'התוכנית החינמית נשארת חינמית. לא צריך כרטיס אשראי כדי להמשיך להשתמש בה, ואין שום חיוב אלא אם בוחרים לשדרג.',
  sv: 'Den kostnadsfria planen förblir gratis. Du behöver inget kort för att fortsätta använda den, och vi debiterar dig inte om du inte själv väljer att uppgradera.',
  ja: '無料プランはそのまま無料です。使い続けるのにカードは不要で、アップグレードを選ばない限り請求されることはありません。',
  ru: 'Бесплатный план остаётся бесплатным. Карта не нужна, чтобы продолжать им пользоваться, и мы не спишем деньги, пока вы сами не решите перейти на Pro.',
};

const FORBIDDEN_HARD_CLAIM = 'no card required, nothing renews automatically';

const esc = (url: string) => url.replace(/&/g, '&amp;');

describe('teacherDay2Value', () => {
  it('states how many students joined and games were played, and links the report and Teacher Pro', () => {
    const { subject, html, replyTo } = teacherDay2Value({
      fullName: 'Ada',
      locale: 'en',
      studentsJoined: 4,
      gamesPlayed: 7,
    });
    expect(subject).toContain('4');
    expect(subject).toContain('7');
    expect(html).toContain('4 students joined, 7 games played');
    expect(html).toContain(esc(day2ReportUrl('en')));
    expect(html).toContain(esc(day2UpgradeUrl('en')));
    expect(html).toContain('$9');
    expect(html).toContain('Ada');
    expect(replyTo).toBe('ohadf2015@gmail.com');
  });

  it('renders Hebrew RTL and does not fall back to the English lead', () => {
    const { html, subject } = teacherDay2Value({
      fullName: 'מורה',
      locale: 'he',
      studentsJoined: 2,
      gamesPlayed: 1,
    });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(esc(day2ReportUrl('he')));
    expect(html).toContain(esc(day2UpgradeUrl('he')));
    expect(subject).not.toContain('students joined');
    expect(html).not.toContain('students joined');
  });

  it('escapes the teacher name and has copy for every teacher locale', () => {
    const nasty = teacherDay2Value({ fullName: '<Ada>', locale: 'en', studentsJoined: 0, gamesPlayed: 0 });
    expect(nasty.html).toContain('&lt;Ada&gt;');
    expect(nasty.html).not.toContain('<Ada>');
    expect(nasty.html).toContain('0 students joined, 0 games played');
    for (const locale of LOCALES) {
      const out = teacherDay2Value({ fullName: 'T', locale, studentsJoined: 3, gamesPlayed: 5 });
      expect(out.subject.length).toBeGreaterThan(0);
      expect(out.html).toContain(esc(day2ReportUrl(locale)));
      expect(out.html).toContain(esc(day2UpgradeUrl(locale)));
      expect(out.html).toMatch(/\$9|9\$/);
    }
  });

  it.each(LOCALES)('%s: report is the button, Pro is a quiet link, and the free-plan reassurance precedes every price', (locale) => {
    const { html } = teacherDay2Value({ fullName: 'Ada', locale, studentsJoined: 4, gamesPlayed: 7 });
    const report = html.indexOf(esc(day2ReportUrl(locale)));
    const reassurance = html.indexOf(REASSURANCE[locale]);
    const firstPrice = html.search(/\$9|9\$/);
    const pro = html.indexOf(esc(day2UpgradeUrl(locale)));

    expect(report).toBeGreaterThan(-1);
    expect(reassurance).toBeGreaterThan(-1);
    expect(firstPrice).toBeGreaterThan(reassurance);
    expect(html.toLowerCase()).not.toContain(FORBIDDEN_HARD_CLAIM);
    expect(html).not.toContain('/י');

    const reportAnchor = html.slice(html.lastIndexOf('<a', report), html.indexOf('</a>', report));
    const proAnchor = html.slice(html.lastIndexOf('<a', pro), html.indexOf('</a>', pro));
    const buttonCell = html.slice(html.lastIndexOf('<td', report), report);
    expect(buttonCell).toMatch(/border-(right|left)-width:6px/);
    expect(proAnchor).toContain('text-decoration:underline');
    expect(proAnchor).not.toMatch(/\$9|9\$/);
    expect(pro).toBeGreaterThan(report);
    expect(reportAnchor).not.toContain('text-decoration:underline');
  });

  it.each(LOCALES)('%s: uses the neo layout with mascot art and the class numbers as stats', (locale) => {
    const { html } = teacherDay2Value({ fullName: 'Ada', locale, studentsJoined: 4, gamesPlayed: 7 });
    expect(html).toMatch(/\/email\/art\/[a-z-]+\.png/);
    expect(html).toMatch(/font-size:30px;line-height:1;">4</);
    expect(html).toMatch(/font-size:30px;line-height:1;">7</);
    if (locale === 'he') expect(html).toContain('dir="rtl"');
  });
});
