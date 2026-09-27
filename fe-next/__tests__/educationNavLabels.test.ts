import { describe, it, expect } from 'vitest';

import { en } from '../translations/en.js';
import { es } from '../translations/es.js';
import { he } from '../translations/he.js';
import { ja } from '../translations/ja.js';
import { ru } from '../translations/ru.js';
import { sv } from '../translations/sv.js';

const LOCALES = { en, es, he, ja, ru, sv } as Record<string, any>;

/**
 * Every key `accessRedirectDestKey` can produce. It builds the path with a
 * template string (`education.header.breadcrumbs.${camel}`), which the repo's
 * translation checker cannot see — it only reads statically-written `t()` keys.
 * `t()` with no fallback returns the key PATH, so a locale missing one of these
 * shows a redirected teacher "Ibas a education.header.breadcrumbs.profile."
 */
const REDIRECT_DEST_KEYS = [
  'analytics',
  'classroomGame',
  'classrooms',
  'curriculum',
  'duels',
  'lessons',
  'profile',
  'reports',
  'teacher',
] as const;

describe('every redirect destination label resolves in every locale', () => {
  it.each(Object.keys(LOCALES))('%s defines all breadcrumb destinations', (locale) => {
    const crumbs = LOCALES[locale].education.header.breadcrumbs;
    const missing = REDIRECT_DEST_KEYS.filter((k) => typeof crumbs?.[k] !== 'string' || !crumbs[k].trim());
    expect(missing, `missing education.header.breadcrumbs.* in ${locale}`).toEqual([]);
  });
});

/**
 * The education header renders "Education Home" and "Back to Home" as two
 * separate entries in the same mobile drawer, plus a "Home" logo link.
 *
 * Spanish had translated `educationHome` as plain "Inicio" — identical to
 * `homeLink`, and a near-duplicate of `common.backToHome` ("Volver al Inicio").
 * A teacher on a Motorola Edge 50 Neo (LogRocket, 2026-08-30) opened that drawer
 * and bounced /es/teacher ↔ /es/student ↔ home repeatedly. Every other locale
 * qualifies the label ("Education Home", "教育ホーム", "Главная образования").
 *
 * A translation that is individually plausible can still be wrong in context.
 * Guard the distinction, not the wording.
 */
describe('education header nav labels stay distinguishable', () => {
  it.each(Object.keys(LOCALES))(
    '%s: the education hub is not labelled the same as the app home',
    (locale) => {
      const header = LOCALES[locale].education.header;
      expect(header.educationHome).toBeTruthy();
      expect(header.homeLink).toBeTruthy();
      expect(header.educationHome.trim().toLowerCase()).not.toBe(
        header.homeLink.trim().toLowerCase()
      );
    }
  );

  it.each(Object.keys(LOCALES))(
    '%s: the education hub is not labelled the same as "back to home"',
    (locale) => {
      const header = LOCALES[locale].education.header;
      const backToHome: string = LOCALES[locale].common.backToHome;
      const hub = header.educationHome.trim().toLowerCase();
      // "Inicio" vs "Volver al Inicio": not equal, but one contains the other and
      // nothing else distinguishes them in a menu. Both entries must carry a word
      // the other does not.
      expect(backToHome.toLowerCase().includes(hub)).toBe(false);
    }
  );
});
