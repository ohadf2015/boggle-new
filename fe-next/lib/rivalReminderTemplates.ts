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
  /**
   * Used when scoreGap === 0 (rival on same season score). Avoids
   * grammatically awkward "ahead/behind by 0" phrasing. 6 variants to
   * stay compatible with tier-based picker (`VARIANT_TIERS`).
   */
  tied: RivalReminderTemplate[];
}

const EN: RivalReminderTemplateSet = {
  above: [
    { title: '{rival} just posted today 👀', body: "They're {gap} ahead of you. {hoursLeft}h to claw back." },
    { title: 'Pace alert from {rival} 🏃', body: '{rival} crushed today\'s daily. Your turn — they\'re only {gap} ahead.' },
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
  tied: [
    { title: '{rival} matched your score 🎯', body: "You're tied for the season. Daily resets at midnight." },
    { title: 'Tied with {rival} ⚖️', body: 'Today decides the tiebreaker. Resets at midnight.' },
    { title: '{rival} caught up 🪞', body: "Dead even. {hoursLeft}h to break the tie." },
    { title: 'Tiebreaker open ⚖️', body: '{rival} pulled even. {hoursLeft}h to pull ahead.' },
    { title: '⏰ Tied with {rival}', body: 'Last {hoursLeft}h to break the tie.' },
    { title: '🔁 {rival} = you', body: 'Only {hoursLeft}h left to settle it.' },
  ],
};

// Hebrew — RTL. AI-authored, native review pending.
// Note: rival names are wrapped with U+2068/U+2069 (FSI/PDI) at render time
// in `rivalReminderCopy.ts` so Latin names stay readable inside RTL flow.
// Phrasing favors noun forms (no gendered verbs) — works for any rival.
const HE: RivalReminderTemplateSet = {
  above: [
    { title: '👀 {rival} כבר על הלוח היום', body: 'בפער של {gap} נק׳ לפניך. {hoursLeft} שעות לסגור.' },
    { title: '🏃 קצב של {rival}', body: 'היומי של {rival} כבר נסגר. תורך — רק {gap} נק׳ פער.' },
    { title: '♟️ התור שלך מול {rival}', body: 'מהלך נגדי תוך 60 שניות. {hoursLeft} שעות על השעון.' },
    { title: '📈 פער של {gap} נק׳', body: 'התוצאה של {rival} עלתה. הלוח עדיין חם — קדימה.' },
    { title: '🎯 {rival} — היומי סגור', body: 'אל תיתן להם לשבת בנחת. {hoursLeft} שעות נותרו.' },
    { title: '🪟 הזדמנות לצמצם', body: 'תוצאה חדשה ל-{rival}. פער של {gap}. {hoursLeft} שעות לסגור.' },
  ],
  below: [
    { title: '🔥 {rival} צמוד אליך', body: 'פער של {gap} נק׳ בלבד. תגן על היתרון — היומי פתוח.' },
    { title: '📊 שים לב — {rival} ממש מאחוריך', body: 'היומי של {rival} נסגר. {hoursLeft} שעות להרחיב יתרון.' },
    { title: '🛡️ הגנה על היתרון', body: 'תוצאה חדשה ל-{rival}. היתרון של {gap} נק׳ שלך מצטמצם.' },
    { title: '🥊 {rival} כבר על הלוח', body: 'אל תיתן להם לשמור על המומנטום. היומי פתוח.' },
    { title: '🏆 שמור על היתרון מול {rival}', body: '{gap} נק׳ הפרש — הגדל אותו.' },
    { title: '🔍 בדיקת יריב', body: '{rival} — היומי סגור. {hoursLeft} שעות לענות.' },
  ],
  tied: [
    { title: '🎯 שוויון מול {rival}', body: 'תיקו בעונה. היומי מתאפס בחצות.' },
    { title: '⚖️ {rival} ואתה — תיקו', body: 'היום מכריע. מתאפס בחצות.' },
    { title: '🪞 תיקו מול {rival}', body: 'אותו ניקוד בדיוק. {hoursLeft} שעות לפרוץ.' },
    { title: '⚖️ שובר שוויון פתוח', body: 'תיקו עכשיו מול {rival}. {hoursLeft} שעות לעקוף.' },
    { title: '⏰ תיקו מול {rival}', body: 'נותרו {hoursLeft} שעות לשבור את השוויון.' },
    { title: '🔁 {rival} = אתה', body: 'רק {hoursLeft} שעות להכריע.' },
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
  tied: [
    { title: '{rival} matchade din poäng 🎯', body: 'Lika i säsongen. Återställs vid midnatt.' },
    { title: 'Lika med {rival} ⚖️', body: 'Idag avgör. Återställs vid midnatt.' },
    { title: '{rival} kom ikapp 🪞', body: 'Helt lika. {hoursLeft}h att bryta dödläget.' },
    { title: 'Avgörande öppet ⚖️', body: '{rival} gick lika. {hoursLeft}h att gå om.' },
    { title: '⏰ Lika med {rival}', body: 'Sista {hoursLeft}h att bryta dödläget.' },
    { title: '🔁 {rival} = du', body: 'Bara {hoursLeft}h att avgöra.' },
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
  tied: [
    { title: '🎯 {rival} と同点', body: 'シーズン互角。デイリーは深夜にリセット。' },
    { title: '⚖️ {rival} と並んだ', body: '今日が決定戦。深夜にリセット。' },
    { title: '🪞 {rival} に並ばれた', body: '完全に互角。残り {hoursLeft} 時間で抜け出せ。' },
    { title: '⚖️ 同点ブレーカー解放', body: '{rival} が並んだ。{hoursLeft} 時間で前へ。' },
    { title: '⏰ {rival} と同点', body: '残り {hoursLeft} 時間で決着を。' },
    { title: '🔁 {rival} = あなた', body: '残り {hoursLeft} 時間で決めろ。' },
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
  tied: [
    { title: '{rival} igualó tu puntaje 🎯', body: 'Empate de temporada. Se reinicia a medianoche.' },
    { title: 'Empatados con {rival} ⚖️', body: 'Hoy decide. Se reinicia a medianoche.' },
    { title: '{rival} te alcanzó 🪞', body: 'Empate exacto. {hoursLeft}h para romperlo.' },
    { title: 'Desempate abierto ⚖️', body: '{rival} te empató. {hoursLeft}h para adelantar.' },
    { title: '⏰ Empate con {rival}', body: 'Últimas {hoursLeft}h para romper el empate.' },
    { title: '🔁 {rival} = tú', body: 'Solo {hoursLeft}h para decidirlo.' },
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
