/**
 * Rival-aware push copy. When the cron knows a leaderboard neighbour cleared
 * today's daily, swap the neutral mascot reminder for a rival-themed nudge:
 * rival's avatar as imageUrl + "they moved, your turn" body.
 *
 * EVENT-BASED, not comparison-based. There is no trustworthy per-player "daily
 * season points" number (the daily puzzle is dead; Word Hunt has no additive
 * score), so this copy NEVER cites a score gap, rival score, rank delta, or a
 * "tie" — those all rendered as 0 and produced the "you're tied with X" bug.
 * See docs/superpowers/specs/2026-07-03-push-rival-truthful-copy.md.
 *
 * Variant index = hash(userId|date|mode) % tier-size, constrained to the
 * current urgency tier. Tiers split the 6 variants into 3 pairs:
 *   morning (>12h left) → variants 0–1
 *   midday  (3–12h left) → variants 2–3
 *   urgent  (≤3h left)   → variants 4–5
 *
 * Multi-rival framing: when `additionalCount > 0`, an "and {N} more cleared
 * today" tail (locale-aware) is appended so social proof beats single-rival.
 */

import {
  RIVAL_REMINDER_TEMPLATES_BY_LOCALE,
  RIVAL_TEMPLATE_COUNT,
  type RivalReminderTemplate,
} from './rivalReminderTemplates';
import type { PushLocale } from '@/backend/utils/pushTranslations';
import type { RivalMode } from './dailyChallengeRivals';
import { resolveRivalDisplayName } from './pushDisplayName';

export { RIVAL_TEMPLATE_COUNT };
export type { RivalReminderTemplate };

export type UrgencyTier = 'morning' | 'midday' | 'urgent';

/**
 * Variant → tier mapping. Index aligns with the flat template arrays in
 * `rivalReminderTemplates.ts`. Pair-per-tier keeps the picker simple.
 */
export const VARIANT_TIERS: UrgencyTier[] = [
  'morning', 'morning', 'midday', 'midday', 'urgent', 'urgent',
];

export interface RivalReminderInput {
  userId: string;
  date: string;
  hoursLeft: number;
  locale: PushLocale;
  rivalUsername: string;
  /** Which daily(ies) the rival cleared. Defaults to 'both' = generic daily. */
  mode?: RivalMode;
  /** Other in-cap rivals beyond the primary. Defaults to 0. */
  additionalCount?: number;
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

/**
 * Wrap rival username in Unicode bidi isolate markers for RTL locales so
 * Latin/mixed-script names render as a self-contained unit inside Hebrew flow.
 * FSI (U+2068) + PDI (U+2069) survives FCM/APNs payloads and is honored by
 * Android + iOS notification renderers.
 */
function bidiWrap(name: string, locale: PushLocale): string {
  if (locale === 'he') return `⁨${name}⁩`;
  return name;
}

export function currentUrgencyTier(hoursLeft: number): UrgencyTier {
  const h = Math.max(1, Math.round(hoursLeft));
  if (h <= 3) return 'urgent';
  if (h <= 12) return 'midday';
  return 'morning';
}

/**
 * Locale-aware multi-rival clause. Returns '' when count <= 0. Self-contained
 * sentence (terminal punctuation included) so it composes cleanly between the
 * body and the urgency suffix instead of gluing mid-run. Reframed to the event
 * ("cleared today"), matching the truthful copy.
 */
function othersClause(locale: PushLocale, n: number): string {
  if (n <= 0) return '';
  switch (locale) {
    case 'he': return `ועוד ${n} עברו את זה היום.`;
    case 'sv': return `+${n} till klarade det idag.`;
    case 'ja': return `他に${n}人が今日クリア。`;
    case 'es': return `+${n} más lo cerraron hoy.`;
    case 'ru': return `+${n} уже прошли сегодня.`;
    case 'en':
    default:
      return `+${n} more cleared today.`;
  }
}

/**
 * Join the body fragments into one clean string. Two invariants:
 *  1. No double-time — the urgency suffix is skipped when the chosen body
 *     already states the hours.
 *  2. Clean sentence boundaries — each fragment is terminally punctuated; we
 *     join with a single space and collapse stray runs.
 */
export function composeRivalBody(input: {
  bodyBase: string;
  othersClause: string;
  urgencySuffix: string;
  bodyHasHours: boolean;
}): string {
  const parts = [input.bodyBase, input.othersClause];
  if (!input.bodyHasHours) parts.push(input.urgencySuffix);
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Locale-aware urgency suffix. Short sentence appended to body to make
 * remaining-time concrete. `{hoursLeft}` filled by caller.
 */
const URGENCY_SUFFIX: Record<PushLocale, Record<UrgencyTier, string>> = {
  en: {
    morning: 'Resets at midnight.',
    midday: '{hoursLeft}h left today.',
    urgent: '⏰ {hoursLeft}h to closing.',
  },
  he: {
    morning: 'מתאפס בחצות.',
    midday: 'נשארו {hoursLeft} שעות.',
    urgent: '⏰ {hoursLeft}ש׳ לסגירה.',
  },
  sv: {
    morning: 'Återställs vid midnatt.',
    midday: '{hoursLeft}h kvar idag.',
    urgent: '⏰ {hoursLeft}h kvar.',
  },
  ja: {
    morning: '深夜にリセット。',
    midday: '残り {hoursLeft} 時間。',
    urgent: '⏰ 残り {hoursLeft} 時間。',
  },
  es: {
    morning: 'Se reinicia a medianoche.',
    midday: 'Quedan {hoursLeft}h hoy.',
    urgent: '⏰ {hoursLeft}h al cierre.',
  },
  ru: {
    morning: 'Сброс в полночь.',
    midday: 'Осталось {hoursLeft} ч.',
    urgent: '⏰ {hoursLeft} ч до конца.',
  },
};

/**
 * Locale-aware noun for the daily the rival cleared. `both` = a generic
 * "daily challenge" so copy reads naturally when the rival swept both.
 */
const MODE_LABEL: Record<PushLocale, Record<RivalMode, string>> = {
  en: { puzzle: 'puzzle', wordHunt: 'Word Hunt', both: 'daily challenge' },
  he: { puzzle: 'פאזל', wordHunt: 'ציד המילים', both: 'אתגר היומי' },
  sv: { puzzle: 'pussel', wordHunt: 'Ordjakt', both: 'dagliga utmaning' },
  ja: { puzzle: 'パズル', wordHunt: 'ワードハント', both: 'デイリー' },
  es: { puzzle: 'puzzle', wordHunt: 'Búsqueda', both: 'reto diario' },
  ru: { puzzle: 'пазл', wordHunt: 'Поиск слов', both: 'ежедневный вызов' },
};

export function pickRivalReminderCopy(input: RivalReminderInput): RivalReminderCopy {
  const {
    userId, date, hoursLeft, locale, rivalUsername,
    mode = 'both',
    additionalCount = 0,
  } = input;
  const hours = Math.max(1, Math.round(hoursLeft));
  const tier = currentUrgencyTier(hours);

  // Pick variant within tier. Hash on userId|date|mode stays the determinism
  // source, modded by the count of tier-matched indices (2).
  const tierIndices: number[] = [];
  for (let i = 0; i < VARIANT_TIERS.length; i++) {
    if (VARIANT_TIERS[i] === tier) tierIndices.push(i);
  }
  const safeTierIndices = tierIndices.length > 0 ? tierIndices : [0, 1, 2, 3, 4, 5];
  const hashed = hashString(`${userId}|${date}|${mode}`);
  const variant = safeTierIndices[hashed % safeTierIndices.length];

  const localeKey: PushLocale =
    (RIVAL_REMINDER_TEMPLATES_BY_LOCALE as Record<string, unknown>)[locale]
      ? locale
      : 'en';
  const set = RIVAL_REMINDER_TEMPLATES_BY_LOCALE[localeKey];
  const t = set[variant] ?? set[0];

  // Resolve a presentable rival name: real name when one survived the lookup,
  // otherwise a localized generic noun ("a rival" / "יריב" / …). Guards the
  // copy layer even if a raw placeholder ("Player_<hex>") slips through.
  const displayName = resolveRivalDisplayName([rivalUsername], localeKey);
  const vars = {
    rival: bidiWrap(displayName, localeKey),
    hoursLeft: hours,
    mode: MODE_LABEL[localeKey][mode],
  };

  const bodyBase = fill(t.body, vars);
  const urgencySuffix = fill(URGENCY_SUFFIX[localeKey][tier], vars);
  // The template's own copy already states the hours whenever it embeds
  // {hoursLeft} — only then do we suppress the urgency suffix to avoid a
  // double-time run-on.
  const bodyHasHours = /\{hoursLeft\}/.test(t.body);

  const body = composeRivalBody({
    bodyBase,
    othersClause: othersClause(localeKey, additionalCount),
    urgencySuffix,
    bodyHasHours,
  });
  const title = fill(t.title, vars);

  const deepLink =
    `/daily?src=push&kind=rival&v=${variant}` +
    `&h=${hours}&t=${tier}&m=${mode}&n=${additionalCount}`;

  return { title, body, deepLink, variant };
}
