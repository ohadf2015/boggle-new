/**
 * Witty/dynamic copy for the daily-challenge push reminder.
 *
 * Deterministic per user+date so the same user doesn't see the same template
 * twice in one day and so variant can be tracked in analytics via the
 * deep-link `v` param.
 *
 * Localization: 15 witty templates per supported locale (he/en/sv/ja/es) live
 * in `dailyReminderTemplates.ts`. Variant index is hash(userId|date) %% 15;
 * deep-link param `v=<variant>` is shared across locales so analytics can
 * pivot by template within a locale OR across all locales.
 *
 * Placeholders: {hoursLeft} — integer hours until local midnight (min 1).
 */
import {
  DAILY_REMINDER_TEMPLATES_BY_LOCALE,
  DAILY_REMINDER_TEMPLATE_COUNT,
  type DailyReminderTemplate,
} from './dailyReminderTemplates';
import type { PushLocale } from '@/backend/utils/pushTranslations';

// Re-exported so existing test file `dailyReminderCopy.test.ts` keeps importing
// from this module path without a churning rename.
export type { DailyReminderTemplate };
export const DAILY_REMINDER_TEMPLATES: DailyReminderTemplate[] =
  DAILY_REMINDER_TEMPLATES_BY_LOCALE.en;

export interface DailyReminderInput {
  userId: string;
  date: string; // YYYY-MM-DD
  hoursLeft: number;
  locale?: PushLocale;
}

export interface DailyReminderCopy {
  title: string;
  body: string;
  deepLink: string;
  variant: number;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function fill(template: string, hoursLeft: number): string {
  return template.replace(/\{hoursLeft\}/g, String(Math.max(1, hoursLeft)));
}

export function pickDailyReminderCopy(input: DailyReminderInput): DailyReminderCopy {
  const { userId, date, hoursLeft, locale } = input;
  const variant = hashString(`${userId}|${date}`) % DAILY_REMINDER_TEMPLATE_COUNT;
  const hours = Math.max(1, Math.round(hoursLeft));
  const deepLink = `/daily?src=push&v=${variant}&h=${hours}`;

  const localeKey: PushLocale = locale ?? 'en';
  const table = DAILY_REMINDER_TEMPLATES_BY_LOCALE[localeKey] ?? DAILY_REMINDER_TEMPLATES_BY_LOCALE.en;
  const t = table[variant] ?? table[0];

  return {
    title: fill(t.title, hours),
    body: fill(t.body, hours),
    deepLink,
    variant,
  };
}
