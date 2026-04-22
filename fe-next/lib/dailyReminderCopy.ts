/**
 * Witty/dynamic copy for the daily-challenge push reminder.
 *
 * Deterministic per user+date so the same user doesn't see the same template
 * twice in one day and so variant can be tracked in analytics via the
 * deep-link `v` param.
 *
 * Localization: English has 15 witty variants. Non-English locales use the
 * shared `translatePush('dailyChallenge.*')` strings — variant is still hashed
 * for analytics bucketing (open-rate by hash bucket), even though copy is
 * locale-constant. Maintaining 15 witty templates × 5 locales is out of scope.
 *
 * Placeholders: {hoursLeft} — integer hours until local midnight.
 */
import { translatePush, type PushLocale } from '@/backend/utils/pushTranslations';

export interface DailyReminderTemplate {
  title: string;
  body: string;
}

export const DAILY_REMINDER_TEMPLATES: DailyReminderTemplate[] = [
  { title: 'Your brain called 📞', body: "It says today's daily is still unsolved. {hoursLeft}h left." },
  { title: 'Tick tock, word jock ⏰', body: "Daily challenge won't solve itself. {hoursLeft}h on the clock." },
  { title: 'Plot twist 📖', body: "You haven't played today yet. Fix that in 60 seconds." },
  { title: 'The board misses you 🧩', body: 'Letters are set. {hoursLeft}h until the door closes.' },
  { title: 'One puzzle. Your name. ✍️', body: "Today's daily is waiting for a champion." },
  { title: 'Streak check 🔥', body: "Don't let {hoursLeft}h slip — keep the chain alive." },
  { title: 'Your daily called in sick 😷', body: 'Just kidding. It wants a fight. Tap in.' },
  { title: '{hoursLeft}h left, word wizard 🧙', body: 'One quick round before the board resets.' },
  { title: 'The letters are gossiping 🤫', body: 'They say you ghosted them. Prove them wrong.' },
  { title: "Don't let today ghost you 👻", body: "60 seconds. That's all the daily needs." },
  { title: 'Challenge: unsolved 🔍', body: 'Will today have your name on it? {hoursLeft}h left.' },
  { title: 'Soft reminder 💌', body: "Daily's open. Brain's warm. Go." },
  { title: 'Clock says {hoursLeft}h ⏳', body: 'Daily challenge says: come get it.' },
  { title: 'Word nerd alert 🚨', body: "Today's puzzle hasn't met its match yet. You?" },
  { title: 'Midnight speedrun? 🏁', body: '{hoursLeft}h to solve. Less if you hustle.' },
];

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
  const variant = hashString(`${userId}|${date}`) % DAILY_REMINDER_TEMPLATES.length;
  const hours = Math.max(1, Math.round(hoursLeft));
  const deepLink = `/daily?src=push&v=${variant}&h=${hours}`;

  let title: string;
  let body: string;
  if (!locale || locale === 'en') {
    const t = DAILY_REMINDER_TEMPLATES[variant];
    title = fill(t.title, hours);
    body = fill(t.body, hours);
  } else {
    title = translatePush(locale, 'dailyChallenge.title');
    body = translatePush(locale, 'dailyChallenge.body');
  }

  return { title, body, deepLink, variant };
}
