import { describe, it, expect } from 'vitest';
import { teacherGoodwillExtension } from '../teacherGoodwillExtension';

const NEW_EXPIRY = '2026-09-12T00:00:00.000Z';

describe('teacherGoodwillExtension', () => {
  it('names the NEW deadline in the body, not a raw ISO string', () => {
    const { html } = teacherGoodwillExtension({ full_name: 'Dana', locale: 'en', newExpiresAt: NEW_EXPIRY });
    expect(html).toContain('September 12, 2026');
    expect(html).not.toContain(NEW_EXPIRY);
  });

  it('renders Hebrew right-to-left with a Hebrew-formatted date', () => {
    const { html, subject } = teacherGoodwillExtension({ full_name: 'דנה', locale: 'he', newExpiresAt: NEW_EXPIRY });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('align="right"');
    expect(subject).toContain('14');
    expect(html).toContain('בספטמבר');
  });

  it('keeps Spanish teachers in Spanish', () => {
    const { subject, html } = teacherGoodwillExtension({ full_name: 'Ana', locale: 'es', newExpiresAt: NEW_EXPIRY });
    expect(subject).toContain('14 días');
    expect(html).toContain('/es/teacher');
  });

  it('falls back to English copy but keeps the reader\'s own locale in the link', () => {
    // sv has no copy of its own; sending them to /en/teacher would drop them
    // into a language they did not choose on the page we just fixed.
    const { html } = teacherGoodwillExtension({ full_name: 'Sven', locale: 'sv', newExpiresAt: NEW_EXPIRY });
    expect(html).toContain('Hi Sven');
    expect(html).toContain('/sv/teacher');
  });

  it('escapes a name that contains markup', () => {
    const { html } = teacherGoodwillExtension({
      full_name: '<script>alert(1)</script>',
      locale: 'en',
      newExpiresAt: NEW_EXPIRY,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
