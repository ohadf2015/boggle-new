// Privacy Policy content — server-renderable for SEO
//
// This describes ONLY what the code actually does. Every claim here was
// verified against the current implementation (Supabase auth/profiles,
// PostHog + GA4 + Sentry + LogRocket analytics gated behind cookie consent
// (Sentry crash reporting itself is not consent-gated), the self-declared
// birth-year age gate driving both social defaults and ad treatment, AdMob
// (native, UMP consent + TFCD/TFUA) / Google H5 Games Ads (web) excluded from
// teacher/student/classroom/education routes, Resend transactional email,
// Polar as Merchant of Record, the Google Classroom grade-passback
// integration, and the account-delete flow) before being written. Split into
// content/<locale>.ts (one per shipped locale) to stay under the 500-line
// file limit — this module just re-exports the combined map so every
// existing `from './content'` import keeps working unchanged.
// Effective date: 2026-09-25.

export type { PrivacySection, PrivacyContent } from './content/shared';
import type { PrivacyContent } from './content/shared';
import { en } from './content/en';
import { he } from './content/he';
import { sv } from './content/sv';
import { ja } from './content/ja';
import { es } from './content/es';
import { ru } from './content/ru';

export const contentByLocale: Record<string, PrivacyContent> = { en, he, sv, ja, es, ru };
