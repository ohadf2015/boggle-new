import { describe, expect, it } from 'vitest';
import { teacherDay2Value } from '../teacherDay2Value';
import { day2ReportUrl, day2UpgradeUrl } from '@/lib/education/day2ValueEmail';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

/** Softened claim only. Hard line is forbidden — a Polar trial can leave a card on file. */
const REASSURANCE: Record<(typeof LOCALES)[number], string> = {
  en: 'The free plan stays free. No card is needed to keep using it, and you will not be charged unless you choose to upgrade.',
  es: 'El plan gratuito sigue siendo gratis. No necesitas tarjeta para seguir usándolo, y no te cobraremos a menos que decidas mejorar a Pro.',
  he: 'התוכנית החינמית נשארת חינמית. לא צריך כרטיס אשראי כדי להמשיך להשתמש בה, ולא נחייב אותך אלא אם תבחר/י לשדרג.',
  sv: 'Den kostnadsfria planen förblir gratis. Du behöver inget kort för att fortsätta använda den, och vi debiterar dig inte om du inte själv väljer att uppgradera.',
  ja: '無料プランはそのまま無料です。使い続けるのにカードは不要で、アップグレードを選ばない限り請求されることはありません。',
  ru: 'Бесплатный план остаётся бесплатным. Карта не нужна, чтобы продолжать им пользоваться, и мы не спишем деньги, пока вы сами не решите перейти на Pro.',
};

const PRO_LEAD: Record<(typeof LOCALES)[number], string> = {
  en: 'If you ever want more, Teacher Pro is here:',
  es: 'Si algún día quieres más, Teacher Pro está aquí:',
  he: 'ואם מתישהו תרצה/י יותר — Teacher Pro כאן בשבילך:',
  sv: 'Om du någon gång vill ha mer finns Teacher Pro här:',
  ja: 'もっと必要になったら、Teacher Proはこちらです。',
  ru: 'Если когда-нибудь захотите больше — Teacher Pro здесь:',
};

const FORBIDDEN_HARD_CLAIM = 'no card required, nothing renews automatically';

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
    expect(html).toContain(day2ReportUrl('en'));
    expect(html).toContain(day2UpgradeUrl('en'));
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
    expect(html).toContain(day2ReportUrl('he'));
    expect(html).toContain(day2UpgradeUrl('he'));
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
      expect(out.html).toContain(day2ReportUrl(locale));
      expect(out.html).toContain(day2UpgradeUrl(locale));
      expect(out.html).toMatch(/\$9|9\$/);
    }
  });

  it.each(LOCALES)('%s: free-plan reassurance precedes every price, and Pro is a secondary link', (locale) => {
    const { html } = teacherDay2Value({ fullName: 'Ada', locale, studentsJoined: 4, gamesPlayed: 7 });
    const marker = 'id="free-plan-reassurance"';
    const report = html.indexOf(day2ReportUrl(locale));
    const reassurance = html.indexOf(marker);
    const reassuranceText = html.indexOf(REASSURANCE[locale]);
    const lead = html.indexOf(PRO_LEAD[locale]);
    const pro = html.indexOf('id="teacher-pro-line"');

    expect(report).toBeGreaterThan(-1);
    expect(reassurance).toBeGreaterThan(report);
    // <p id="free-plan-reassurance">TEXT</p> — text starts on the char after ">".
    expect(reassuranceText).toBe(reassurance + marker.length + 1);
    expect(html.slice(reassuranceText + REASSURANCE[locale].length, reassuranceText + REASSURANCE[locale].length + 6)).toBe('</p>\n<');
    const firstPrice = html.search(/\$9|9\$/);
    expect(firstPrice).toBeGreaterThan(reassuranceText);
    expect(lead).toBeGreaterThan(firstPrice);
    expect(pro).toBeGreaterThan(lead);
    expect(html.toLowerCase()).not.toContain(FORBIDDEN_HARD_CLAIM);

    const reportAnchor = html.slice(html.lastIndexOf('<a', report), html.indexOf('</a>', report));
    expect(reportAnchor).toContain('background:#7CFF6B');
    expect(reportAnchor).toContain('font-weight:800');

    const proAnchor = html.slice(html.lastIndexOf('<a', pro), html.indexOf('</a>', pro));
    expect(proAnchor).toContain(day2UpgradeUrl(locale));
    expect(proAnchor).toContain('color:#7a1fa2;font-weight:700;text-decoration:underline');
    expect(proAnchor).not.toContain('background:');
    expect(proAnchor).not.toContain('font-weight:800');
    expect(html).not.toContain('background:#ff4d8d');
  });
});
