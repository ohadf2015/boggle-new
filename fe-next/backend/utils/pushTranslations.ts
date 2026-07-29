/**
 * Push notification translations.
 *
 * Backend-local dictionary: push/system strings only. Deliberately separate from
 * the frontend `translations/*.js` — those are ~10k lines of UI text and not
 * designed for Node require. Keep this tight: only keys used from the push path.
 *
 * Interpolation: `{var}` tokens replaced from `params`. Missing keys fall back
 * to 'en'; unknown locales fall back to 'en'.
 */

export type PushLocale = 'he' | 'en' | 'sv' | 'ja' | 'es';

export const SUPPORTED_PUSH_LOCALES: readonly PushLocale[] = ['he', 'en', 'sv', 'ja', 'es'] as const;

export function isPushLocale(value: unknown): value is PushLocale {
  return typeof value === 'string' && (SUPPORTED_PUSH_LOCALES as readonly string[]).includes(value);
}

// Last-resort signal: when both profiles.language and game_sessions.language are
// missing, derive a best-effort push locale from ISO 3166-1 alpha-2 country code.
// Returns null for unmapped countries — caller decides final fallback so the
// "we exhausted every signal" log line stays distinct from "deliberate en."
const COUNTRY_LOCALE_MAP: Record<string, PushLocale> = {
  IL: 'he',
  JP: 'ja',
  SE: 'sv',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  EC: 'es', BO: 'es', CR: 'es', GT: 'es', HN: 'es', NI: 'es', PA: 'es',
  PY: 'es', SV: 'es', UY: 'es', DO: 'es', PR: 'es',
};

export function countryToLocale(country: unknown): PushLocale | null {
  if (typeof country !== 'string' || country.length === 0) return null;
  return COUNTRY_LOCALE_MAP[country.toUpperCase()] ?? null;
}

type Dict = Record<string, string>;

// Key format: "<domain>.<subkey>". English copy aligned to trigger call sites
// (see pushNotificationTriggers.ts) so test assertions on English path remain
// stable post-i18n refactor.
const STRINGS: Record<PushLocale, Dict> = {
  en: {
    'friendRequest.title': 'Friend Request',
    'friendRequest.body': '{sender} sent you a friend request!',

    'friendAccepted.title': 'Friend Request Accepted',
    'friendAccepted.body': '{sender} accepted your friend request!',

    'gameInvite.title': 'Game Invite',
    'gameInvite.body': '{sender} invited you to play!',

    'turnReminder.title': 'Your Turn!',
    'turnReminder.body': '{opponent} played — your turn now!',

    'achievement.title': 'Achievement Unlocked!',
    'achievement.body': 'You earned: {name}',
    'achievement.titleMulti': '{count} Achievements Unlocked!',
    'achievement.bodyTwo': 'You earned: {a} & {b}',
    'achievement.bodyMore': 'You earned: {a}, {b} +{rest} more',

    'directMessage.title': 'Message from {sender}',
    'directMessage.body': '{preview}',
    'directMessage.bodyMulti': '{count} new messages',

    'challengeAccepted.title': 'Challenge Accepted!',
    'challengeAccepted.body': '{sender} accepted your challenge — join now!',

    'challengeDeclined.title': 'Challenge Declined',
    'challengeDeclined.body': '{sender} declined your challenge',

    'giftReceived.title': 'Gift Received!',
    'giftReceived.body': '{sender} sent you {label}!',
    'giftLabel.hints': 'a hint',
    'giftLabel.streak_freeze': 'a streak freeze',
    'giftLabel.coins': 'coins',

    'gift.title': "You've received a gift!",
    'gift.bodyXpOnly': '{sender} sent you {xp} XP!',
    'gift.bodyXpAndCoins': '{sender} sent you {xp} XP and {coins} coins!',
    'gift.bodyCoinsOnly': '{sender} sent you {coins} coins!',
    'gift.bodyBadge': '{sender} sent you a badge!',
    'gift.bodyGeneric': '{sender} sent you a gift!',

    'dailyChallenge.title': '🎯 Daily Challenge awaits',
    'dailyChallenge.body': 'Keep your streak alive — 60 seconds to play!',

    'levelUp.title': 'Level {level}!',
    'levelUp.body': 'Congratulations — you reached level {level}!',

    'seasonStart.title': '🏆 Season {n} is here!',
    'seasonStart.body': 'Season {prev} ended — claim your rewards now!',
    'seasonStart.bodyNoClaim': 'A new season has begun — climb the ranks!',

    'curatorAssigned.title': '🎉 You\'re a Language Curator!',
    'curatorAssigned.body': 'You can now help curate {language} content. Tap to open your Curator dashboard.',
  },
  he: {
    'friendRequest.title': 'בקשת חברות',
    'friendRequest.body': '!שלח/ה לך בקשת חברות {sender}',

    'friendAccepted.title': 'בקשת החברות אושרה',
    'friendAccepted.body': '!אישר/ה את בקשת החברות שלך {sender}',

    'gameInvite.title': 'הזמנה למשחק',
    'gameInvite.body': '!הזמין/ה אותך לשחק {sender}',

    'turnReminder.title': '!תורך',
    'turnReminder.body': '!שיחק/ה — עכשיו תורך {opponent}',

    'achievement.title': '!הישג נפתח',
    'achievement.body': '{name} :זכית ב',
    'achievement.titleMulti': '!{count} הישגים נפתחו',
    'achievement.bodyTwo': '{a} ו-{b} :זכית ב',
    'achievement.bodyMore': 'ועוד {rest} {a}, {b} :זכית ב',

    'directMessage.title': '{sender} הודעה מ',
    'directMessage.body': '{preview}',
    'directMessage.bodyMulti': 'הודעות חדשות {count}',

    'challengeAccepted.title': '!האתגר התקבל',
    'challengeAccepted.body': '!קיבל/ה את האתגר שלך — הצטרף/י עכשיו {sender}',

    'challengeDeclined.title': 'האתגר נדחה',
    'challengeDeclined.body': 'דחה/תה את האתגר שלך {sender}',

    'giftReceived.title': '!קיבלת מתנה',
    'giftReceived.body': '!{label} שלח/ה לך {sender}',
    'giftLabel.hints': 'רמז',
    'giftLabel.streak_freeze': 'הקפאת רצף',
    'giftLabel.coins': 'מטבעות',

    'gift.title': '!קיבלת מתנה',
    'gift.bodyXpOnly': '!נק׳ ניסיון {xp} שלח/ה לך {sender}',
    'gift.bodyXpAndCoins': '!מטבעות {coins}-נק׳ ניסיון ו {xp} שלח/ה לך {sender}',
    'gift.bodyCoinsOnly': '!מטבעות {coins} שלח/ה לך {sender}',
    'gift.bodyBadge': '!שלח/ה לך תג {sender}',
    'gift.bodyGeneric': '!שלח/ה לך מתנה {sender}',

    'dailyChallenge.title': '⏰ האתגר היומי מחכה 🎯',
    'dailyChallenge.body': '!שמור על הרצף — 60 שניות של משחק',

    'levelUp.title': '!{level} שלב',
    'levelUp.body': '!{level} מזל טוב — הגעת לשלב',

    'seasonStart.title': '!{n} עונה 🏆',
    'seasonStart.body': '!הסתיימה — מהר/י לאסוף את הפרסים {prev} עונה',
    'seasonStart.bodyNoClaim': '!עונה חדשה התחילה — בוא/י לטפס בדירוג',

    'curatorAssigned.title': '!אוצר/ת שפה עכשיו את/ה 🎉',
    'curatorAssigned.body': 'מעכשיו תוכל/י לאצור תוכן בשפה {language}. הקש/י כדי לפתוח את לוח האוצר/ת.',
  },
  sv: {
    'friendRequest.title': 'Vänförfrågan',
    'friendRequest.body': '{sender} skickade dig en vänförfrågan!',

    'friendAccepted.title': 'Vänförfrågan accepterad',
    'friendAccepted.body': '{sender} accepterade din vänförfrågan!',

    'gameInvite.title': 'Spelinbjudan',
    'gameInvite.body': '{sender} bjöd in dig att spela!',

    'turnReminder.title': 'Din tur!',
    'turnReminder.body': '{opponent} spelade — din tur nu!',

    'achievement.title': 'Prestation upplåst!',
    'achievement.body': 'Du fick: {name}',
    'achievement.titleMulti': '{count} prestationer upplåsta!',
    'achievement.bodyTwo': 'Du fick: {a} & {b}',
    'achievement.bodyMore': 'Du fick: {a}, {b} +{rest} till',

    'directMessage.title': 'Meddelande från {sender}',
    'directMessage.body': '{preview}',
    'directMessage.bodyMulti': '{count} nya meddelanden',

    'challengeAccepted.title': 'Utmaning accepterad!',
    'challengeAccepted.body': '{sender} accepterade din utmaning — gå med nu!',

    'challengeDeclined.title': 'Utmaning avvisad',
    'challengeDeclined.body': '{sender} avvisade din utmaning',

    'giftReceived.title': 'Present mottagen!',
    'giftReceived.body': '{sender} skickade dig {label}!',
    'giftLabel.hints': 'ett tips',
    'giftLabel.streak_freeze': 'en seriefrysning',
    'giftLabel.coins': 'mynt',

    'gift.title': 'Du har fått en present!',
    'gift.bodyXpOnly': '{sender} skickade dig {xp} XP!',
    'gift.bodyXpAndCoins': '{sender} skickade dig {xp} XP och {coins} mynt!',
    'gift.bodyCoinsOnly': '{sender} skickade dig {coins} mynt!',
    'gift.bodyBadge': '{sender} skickade dig ett märke!',
    'gift.bodyGeneric': '{sender} skickade dig en present!',

    'dailyChallenge.title': '🎯 Dagens utmaning väntar',
    'dailyChallenge.body': 'Bryt inte serien — 60 sekunder att spela!',

    'levelUp.title': 'Nivå {level}!',
    'levelUp.body': 'Grattis — du nådde nivå {level}!',

    'seasonStart.title': '🏆 Säsong {n} är här!',
    'seasonStart.body': 'Säsong {prev} avslutades — hämta dina belöningar nu!',
    'seasonStart.bodyNoClaim': 'En ny säsong har börjat — klättra i rankningen!',

    'curatorAssigned.title': '🎉 Du är nu språkkurator!',
    'curatorAssigned.body': 'Du kan nu hjälpa till att kurera innehåll på {language}. Tryck för att öppna din kuratorpanel.',
  },
  ja: {
    'friendRequest.title': 'フレンド申請',
    'friendRequest.body': '{sender}さんからフレンド申請が届きました！',

    'friendAccepted.title': 'フレンド申請が承認されました',
    'friendAccepted.body': '{sender}さんがあなたのフレンド申請を承認しました！',

    'gameInvite.title': 'ゲーム招待',
    'gameInvite.body': '{sender}さんがあなたを対戦に招待しました！',

    'turnReminder.title': 'あなたの番です！',
    'turnReminder.body': '{opponent}さんがプレイしました — あなたの番です！',

    'achievement.title': '実績解除！',
    'achievement.body': '獲得：{name}',
    'achievement.titleMulti': '{count}個の実績解除！',
    'achievement.bodyTwo': '獲得：{a}・{b}',
    'achievement.bodyMore': '獲得：{a}、{b} 他{rest}個',

    'directMessage.title': '{sender}さんからのメッセージ',
    'directMessage.body': '{preview}',
    'directMessage.bodyMulti': '新着メッセージ{count}件',

    'challengeAccepted.title': '対戦が承認されました！',
    'challengeAccepted.body': '{sender}さんが対戦を承認しました — 今すぐ参加！',

    'challengeDeclined.title': '対戦が辞退されました',
    'challengeDeclined.body': '{sender}さんが対戦を辞退しました',

    'giftReceived.title': 'ギフトが届きました！',
    'giftReceived.body': '{sender}さんから{label}が届きました！',
    'giftLabel.hints': 'ヒント',
    'giftLabel.streak_freeze': 'ストリークフリーズ',
    'giftLabel.coins': 'コイン',

    'gift.title': 'ギフトが届きました！',
    'gift.bodyXpOnly': '{sender}さんから{xp} XPが届きました！',
    'gift.bodyXpAndCoins': '{sender}さんから{xp} XPと{coins}コインが届きました！',
    'gift.bodyCoinsOnly': '{sender}さんから{coins}コインが届きました！',
    'gift.bodyBadge': '{sender}さんからバッジが届きました！',
    'gift.bodyGeneric': '{sender}さんからギフトが届きました！',

    'dailyChallenge.title': '🎯 デイリーチャレンジが待っています',
    'dailyChallenge.body': '連続記録を止めないで — 60秒で遊べます！',

    'levelUp.title': 'レベル{level}！',
    'levelUp.body': 'おめでとう — レベル{level}に到達！',

    'seasonStart.title': '🏆 シーズン{n}開幕！',
    'seasonStart.body': 'シーズン{prev}が終了 — 報酬を受け取ろう！',
    'seasonStart.bodyNoClaim': '新シーズン開幕 — ランキングを駆け上がろう！',

    'curatorAssigned.title': '🎉 言語キュレーターになりました！',
    'curatorAssigned.body': '{language}のコンテンツのキュレーションができるようになりました。タップしてキュレーターダッシュボードを開きましょう。',
  },
  es: {
    'friendRequest.title': 'Solicitud de amistad',
    'friendRequest.body': '¡{sender} te envió una solicitud de amistad!',

    'friendAccepted.title': 'Solicitud de amistad aceptada',
    'friendAccepted.body': '¡{sender} aceptó tu solicitud de amistad!',

    'gameInvite.title': 'Invitación a jugar',
    'gameInvite.body': '¡{sender} te invitó a jugar!',

    'turnReminder.title': '¡Tu turno!',
    'turnReminder.body': '¡{opponent} jugó — es tu turno ahora!',

    'achievement.title': '¡Logro desbloqueado!',
    'achievement.body': 'Obtuviste: {name}',
    'achievement.titleMulti': '¡{count} logros desbloqueados!',
    'achievement.bodyTwo': 'Obtuviste: {a} y {b}',
    'achievement.bodyMore': 'Obtuviste: {a}, {b} +{rest} más',

    'directMessage.title': 'Mensaje de {sender}',
    'directMessage.body': '{preview}',
    'directMessage.bodyMulti': '{count} mensajes nuevos',

    'challengeAccepted.title': '¡Reto aceptado!',
    'challengeAccepted.body': '¡{sender} aceptó tu reto — únete ahora!',

    'challengeDeclined.title': 'Reto rechazado',
    'challengeDeclined.body': '{sender} rechazó tu reto',

    'giftReceived.title': '¡Regalo recibido!',
    'giftReceived.body': '¡{sender} te envió {label}!',
    'giftLabel.hints': 'una pista',
    'giftLabel.streak_freeze': 'un congelador de racha',
    'giftLabel.coins': 'monedas',

    'gift.title': '¡Recibiste un regalo!',
    'gift.bodyXpOnly': '¡{sender} te envió {xp} XP!',
    'gift.bodyXpAndCoins': '¡{sender} te envió {xp} XP y {coins} monedas!',
    'gift.bodyCoinsOnly': '¡{sender} te envió {coins} monedas!',
    'gift.bodyBadge': '¡{sender} te envió una insignia!',
    'gift.bodyGeneric': '¡{sender} te envió un regalo!',

    'dailyChallenge.title': '🎯 El desafío diario te espera',
    'dailyChallenge.body': '¡Mantén tu racha — 60 segundos para jugar!',

    'levelUp.title': '¡Nivel {level}!',
    'levelUp.body': '¡Felicidades — llegaste al nivel {level}!',

    'seasonStart.title': '🏆 ¡Llegó la Temporada {n}!',
    'seasonStart.body': '¡La Temporada {prev} terminó — reclama tus recompensas!',
    'seasonStart.bodyNoClaim': '¡Empezó una nueva temporada — sube en la clasificación!',

    'curatorAssigned.title': '🎉 ¡Ahora eres Curador de Idioma!',
    'curatorAssigned.body': 'Ya puedes ayudar a curar contenido en {language}. Toca para abrir tu panel de curador.',
  },
};

function interpolate(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return key in params ? String(params[key]) : match;
  });
}

/**
 * Translate a push string for the given locale.
 * Falls back to English, then to the raw key if missing everywhere.
 */
export function translatePush(
  locale: PushLocale | null | undefined,
  key: string,
  params: Record<string, string | number> = {}
): string {
  const loc: PushLocale = isPushLocale(locale) ? locale : 'en';
  const template = STRINGS[loc]?.[key] ?? STRINGS.en[key] ?? key;
  return interpolate(template, params);
}
