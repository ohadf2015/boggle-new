import { describe, it, expect } from 'vitest';
import { teacherProGift } from '../teacherProGift';

const EXP = '2027-09-05T12:00:00.000Z';

describe('teacherProGift email', () => {
  it('names the teacher, the deadline and the personal note, and links to the dashboard', () => {
    const { subject, html } = teacherProGift({ full_name: 'Tori Plant', locale: 'en', note: 'Thanks for Thursday.', expiresAt: EXP, pending: false });
    expect(subject.toLowerCase()).toContain('pro');
    expect(html).toContain('Hi Tori,');
    expect(html).toContain('Thanks for Thursday.');
    expect(html).toContain('September 5, 2027');
    expect(html).toContain('https://www.lexiclash.live/en/teacher');
    expect(html).toContain('lang="en"');
  });

  it('escapes the note so an admin cannot inject markup by accident', () => {
    const { html } = teacherProGift({ full_name: 'A<b>B</b> C', locale: 'en', note: '<script>x</script>', expiresAt: EXP, pending: false });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Hi A&lt;b&gt;B&lt;/b&gt;,');
  });

  it('tells a teacher with no account yet to sign up with this address', () => {
    const { html } = teacherProGift({ full_name: 'Sam', locale: 'en', expiresAt: EXP, pending: true });
    expect(html).toMatch(/sign up|create your account/i);
    expect(html).toContain('/en/education/access');
  });

  it('renders Hebrew right-to-left and falls back to English for a locale without copy', () => {
    expect(teacherProGift({ full_name: 'x', locale: 'he', expiresAt: EXP, pending: false }).html).toContain('dir="rtl"');
    const ja = teacherProGift({ full_name: 'x', locale: 'ja', expiresAt: EXP, pending: false });
    expect(ja.html).toContain('dir="ltr"');
    expect(ja.subject.toLowerCase()).toContain('pro');
  });
});

describe('teacherProGift neo layout', () => {
  it.each(['en', 'he', 'es'] as const)('%s shows the gift art and a hard-shadow button for both shapes', (locale) => {
    for (const pending of [false, true]) {
      const { subject, html } = teacherProGift({ full_name: 'Sam', locale, note: 'Line one\nLine two', expiresAt: EXP, pending });
      expect(html).toContain('/email/art/gift.png');
      expect(html).toMatch(/border-(right|left)-width:6px/);
      expect(html).not.toMatch(/undefined|\[object|NaN/);
      expect(`${subject}${html}`).not.toContain('—');
      expect(html).toContain('Line one');
      expect(html).toContain('Line two');
      if (locale === 'he') expect(html).toContain('dir="rtl"');
    }
  });

  it('never claims a charge or a trial', () => {
    const { html } = teacherProGift({ full_name: 'Sam', locale: 'en', expiresAt: EXP, pending: false });
    expect(html).not.toMatch(/\$\d/);
  });
});
