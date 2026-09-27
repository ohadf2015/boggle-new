/**
 * Localized templates for the rival-aware daily-challenge push.
 *
 * EVENT-BASED framing. The only facts reliably true for every player are:
 *   1. the rival cleared TODAY's daily,
 *   2. the recipient hasn't played today,
 *   3. the clock resets at local midnight.
 * There is no trustworthy per-player "daily season points" number (the daily
 * puzzle is dead; Word Hunt has no additive score), so the copy NEVER cites a
 * score gap, a rival score, a rank delta, or a "tie" — those all rendered as 0
 * and produced the "you're tied with X" bug. See
 * docs/superpowers/specs/2026-07-03-push-rival-truthful-copy.md.
 *
 * One flat array of 6 variants per locale. Variant index maps to an urgency
 * tier via `VARIANT_TIERS` (morning/morning/midday/midday/urgent/urgent) in
 * rivalReminderCopy.ts; the picker hashes within the tier for a stable daily
 * rotation. Deep link `v` + `kind=rival` lets analytics pivot by template.
 *
 * Placeholders:
 *   {rival}      — rival's display name (bidi-wrapped in Hebrew at render)
 *   {mode}       — localized noun for the daily they cleared (Word Hunt / …)
 *   {hoursLeft}  — integer hours until local midnight (min 1)
 *
 * Copy is gender-neutral about the rival (name of unknown gender) — Hebrew and
 * Russian avoid gendered past-tense verbs and use noun/present phrasing.
 *
 * Native review pending for he/ja/sv/es/ru per `feedback-ai-hebrew-translation`
 * — ship now, iterate when native speakers review.
 */

import type { PushLocale } from '@/backend/utils/pushTranslations';

export interface RivalReminderTemplate {
  title: string;
  body: string;
}

export const RIVAL_TEMPLATE_COUNT = 6;

// Index → tier: [morning, morning, midday, midday, urgent, urgent].
// Variants 2–5 embed {hoursLeft} so the urgency suffix is suppressed for them
// (no "double time"); variants 0–1 omit it and take the "resets at midnight"
// morning suffix instead.
const EN: RivalReminderTemplate[] = [
  { title: "{rival} cleared today's {mode} 🎯", body: 'Your turn — take it back before midnight.' },
  { title: "Today's {mode} is live 🔥", body: "{rival} already solved it. Can you?" },
  { title: '{rival} beat you to it 👀', body: "Today's {mode} is waiting — {hoursLeft}h left." },
  { title: 'Your move, champ 🏆', body: "{rival} cleared today's {mode}. {hoursLeft}h to answer." },
  { title: "⏰ {rival} played — you didn't", body: "Today's {mode} closes in {hoursLeft}h. Go!" },
  { title: "Last call for today's {mode} ⏰", body: '{rival} already cleared it. {hoursLeft}h left.' },
];

// Hebrew — RTL, gender-neutral (noun/present phrasing, no gendered verbs).
// Rival names are FSI/PDI-wrapped at render (rivalReminderCopy.ts).
const HE: RivalReminderTemplate[] = [
  { title: '🎯 {rival} כבר על הלוח היום', body: 'תורך ב{mode} של היום — יש עד חצות.' },
  { title: '🔥 ה{mode} של היום פתוח', body: '{rival} כבר שם. ואת/ה?' },
  { title: '👀 {rival} כבר בפנים היום', body: 'ה{mode} של היום מחכה — נותרו {hoursLeft} שעות.' },
  { title: '🏆 תורך במשחק', body: '{rival} כבר על הלוח ב{mode} של היום. {hoursLeft} שעות לענות.' },
  { title: '⏰ {rival} כבר בפנים — ואת/ה?', body: 'ה{mode} של היום מסתיים בעוד {hoursLeft} שעות. קדימה!' },
  { title: '⏰ קריאה אחרונה ל{mode} של היום', body: '{rival} כבר על הלוח. נותרו {hoursLeft} שעות.' },
];

// Swedish — AI-authored, native review pending.
const SV: RivalReminderTemplate[] = [
  { title: '{rival} klarade dagens {mode} 🎯', body: 'Din tur — ta tillbaka det före midnatt.' },
  { title: 'Dagens {mode} är igång 🔥', body: '{rival} löste den redan. Klarar du?' },
  { title: '{rival} hann före 👀', body: 'Dagens {mode} väntar — {hoursLeft}h kvar.' },
  { title: 'Din tur, mästare 🏆', body: '{rival} klarade dagens {mode}. {hoursLeft}h att svara.' },
  { title: '⏰ {rival} spelade — inte du', body: 'Dagens {mode} stänger om {hoursLeft}h. Kör!' },
  { title: 'Sista chansen för dagens {mode} ⏰', body: '{rival} klarade den redan. {hoursLeft}h kvar.' },
];

// Japanese — AI-authored, native review pending.
const JA: RivalReminderTemplate[] = [
  { title: '🎯 {rival} が今日の{mode}をクリア', body: 'あなたの番 — 深夜までに取り返せ。' },
  { title: '🔥 今日の{mode}が公開中', body: '{rival} はもう解いた。あなたは？' },
  { title: '👀 {rival} に先を越された', body: '今日の{mode}が待っている — 残り {hoursLeft} 時間。' },
  { title: '🏆 あなたの番、チャンプ', body: '{rival} が今日の{mode}をクリア。残り {hoursLeft} 時間で応えろ。' },
  { title: '⏰ {rival} はプレイ済み — あなたは？', body: '今日の{mode}は残り {hoursLeft} 時間で締切。行こう！' },
  { title: '⏰ 今日の{mode}、ラストチャンス', body: '{rival} はもうクリア。残り {hoursLeft} 時間。' },
];

// Spanish — AI-authored, native review pending.
const ES: RivalReminderTemplate[] = [
  { title: '{rival} cerró el {mode} de hoy 🎯', body: 'Tu turno — recupéralo antes de medianoche.' },
  { title: 'El {mode} de hoy está activo 🔥', body: '{rival} ya lo resolvió. ¿Y tú?' },
  { title: '{rival} se te adelantó 👀', body: 'El {mode} de hoy te espera — quedan {hoursLeft}h.' },
  { title: 'Tu turno, campeón 🏆', body: '{rival} cerró el {mode} de hoy. {hoursLeft}h para responder.' },
  { title: '⏰ {rival} jugó — tú no', body: 'El {mode} de hoy cierra en {hoursLeft}h. ¡Vamos!' },
  { title: 'Última llamada para el {mode} de hoy ⏰', body: '{rival} ya lo cerró. Quedan {hoursLeft}h.' },
];

// Russian — gender-neutral about the rival (no gendered past-tense verbs;
// "уже в игре" / present phrasing). AI-authored, native review pending.
const RU: RivalReminderTemplate[] = [
  { title: '🎯 Сегодняшний {mode} уже в деле', body: 'Твой ход — верни своё до полуночи.' },
  { title: '🔥 {rival} уже в игре', body: 'Сегодняшний {mode} ждёт тебя.' },
  { title: '👀 Тебя уже обходят', body: 'Сегодняшний {mode} ждёт — осталось {hoursLeft} ч.' },
  { title: '🏆 Твой ход, чемпион', body: '{rival} уже в игре. У тебя {hoursLeft} ч на ответ.' },
  { title: '⏰ {rival} в игре — а ты?', body: 'Сегодняшний {mode} закроется через {hoursLeft} ч. Вперёд!' },
  { title: '⏰ Последний шанс на {mode}', body: '{rival} уже в игре. Осталось {hoursLeft} ч.' },
];

export const RIVAL_REMINDER_TEMPLATES_BY_LOCALE: Record<PushLocale, RivalReminderTemplate[]> = {
  en: EN,
  he: HE,
  sv: SV,
  ja: JA,
  es: ES,
  ru: RU,
};
