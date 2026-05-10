/**
 * Rival-aware push copy. When the cron knows a leaderboard neighbour cleared
 * today's daily, swap the neutral mascot reminder for a rival-themed nudge:
 * rival's avatar as imageUrl + witty "they moved, your turn" body.
 *
 * Variant index = hash(userId|date) %% 6 — same per-user-per-day stability as
 * pickDailyReminderCopy. Direction encoded in deep link so analytics can split
 * "catch-up" (above) vs "defend-lead" (below) open rates.
 */

import {
  RIVAL_REMINDER_TEMPLATES_BY_LOCALE,
  RIVAL_TEMPLATE_COUNT_PER_DIRECTION,
  type RivalReminderTemplate,
} from './rivalReminderTemplates';
import type { PushLocale } from '@/backend/utils/pushTranslations';
import type { RivalDirection } from './dailyChallengeRivals';

export { RIVAL_TEMPLATE_COUNT_PER_DIRECTION };
export type { RivalReminderTemplate };

export interface RivalReminderInput {
  userId: string;
  date: string;
  hoursLeft: number;
  locale: PushLocale;
  rivalUsername: string;
  direction: RivalDirection;
  scoreGap: number;
}

export interface RivalReminderCopy {
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

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

export function pickRivalReminderCopy(input: RivalReminderInput): RivalReminderCopy {
  const { userId, date, hoursLeft, locale, rivalUsername, direction, scoreGap } = input;
  const variant = hashString(`${userId}|${date}|${direction}`) % RIVAL_TEMPLATE_COUNT_PER_DIRECTION;
  const hours = Math.max(1, Math.round(hoursLeft));
  const gap = Math.max(0, Math.round(scoreGap));

  const localeKey: PushLocale =
    (RIVAL_REMINDER_TEMPLATES_BY_LOCALE as Record<string, unknown>)[locale]
      ? locale
      : 'en';
  const set = RIVAL_REMINDER_TEMPLATES_BY_LOCALE[localeKey];
  const table = set[direction];
  const t = table[variant] ?? table[0];

  const vars = { rival: rivalUsername, gap, hoursLeft: hours };
  const deepLink = `/daily?src=push&kind=rival&dir=${direction}&v=${variant}&h=${hours}`;

  return {
    title: fill(t.title, vars),
    body: fill(t.body, vars),
    deepLink,
    variant,
  };
}
