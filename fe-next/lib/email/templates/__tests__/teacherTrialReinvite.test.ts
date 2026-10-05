import { describe, it, expect } from 'vitest';
import { teacherTrialReinvite } from '../teacherTrialReinvite';

describe('teacherTrialReinvite', () => {
  it("links to the upgrade page in the reader's locale with the campaign UTM", () => {
    const { html } = teacherTrialReinvite({ full_name: 'Dana', locale: 'en' });
    expect(html).toContain(
      'https://www.lexiclash.live/en/teacher/upgrade?utm_source=email&amp;utm_medium=reinvite&amp;utm_campaign=teacher_trial_reinvite_2026_10',
    );
  });

  it('renders Hebrew right-to-left', () => {
    const { html } = teacherTrialReinvite({ full_name: 'דנה', locale: 'he' });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('align="right"');
    expect(html).toContain('/he/teacher/upgrade');
  });

  it("falls back to English copy but keeps the reader's locale in the link", () => {
    const { html } = teacherTrialReinvite({ full_name: 'Ana', locale: 'es' });
    expect(html).toContain('Hi Ana');
    expect(html).toContain('/es/teacher/upgrade');
  });

  it('escapes a name that contains markup', () => {
    const { html } = teacherTrialReinvite({ full_name: '<script>alert(1)</script>', locale: 'en' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('acknowledges the earlier trial honestly and asks for a reply', () => {
    const { html } = teacherTrialReinvite({ full_name: 'Dana', locale: 'en' });
    expect(html).toMatch(/fixed/i);
    expect(html).toMatch(/hit reply/i);
  });
});
