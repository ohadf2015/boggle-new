/**
 * Rival-aware push copy. When the cron knows a leaderboard neighbour cleared
 * today's daily, swap the neutral mascot reminder for a rival-themed nudge:
 * rival's avatar as imageUrl + witty "they moved, your turn" body.
 *
 * Variant index = hash(userId|date|direction) %% 6, **constrained to the
 * current urgency tier**. Tiers split the 6 variants into 3 pairs:
 *   morning (>12h left) → variants 0–1
 *   midday  (3–12h left) → variants 2–3
 *   urgent  (≤3h left)   → variants 4–5
 * This is the "urgency escalation" axis without 3×ing the localized string
 * count — the picker filters by tier, then hashes within the pair.
 *
 * Multi-rival framing: when `additionalCount > 0`, an "and {N} more" tail
 * (locale-aware) is appended so social proof beats single-rival in cohorts.
 *
 * Sharper context: `mode`, `rivalScore`, `rankDelta` are exposed both as
 * template placeholders ({mode}, {rivalScore}, {rankDelta}) and as deep-link
 * params (m / rs / rd) so analytics + the daily landing can split on them.
 *
 * Direction encoded in deep link so analytics can split "catch-up" (above)
 * vs "defend-lead" (below) open rates.
 */

import {
  RIVAL_REMINDER_TEMPLATES_BY_LOCALE,
  RIVAL_TEMPLATE_COUNT_PER_DIRECTION,
  type RivalReminderTemplate,
} from './rivalReminderTemplates';
import type { PushLocale } from '@/backend/utils/pushTranslations';
import type { RivalDirection, RivalMode } from './dailyChallengeRivals';

export { RIVAL_TEMPLATE_COUNT_PER_DIRECTION };
export type { RivalReminderTemplate };

export type UrgencyTier = 'morning' | 'midday' | 'urgent';

/**
 * Variant → tier mapping. Index aligns with template arrays in
 * `rivalReminderTemplates.ts`. Pair-per-tier keeps the picker simple
 * (`hash % 2` selects within tier).
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
  direction: RivalDirection;
  scoreGap: number;
  /** Which daily(ies) the rival cleared. Defaults to 'both' = generic daily. */
  mode?: RivalMode;
  /** Rival's season `total_score`. Defaults to 0 (unknown). */
  rivalScore?: number;
  /** my.rank_position − rival.rank_position. Defaults to 0. */
  rankDelta?: number;
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
 * Latin/mixed-script names render as a self-contained unit inside Hebrew
 * flow. Without this, "{rival} סגר את היומי" with rival="Maya" reorders
 * unpredictably depending on adjacent punctuation. FSI (U+2068) +
 * PDI (U+2069) survives FCM/APNs payloads and is honored by Android +
 * iOS notification renderers.
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
 * Locale-aware "and N more" tail. Returns '' when count <= 0 so the body
 * trims cleanly. Leading space included so callers can concat without
 * having to think about whitespace.
 */
function othersTail(locale: PushLocale, n: number): string {
  if (n <= 0) return '';
  switch (locale) {
    case 'he': return ` ועוד ${n} כאלה`;
    case 'sv': return ` och ${n} till`;
    case 'ja': return ` 他${n}人も`;
    case 'es': return ` y ${n} más`;
    case 'en':
    default:
      return ` and ${n} more`;
  }
}

/**
 * Locale-aware urgency suffix. Short sentence appended to body to make
 * remaining-time feel concrete. `{hoursLeft}` filled by caller.
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
};

/**
 * Locale-aware noun for the daily the rival cleared. `both` falls back to a
 * generic "daily" so existing templates that say "today's {mode}" don't
 * read awkwardly when the rival swept both.
 */
const MODE_LABEL: Record<PushLocale, Record<RivalMode, string>> = {
  en: { puzzle: 'puzzle', wordHunt: 'word hunt', both: 'daily' },
  he: { puzzle: 'פאזל', wordHunt: 'ציד המילים', both: 'יומי' },
  sv: { puzzle: 'pussel', wordHunt: 'ordjakt', both: 'dagliga' },
  ja: { puzzle: 'パズル', wordHunt: 'ワードハント', both: 'デイリー' },
  es: { puzzle: 'puzzle', wordHunt: 'búsqueda', both: 'reto diario' },
};

export function pickRivalReminderCopy(input: RivalReminderInput): RivalReminderCopy {
  const {
    userId, date, hoursLeft, locale, rivalUsername, direction, scoreGap,
    mode = 'both',
    rivalScore = 0,
    rankDelta = 0,
    additionalCount = 0,
  } = input;
  const hours = Math.max(1, Math.round(hoursLeft));
  const gap = Math.max(0, Math.round(scoreGap));
  const tier = currentUrgencyTier(hours);

  // Pick variant within tier. Hash on userId|date|direction stays the
  // determinism source, modded by the count of tier-matched indices (2).
  const tierIndices: number[] = [];
  for (let i = 0; i < VARIANT_TIERS.length; i++) {
    if (VARIANT_TIERS[i] === tier) tierIndices.push(i);
  }
  const safeTierIndices = tierIndices.length > 0 ? tierIndices : [0, 1, 2, 3, 4, 5];
  const hashed = hashString(`${userId}|${date}|${direction}`);
  const variant = safeTierIndices[hashed % safeTierIndices.length];

  const localeKey: PushLocale =
    (RIVAL_REMINDER_TEMPLATES_BY_LOCALE as Record<string, unknown>)[locale]
      ? locale
      : 'en';
  const set = RIVAL_REMINDER_TEMPLATES_BY_LOCALE[localeKey];
  // Same-score rivals (gap === 0) get a dedicated tied set so we never
  // render the grammatically broken "ahead by 0" / "פיגור של 0" copy.
  const isTied = gap === 0;
  const table = isTied ? set.tied : set[direction];
  const t = table[variant] ?? table[0];

  const vars = {
    rival: bidiWrap(rivalUsername, localeKey),
    gap,
    hoursLeft: hours,
    mode: MODE_LABEL[localeKey][mode],
    rivalScore,
    rankDelta: Math.abs(rankDelta),
    // {others} placeholder optional inside templates; if absent, tail is
    // appended below.
    others: othersTail(localeKey, additionalCount).trim(),
  };

  const bodyBase = fill(t.body, vars);
  const tail =
    bodyBase.includes(vars.others) || additionalCount <= 0
      ? ''
      : othersTail(localeKey, additionalCount);
  const urgencySuffix = fill(URGENCY_SUFFIX[localeKey][tier], vars);

  const body = `${bodyBase}${tail} ${urgencySuffix}`.trim();
  const title = fill(t.title, vars);

  const deepLink =
    `/daily?src=push&kind=rival&dir=${direction}&v=${variant}` +
    `&h=${hours}&t=${tier}&m=${mode}&rs=${rivalScore}` +
    `&rd=${Math.trunc(rankDelta)}&n=${additionalCount}` +
    (isTied ? '&tied=1' : '');

  return { title, body, deepLink, variant };
}
