import { describe, expect, it } from 'vitest';
import { teacherAccessDecline } from '../teacherAccessDecline';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

describe('teacherAccessDecline', () => {
  it.each(LOCALES)('%s: neo layout, the free game link and the reapply link in the teacher language', (locale) => {
    const { subject, html } = teacherAccessDecline({ full_name: 'Jane', locale, reason: 'incomplete' });
    expect(subject.length).toBeGreaterThan(0);
    expect(html).toMatch(/\/email\/art\/[a-z-]+\.png/);
    expect(html).toMatch(/border-(right|left)-width:6px/);
    expect(html).toContain(`https://www.lexiclash.live/${locale}/multiplayer`);
    expect(html).toContain(`https://www.lexiclash.live/${locale}/education/access`);
    expect(html).toContain('Jane');
    expect(html).toContain('incomplete');
    expect(html).toContain(`lang="${locale}"`);
  });

  it('renders Hebrew right-to-left in Hebrew', () => {
    const { html } = teacherAccessDecline({ full_name: 'יעל', locale: 'he' });
    expect(html).toContain('dir="rtl"');
    expect(html).not.toContain('Play LexiClash');
  });

  it('leaves the reason out when none is given', () => {
    const withReason = teacherAccessDecline({ full_name: 'Jane', locale: 'en', reason: 'no school email' }).html;
    const without = teacherAccessDecline({ full_name: 'Jane', locale: 'en' }).html;
    expect(withReason).toContain('no school email');
    expect(without).not.toContain('Why:');
  });

  it('escapes the name and the reason', () => {
    const { html } = teacherAccessDecline({ full_name: '<b>Jane</b>', locale: 'en', reason: '<i>x</i>' });
    expect(html).not.toContain('<b>Jane</b>');
    expect(html).not.toContain('<i>x</i>');
    expect(html).toContain('&lt;b&gt;Jane&lt;/b&gt;');
  });
});
