/**
 * Connections (Word Bridge / rosh-zanav) landing copy.
 * Server-rendered for SEO indexability. Client components that need
 * interactive strings outside this route use translations.connections.landing.*.
 *
 * Each locale's copy is its own file (content.<locale>.ts) so no single file
 * blows the 500-line limit. Shapes live in content.types.ts —
 * importing them from here would make the locale files circular.
 *
 * SUPPORTED_LANDING_LOCALES is the ONLY answer to "which locales have landing
 * copy". page.tsx and app/sitemap.ts both derive from it; they used to carry
 * their own hardcoded lists that disagreed with this one and with each other.
 */
export type {
  BenefitCard,
  CompareRow,
  ConnectionsLandingCopy,
  ConnectionsModeKey,
  DemoPuzzle,
  FaqEntry,
  HowToExample,
  ModeLink,
} from './content.types';

import type { ConnectionsLandingCopy } from './content.types';
import { EN_COPY } from './content.en';
import { ES_COPY } from './content.es';
import { HE_COPY } from './content.he';
import { JA_COPY } from './content.ja';
import { RU_COPY } from './content.ru';
import { SV_COPY } from './content.sv';

/**
 * Every locale with a puzzle pool and native landing copy. page.tsx (robots +
 * hreflang) and app/sitemap.ts both derive from this list — it is the only
 * answer to "which locales have landing copy".
 *
 * `ja` was excluded until 2026-08-09: PageClient short-circuited `locale ===
 * 'ja'` to a "not available" wall added in 7161c59ac (2026-05-12), three months
 * BEFORE the Japanese pool was built. The pool now has 194 active puzzles, so
 * both the wall and the landing-card gate were removed together. A test asserts
 * the pair stays consistent in both directions.
 */
export const SUPPORTED_LANDING_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type SupportedLandingLocale = (typeof SUPPORTED_LANDING_LOCALES)[number];

// Keyed by SupportedLandingLocale | 'ja': the Record stays exhaustive over the
// landing locales (add one to the list → TS demands the copy), while 'ja' rides
// along so direct visitors to /ja/connections would get Japanese copy the moment
// the PageClient wall comes down. See the note on SUPPORTED_LANDING_LOCALES.
const COPY_BY_LOCALE: Record<SupportedLandingLocale | 'ja', ConnectionsLandingCopy> = {
  en: EN_COPY,
  he: HE_COPY,
  sv: SV_COPY,
  ja: JA_COPY,
  es: ES_COPY,
  ru: RU_COPY,
};

export function getConnectionsLandingCopy(locale: string): ConnectionsLandingCopy {
  return COPY_BY_LOCALE[locale as keyof typeof COPY_BY_LOCALE] ?? EN_COPY;
}

export function isSupportedLandingLocale(locale: string): locale is SupportedLandingLocale {
  return (SUPPORTED_LANDING_LOCALES as readonly string[]).includes(locale);
}
