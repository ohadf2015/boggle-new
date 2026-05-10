/**
 * Localized witty templates for the rival-aware daily-challenge push.
 *
 * Two table sets per locale:
 *  - `above`: rival is ahead of user on season leaderboard → "catch up" energy
 *  - `below`: rival is just behind user → "they're closing in, defend" energy
 *
 * 6 variants per direction. Variant index = hash(userId|date) %% 6 so each
 * user gets a stable rotation per day. Deep link `dir` + `v` + `kind=rival`
 * lets analytics pivot by template within a locale.
 *
 * Placeholders:
 *   {rival}      — rival's display username
 *   {gap}        — absolute season-score gap (integer)
 *   {hoursLeft}  — integer hours until local midnight (min 1)
 *
 * Native review pending — `he`, `ja`, `sv`, `es` copy authored by AI per
 * project policy `feedback-ai-hebrew-translation` (ship now, iterate when
 * native speakers review). Imperfect localized copy beats English fallback.
 */

import type { PushLocale } from '@/backend/utils/pushTranslations';

export interface RivalReminderTemplate {
  title: string;
  body: string;
}

export interface RivalReminderTemplateSet {
  above: RivalReminderTemplate[];
  below: RivalReminderTemplate[];
}

const EN: RivalReminderTemplateSet = {
  above: [
    { title: '{rival} just posted today 👀', body: "They're {gap} ahead of you. {hoursLeft}h to claw back." },
    { title: 'Maya pace alert 🏃', body: '{rival} crushed today\'s daily. Your turn — they\'re only {gap} ahead.' },
    { title: '{rival} made their move ♟️', body: "Counter in 60 seconds. {hoursLeft}h on the clock." },
    { title: 'You\'re behind by {gap} 📈', body: "{rival} just played. The board's still warm — go." },
    { title: '{rival} cleared today\'s daily 🎯', body: "Don't let them sit pretty. {hoursLeft}h left." },
    { title: 'Catch-up window open 🪟', body: '{rival} put up a score. {gap} gap. {hoursLeft}h to close it.' },
  ],
  below: [
    { title: '{rival} is right behind you 🔥', body: "They just played today. Only {gap} between you. Defend." },
    { title: 'Heads up — {rival} is gaining 📊', body: "They cleared today's daily. {hoursLeft}h to extend the lead." },
    { title: 'Lead protection mode 🛡️', body: '{rival} just scored. Your {gap}-pt buffer is shrinking.' },
    { title: '{rival} swung first 🥊', body: "Don't let them keep the momentum. Daily's open." },
    { title: 'Stay ahead of {rival} 🏆', body: "They played today. {gap} pts cushion — make it bigger." },
    { title: 'Rival check 🔍', body: "{rival} cleared today's daily. {hoursLeft}h to answer." },
  ],
};

// Hebrew — RTL. AI-authored, native review pending.
const HE: RivalReminderTemplateSet = {
  above: [
    { title: '👀 {rival} כבר שיחק היום', body: 'הם {gap} נקודות לפניך. {hoursLeft} שעות לסגור פערים.' },
    { title: '🏃 התראת קצב', body: '{rival} פיצח את היומי. תורך — נשארו רק {gap} נקודות.' },
    { title: '♟️ {rival} עשה את המהלך שלו', body: 'נגד-מהלך תוך 60 שניות. {hoursLeft} שעות על השעון.' },
    { title: '📈 פיגור של {gap}', body: '{rival} בדיוק שיחק. הלוח עדיין חם — קדימה.' },
    { title: '🎯 {rival} סגר את היומי', body: 'אל תיתן להם לשבת בנחת. נשארו {hoursLeft} שעות.' },
    { title: '🪟 חלון להשיג', body: '{rival} העלה תוצאה. פער של {gap}. {hoursLeft} שעות לסגור.' },
  ],
  below: [
    { title: '🔥 {rival} ממש מאחוריך', body: 'הם בדיוק שיחקו היום. רק {gap} ביניכם. הגן.' },
    { title: '📊 שים לב — {rival} מתקרב', body: 'הם פיצחו את היומי. {hoursLeft} שעות להרחיב את היתרון.' },
    { title: '🛡️ מצב שמירת יתרון', body: '{rival} בדיוק קלע. רזרבת ה-{gap} שלך מצטמצמת.' },
    { title: '🥊 {rival} הכה ראשון', body: 'אל תיתן להם לשמור על המומנטום. היומי פתוח.' },
    { title: '🏆 הישאר לפני {rival}', body: 'הם שיחקו היום. כרית של {gap} נק׳ — הגדל אותה.' },
    { title: '🔍 בדיקת יריב', body: '{rival} סגר את היומי. {hoursLeft} שעות לענות.' },
  ],
};

// Swedish — AI-authored, native review pending.
const SV: RivalReminderTemplateSet = {
  above: [
    { title: '{rival} spelade redan idag 👀', body: 'De ligger {gap} före dig. {hoursLeft}h att hämta in.' },
    { title: 'Tempolarm 🏃', body: '{rival} klarade dagens dagliga. Din tur — bara {gap} ifrån.' },
    { title: '{rival} gjorde sitt drag ♟️', body: 'Kontringen tar 60 sekunder. {hoursLeft}h kvar.' },
    { title: 'Du ligger {gap} efter 📈', body: '{rival} spelade nyss. Brädet är varmt — kör.' },
    { title: '{rival} löste dagens 🎯', body: 'Låt dem inte sitta bekvämt. {hoursLeft}h kvar.' },
    { title: 'Kom-ikapp-fönstret är öppet 🪟', body: '{rival} la upp en poäng. {gap} i mellan. {hoursLeft}h att stänga.' },
  ],
  below: [
    { title: '{rival} är precis bakom dig 🔥', body: 'De spelade idag. Bara {gap} skiljer er. Försvara.' },
    { title: 'Heads up — {rival} kommer 📊', body: 'De klarade dagens. {hoursLeft}h att öka ledningen.' },
    { title: 'Försvarsläge 🛡️', body: '{rival} satte poäng. Din {gap}-buffer krymper.' },
    { title: '{rival} slog till först 🥊', body: 'Låt dem inte behålla momentum. Daglig är öppen.' },
    { title: 'Håll dig före {rival} 🏆', body: 'De spelade idag. {gap} p kudde — gör den större.' },
    { title: 'Rivalkoll 🔍', body: '{rival} löste dagens. {hoursLeft}h att svara.' },
  ],
};

// Japanese — AI-authored, native review pending.
const JA: RivalReminderTemplateSet = {
  above: [
    { title: '👀 {rival} が今日プレイした', body: '{gap} 点リード中。残り {hoursLeft} 時間で追え。' },
    { title: '🏃 ペースアラート', body: '{rival} が今日のデイリーをクリア。あなたの番。差は {gap} のみ。' },
    { title: '♟️ {rival} が動いた', body: '60秒で反撃を。残り {hoursLeft} 時間。' },
    { title: '📈 {gap} 点ビハインド', body: '{rival} が今プレイした。盤はまだ熱い — 行こう。' },
    { title: '🎯 {rival} がデイリー突破', body: '楽させるな。残り {hoursLeft} 時間。' },
    { title: '🪟 追撃のチャンス', body: '{rival} がスコア投下。差は {gap} 点。{hoursLeft} 時間で詰めろ。' },
  ],
  below: [
    { title: '🔥 {rival} がすぐ後ろ', body: '今日プレイ済。差はわずか {gap} 点。守れ。' },
    { title: '📊 警戒 — {rival} が迫る', body: '今日のデイリーをクリア。{hoursLeft} 時間でリード拡大を。' },
    { title: '🛡️ リード防衛モード', body: '{rival} が得点。{gap} 点のバッファが縮んでいる。' },
    { title: '🥊 {rival} が先制', body: '勢いを渡すな。デイリー解放中。' },
    { title: '🏆 {rival} の前にいよう', body: '今日プレイ済。{gap} 点クッション — 増やせ。' },
    { title: '🔍 ライバルチェック', body: '{rival} がデイリー突破。{hoursLeft} 時間で応えろ。' },
  ],
};

// Spanish — AI-authored, native review pending.
const ES: RivalReminderTemplateSet = {
  above: [
    { title: '{rival} ya jugó hoy 👀', body: 'Te lleva {gap}. {hoursLeft}h para recortar.' },
    { title: 'Alerta de ritmo 🏃', body: '{rival} resolvió el reto diario. Tu turno — solo {gap} de diferencia.' },
    { title: '{rival} hizo su jugada ♟️', body: 'Contesta en 60 segundos. {hoursLeft}h en el reloj.' },
    { title: 'Vas {gap} por detrás 📈', body: '{rival} acaba de jugar. El tablero sigue caliente — entra.' },
    { title: '{rival} cerró el diario 🎯', body: 'No los dejes cómodos. Quedan {hoursLeft}h.' },
    { title: 'Ventana para alcanzar 🪟', body: '{rival} marcó. Brecha de {gap}. {hoursLeft}h para cerrarla.' },
  ],
  below: [
    { title: '{rival} te pisa los talones 🔥', body: 'Acaba de jugar hoy. Solo {gap} entre ustedes. Defiende.' },
    { title: 'Atento — {rival} se acerca 📊', body: 'Resolvió el diario. {hoursLeft}h para ampliar la ventaja.' },
    { title: 'Modo defensa 🛡️', body: '{rival} anotó. Tu colchón de {gap} se encoge.' },
    { title: '{rival} pegó primero 🥊', body: 'No les regales el ritmo. El diario está abierto.' },
    { title: 'Mantente sobre {rival} 🏆', body: 'Jugó hoy. {gap} pts de margen — hazlo más grande.' },
    { title: 'Chequeo de rival 🔍', body: '{rival} cerró el diario. {hoursLeft}h para responder.' },
  ],
};

export const RIVAL_REMINDER_TEMPLATES_BY_LOCALE: Record<PushLocale, RivalReminderTemplateSet> = {
  en: EN,
  he: HE,
  sv: SV,
  ja: JA,
  es: ES,
};

export const RIVAL_TEMPLATE_COUNT_PER_DIRECTION = 6;
