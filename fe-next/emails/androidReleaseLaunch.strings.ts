/**
 * Localized copy for the public Android release announcement email.
 * Kept in a separate module so androidReleaseLaunch.tsx stays under the
 * 500-line limit and translators can edit copy without touching layout.
 *
 * Deliberately minimal — a release blast should be a glance, not an essay:
 * badge + headline + one subhead + three word-chips + a single CTA.
 *
 * he/sv/ja/es are first-pass translations — flag "needs native review".
 */

export interface ReleaseStrings {
  /** Subject line; receives the recipient's display name. */
  subject: (name: string) => string;
  /** Inbox preview snippet (first thing shown after subject). */
  preview: string;
  /** Small pill above the headline. */
  badge: string;
  /** Hero headline. */
  headline: string;
  /** One-line value prop under the headline. */
  subhead: string;
  /** Exactly three short feature chips. */
  chips: [string, string, string];
  /** Primary call-to-action button label. */
  cta: string;
  /** Review nudge for the already-installed cohort — turns the blast into a review-seeder. */
  rateAsk: string;
  /** Footer reason-for-receiving line. */
  footer: string;
  /** Unsubscribe link label. */
  unsubscribe: string;
}

export const DEFAULT_LANGUAGE = 'en';

export const RELEASE_STRINGS: Record<string, ReleaseStrings> = {
  en: {
    subject: (name) => `${name}, LexiClash is on Android`,
    preview: 'LexiClash just landed on Google Play.',
    badge: 'NOW ON GOOGLE PLAY',
    headline: "We're on Android!",
    subhead: 'Daily puzzles, live multiplayer and offline play, now in your pocket.',
    chips: ['Daily puzzles', 'Live multiplayer', 'Play offline'],
    cta: 'Get it on Google Play',
    rateAsk: 'Already hooked? A quick ⭐⭐⭐⭐⭐ helps new players find us.',
    footer: 'You receive this because you have a LexiClash account.',
    unsubscribe: 'Unsubscribe',
  },
  he: {
    subject: (name) => `${name}, ‏LexiClash סוף סוף באנדרואיד`,
    preview: 'LexiClash הגיע ל‑Google Play.',
    badge: 'עכשיו ב‑GOOGLE PLAY',
    headline: 'אנחנו באנדרואיד!',
    subhead: 'חידות יומיות, רב‑משתתפים בזמן אמת ומשחק אופליין. עכשיו בכיס.',
    chips: ['חידה יומית', 'רב‑משתתפים', 'משחק לא מקוון'],
    cta: 'הורידו מ‑Google Play',
    rateAsk: 'כבר מכורים? דירוג ⭐⭐⭐⭐⭐ קטן עוזר לשחקנים חדשים למצוא אותנו.',
    footer: 'קיבלתם את זה כי יש לכם חשבון ב‑LexiClash.',
    unsubscribe: 'ביטול מנוי',
  },
  sv: {
    subject: (name) => `${name}, LexiClash finns äntligen på Android`,
    preview: 'Ditt favoritordspel har landat på Google Play.',
    badge: 'NU PÅ GOOGLE PLAY',
    headline: 'Vi finns på Android!',
    subhead: 'Dagliga pussel, live-flerspelarläge och offline-spel. Nu i fickan.',
    chips: ['Dagliga pussel', 'Flerspelarläge', 'Spela offline'],
    cta: 'Hämta på Google Play',
    rateAsk: 'Redan fast? Ett snabbt ⭐⭐⭐⭐⭐ hjälper nya spelare att hitta oss.',
    footer: 'Du får detta för att du har ett LexiClash-konto.',
    unsubscribe: 'Avsluta prenumeration',
  },
  ja: {
    subject: (name) => `${name}さん、LexiClashがAndroidに来ました`,
    preview: 'LexiClashがGoogle Playに登場しました。',
    badge: 'GOOGLE PLAYで配信中',
    headline: 'Androidに登場！',
    subhead: '毎日のパズル、リアルタイム対戦、オフラインプレイが、これ一本で。',
    chips: ['毎日のパズル', 'オンライン対戦', 'オフライン対応'],
    cta: 'Google Playで入手',
    rateAsk: 'もうハマってる？ ⭐⭐⭐⭐⭐ の評価が新しいプレイヤーの発見につながります。',
    footer: 'このメールはLexiClashアカウントをお持ちの方にお送りしています。',
    unsubscribe: '配信停止',
  },
  es: {
    subject: (name) => `${name}, LexiClash por fin está en Android`,
    preview: 'LexiClash acaba de llegar a Google Play.',
    badge: 'YA EN GOOGLE PLAY',
    headline: '¡Ya estamos en Android!',
    subhead: 'Retos diarios, multijugador en vivo y juego sin conexión, ahora en tu bolsillo.',
    chips: ['Retos diarios', 'Multijugador', 'Sin conexión'],
    cta: 'Descárgalo en Google Play',
    rateAsk: '¿Ya te enganchó? Una valoración de ⭐⭐⭐⭐⭐ ayuda a que otros nos encuentren.',
    footer: 'Recibes esto porque tienes una cuenta de LexiClash.',
    unsubscribe: 'Cancelar suscripción',
  },
};

export function getReleaseStrings(language: string): ReleaseStrings {
  return RELEASE_STRINGS[language] ?? RELEASE_STRINGS[DEFAULT_LANGUAGE];
}
