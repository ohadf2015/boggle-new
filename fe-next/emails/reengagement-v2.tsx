/**
 * Re-engagement Email v2 — LexiClash
 *
 * Conversion-tuned redesign:
 *  • Hero v5 (cool, dynamic "animation-still" Lexi bursting in with a "?" tile
 *    + motion streaks + tumbling neo-brutalist letter tiles). Not baby-kawaii.
 *  • Layout rhythm: dark hero → bold lime caption band → dark action card with
 *    a recessed "game board" panel for the puzzle-row → footer. Color-blocking
 *    breaks the old monotonous two-identical-cards stack.
 *  • Puzzle-row reveal: N tiles, first filled, rest hollow — reads as a real
 *    partial word, sized phone-first (Gmail strips @media).
 *  • Three optional personalization hooks (loss aversion / social proof /
 *    urgency) that gracefully no-op below threshold.
 *  • Bidi-safe greeting: recipient name is isolated LTR so a Latin name can't
 *    drag RTL punctuation to the wrong side.
 *  • Single primary CTA, no competing links above the fold.
 */

import {
  Html,
  Head,
  Preview,
  Body,
  Heading,
  Text,
  Button,
  Link,
  Img,
  Font,
  Tailwind,
  pixelBasedPreset,
} from '@react-email/components';
import { getWelcomeEmailModes, type WelcomeEmailMode } from '@/lib/email/welcomeModes';
import { ModeGrid } from './components/ModeGrid';

/* ───────────────────────── i18n copy ─────────────────────────
 * Voice: slightly sarcastic best-friend. Contractions, specifics,
 * zero hedging. Conditional hooks soft-gate per metric.
 *
 * `greetingTail` is rendered AFTER the recipient name (which is wrapped in an
 * LTR isolate span) — so it must read naturally as "<name><greetingTail>".
 */

interface Copy {
  greetingTail: string;
  caption: string;
  hint: string;
  pitch: string;
  cta: string;
  /** header above the secondary "more ways to play" cube grid */
  moreModes: string;
  footerReason: string;
  unsubscribe: string;
  privacy: string;
  missedDays: (n: number) => string;
  solvedToday: (n: string) => string;
  hoursLeft: (h: number) => string;
}

const COPY: Record<string, Copy> = {
  en: {
    greetingTail: ', long time no spell.',
    caption: "Today's puzzle is live",
    hint: 'Starts with',
    pitch: "One word. 30 seconds. That's the whole thing.",
    cta: "Play today's word",
    moreModes: 'More ways to play',
    footerReason: 'You signed up for daily word reminders.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
    missedDays: (n) => `${n} days off the grid — your comeback word is ready.`,
    solvedToday: (n) => `${n} players already cracked today's word`,
    hoursLeft: (h) => `${h}h left before it resets`,
  },
  he: {
    greetingTail: ', מתגעגעים אליך.',
    caption: 'החידה של היום עלתה',
    hint: 'מתחילה באות',
    pitch: 'מילה אחת. 30 שניות. וזהו.',
    cta: 'שחקו את המילה של היום',
    moreModes: 'עוד דרכים לשחק',
    footerReason: 'נרשמת לתזכורות מילה יומית.',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
    missedDays: (n) => `${n} ימים בלי מילה — הניצחון הקל מחכה לך.`,
    solvedToday: (n) => `${n} שחקנים כבר פיצחו את המילה של היום`,
    hoursLeft: (h) => `עוד ${h} שעות והחידה מתאפסת`,
  },
  sv: {
    greetingTail: ', det var ett tag sen.',
    caption: 'Dagens pussel är ute',
    hint: 'Börjar på',
    pitch: 'Ett ord. 30 sekunder. Det är hela grejen.',
    cta: 'Spela dagens ord',
    moreModes: 'Fler sätt att spela',
    footerReason: 'Du anmälde dig till dagliga ordpåminnelser.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
    missedDays: (n) => `${n} dagar utan ett ord — din lätta vinst väntar.`,
    solvedToday: (n) => `${n} spelare har redan löst dagens ord`,
    hoursLeft: (h) => `${h}h kvar innan det nollställs`,
  },
  ja: {
    greetingTail: 'さん、ひさしぶり。',
    caption: '今日のパズル、公開中',
    hint: '最初の文字は',
    pitch: '一単語、30秒。それだけ。',
    cta: '今日の単語で遊ぶ',
    moreModes: '他の遊び方',
    footerReason: '毎日の単語リマインダーに登録してくれたよね。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
    missedDays: (n) => `${n}日ぶり — かんたんな一勝が待ってるよ。`,
    solvedToday: (n) => `${n}人がもう今日の単語を解いたよ`,
    hoursLeft: (h) => `リセットまであと${h}時間`,
  },
  es: {
    greetingTail: ', cuánto tiempo.',
    caption: 'El reto de hoy ya está',
    hint: 'Empieza con',
    pitch: 'Una palabra. 30 segundos. Eso es todo.',
    cta: 'Jugar la palabra de hoy',
    moreModes: 'Más formas de jugar',
    footerReason: 'Te suscribiste a recordatorios diarios.',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
    missedDays: (n) => `${n} días sin una palabra — tu victoria fácil te espera.`,
    solvedToday: (n) => `${n} jugadores ya resolvieron la palabra de hoy`,
    hoursLeft: (h) => `${h}h antes de que se reinicie`,
  },
};

/**
 * Click-optimized subject lines.
 * Formula: lowercase (personal), curiosity gap (incomplete), specific (letter or name).
 */
export const SUBJECT_LINES: Record<string, ((letter: string, name: string) => string)[]> = {
  en: [
    (l) => `ok but the first letter is "${l}"...`,
    (_l, n) => `${n}, it's been a minute`,
    (l) => `today's word starts with "${l}", that's all i'll say`,
    (l) => `30 seconds, one word, starts with "${l}"`,
    (_l, n) => `${n}, lexi kept your seat warm`,
    (l) => `small hint: "${l}" ___ ___ ___`,
  ],
  he: [
    (l) => `אוקיי אבל האות הראשונה היא "${l}"...`,
    (_l, n) => `${n}, עבר קצת זמן`,
    (l) => `המילה של היום מתחילה ב-"${l}", זה כל מה שאגלה`,
    (l) => `30 שניות, מילה אחת, מתחילה ב-"${l}"`,
    (_l, n) => `${n}, לקסי שמרה לך מקום`,
    (l) => `רמז קטן: "${l}" ___ ___ ___`,
  ],
  sv: [
    (l) => `okej men första bokstaven är "${l}"...`,
    (_l, n) => `${n}, det var ett tag sen`,
    (l) => `dagens ord börjar på "${l}", mer säger jag inte`,
    (l) => `30 sekunder, ett ord, börjar på "${l}"`,
    (_l, n) => `${n}, lexi har sparat din plats`,
    (l) => `liten ledtråd: "${l}" ___ ___ ___`,
  ],
  ja: [
    (l) => `最初の文字「${l}」なんだけどさ...`,
    (_l, n) => `${n}さん、ちょっと久しぶりだね`,
    (l) => `今日の単語、「${l}」から始まるよ。ヒントはここまで`,
    (l) => `30秒、一単語、「${l}」で始まる`,
    (_l, n) => `${n}さん、レキシが席をとっておいたよ`,
    (l) => `小さなヒント：「${l}」 ___ ___ ___`,
  ],
  es: [
    (l) => `vale, la primera letra es "${l}"...`,
    (_l, n) => `${n}, ha pasado un rato`,
    (l) => `la palabra de hoy empieza con "${l}", no digo más`,
    (l) => `30 segundos, una palabra, empieza con "${l}"`,
    (_l, n) => `${n}, lexi te guardó el sitio`,
    (l) => `pista pequeña: "${l}" ___ ___ ___`,
  ],
};

/** Pick a subject line by day-of-year rotation. */
export function getReengagementSubjectV2(
  language: string,
  firstLetter: string,
  recipientName: string,
): string {
  const lines = SUBJECT_LINES[language] || SUBJECT_LINES['en'];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return lines[dayOfYear % lines.length](firstLetter, recipientName);
}

/* ───────────────────────── Thresholds ───────────────────────── */

// Below these floors, the chip would feel awkward ("1 days off the grid", "12
// already cracked"). Above the urgency ceiling, the countdown stops motivating.
const MISSED_DAYS_FLOOR = 7;
const SOLVED_TODAY_FLOOR = 50;
const HOURS_LEFT_CEILING = 12;
const MIN_TILES = 2;
const MAX_TILES = 8;
const DEFAULT_TILES = 4;

/* ───────────────────────── Props ───────────────────────── */

interface ReengagementEmailV2Props {
  recipientName: string;
  firstLetter: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
  /** Total letters in today's target word — drives tile-row width. */
  wordLength?: number;
  /** Days since user last played any daily puzzle. ≥7 to render. */
  daysSinceLastPlay?: number;
  /** Players who already solved today's word in this language. ≥50 to render. */
  playersToday?: number;
  /** Hours until daily reset in user's tz. <12 to render. */
  hoursUntilReset?: number;
  /**
   * Public modes for the secondary "more ways to play" cube grid — computed
   * from the shared MODE_META registry (lib/email/welcomeModes). Optional: the
   * daily-puzzle CTA stays the primary action; this block sits below it. When
   * absent the section simply doesn't render.
   */
  modes?: WelcomeEmailMode[];
}

/* ───────────────────────── Assets ───────────────────────── */

// v5 hero: cool, dynamic "animation-still" Lexi (translucent white cube mascot,
// confident smug expression, motion streaks) bursting in from the left with a
// "?" tile + tumbling neo-brutalist letter tiles. 1104×468 JPEG, ~84KB.
// Locale-agnostic (no text in image).
const HERO_SRC = 'https://www.lexiclash.live/email/reengagement-hero-v5.jpg';

/* ─── Palette (solid hex only — dark-mode safe) ─── */

const C = {
  bg: '#14142b',
  bgAlt: '#1c1c3a',
  board: '#0f0f22',
  badge: '#A8E600',
  hint: '#8B5CF6',
  letterFill: '#5CE0D6',
  letterBorder: '#3a3a6a',
  blankTileBg: '#14142b',
  text: '#FFFFFF',
  muted: '#A1A1B5',
  dim: '#6b6b85',
  pink: '#FF1493',
  lime: '#A8E600',
  // Off-black, NOT pure #000000: Gmail (Android) dark mode force-swaps pure
  // #000000 → #FFFFFF, which flipped the lime CTA's text + border + hard-shadow
  // white (illegible on lime). An off-black reads identically but is left alone.
  black: '#0A0A0A',
  divider: '#2a2a48',
} as const;

/* ─── Locale-aware number formatter ─── */

const LOCALE_TAG: Record<string, string> = {
  en: 'en-US',
  he: 'he-IL',
  sv: 'sv-SE',
  ja: 'ja-JP',
  es: 'es-ES',
};

function fmtNumber(n: number, language: string): string {
  try {
    return new Intl.NumberFormat(LOCALE_TAG[language] || 'en-US').format(n);
  } catch {
    return String(n);
  }
}

/* ───────────────────────── Component ───────────────────────── */

export default function ReengagementEmailV2({
  recipientName,
  firstLetter,
  language,
  unsubscribeUrl,
  playUrl,
  wordLength,
  daysSinceLastPlay,
  playersToday,
  hoursUntilReset,
  modes,
}: ReengagementEmailV2Props) {
  const t = COPY[language] || COPY['en'];
  const rtl = language === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const sh = rtl ? '-' : '';
  const startAlign: 'left' | 'right' = rtl ? 'right' : 'left';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';
  const privacyUrl = `https://lexiclash.live/${locale}/privacy`;
  const year = new Date().getFullYear();

  // Tile-row math: clamp to [2..8], default 4.
  const totalTiles = Math.max(
    MIN_TILES,
    Math.min(MAX_TILES, Number.isFinite(wordLength) ? (wordLength as number) : DEFAULT_TILES),
  );
  const blankTiles = Array.from({ length: totalTiles - 1 });


  // Personalization gates.
  const showMissedDays =
    typeof daysSinceLastPlay === 'number' && daysSinceLastPlay >= MISSED_DAYS_FLOOR;
  const showSolvedToday =
    typeof playersToday === 'number' && playersToday >= SOLVED_TODAY_FLOOR;
  const showHoursLeft =
    typeof hoursUntilReset === 'number' &&
    hoursUntilReset > 0 &&
    hoursUntilReset < HOURS_LEFT_CEILING;
  const showStatsStrip = showSolvedToday || showHoursLeft;

  return (
    <Html lang={language} dir={dir}>
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head>
          <Font
            fontFamily="Fredoka"
            fallbackFontFamily="Arial"
            webFont={{
              url: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap',
              format: 'woff2',
            }}
          />
          <meta name="color-scheme" content="dark" />
          <meta name="supported-color-schemes" content="dark" />
          <style>{`
            u + .body-v2 { background-color: ${C.bg} !important; }
            [data-ogsc] h1 { color: ${C.text} !important; }
            [data-ogsc] .cta-btn-v2 { background-color: ${C.lime} !important; color: ${C.black} !important; }
            [data-ogsc] .cta-td-v2 { background-color: ${C.lime} !important; }
            [data-ogsc] .caption-band-text { color: ${C.lime} !important; }
            [data-ogsc] .missed-chip { background-color: ${C.pink} !important; color: ${C.black} !important; }
            [data-ogsc] .stats-chip { color: ${C.muted} !important; }
            [data-ogsc] .tile-board { background-color: ${C.board} !important; }
            [data-ogsb] .body-v2 { background-color: ${C.bg} !important; }
            [data-ogsb] .cta-btn-v2 { background-color: ${C.lime} !important; }
            [data-ogsb] .cta-td-v2 { background-color: ${C.lime} !important; }
            [data-ogsb] .missed-chip { background-color: ${C.pink} !important; }
            :root { color-scheme: dark !important; }
            @media (prefers-color-scheme: dark) {
              .body-v2, body { background-color: ${C.bg} !important; }
              h1 { color: ${C.text} !important; }
              .cta-btn-v2 { background-color: ${C.lime} !important; color: ${C.black} !important; }
              .cta-td-v2 { background-color: ${C.lime} !important; }
              .caption-band-text { color: ${C.lime} !important; }
              .missed-chip { background-color: ${C.pink} !important; color: ${C.black} !important; }
              .stats-chip { color: ${C.muted} !important; }
              .tile-board { background-color: ${C.board} !important; }
            }
            u + .body-v2 .cta-btn-v2 { background-color: ${C.lime} !important; color: ${C.black} !important; }
            u + .body-v2 .cta-td-v2 { background-color: ${C.lime} !important; }
            /* Phone-first base sizes; desktop clients get an enhancement bump. */
            @media (min-width: 600px) {
              .h1-v2 { font-size: 30px !important; line-height: 1.2 !important; }
              .tile-cell { width: 58px !important; height: 70px !important; }
              .tile-letter { font-size: 32px !important; line-height: 70px !important; }
              .tile-gap { width: 8px !important; }
              .pitch-v2 { font-size: 17px !important; }
            }
          `}</style>
        </Head>

        <Preview>
          {t.hint} {firstLetter}… {t.cta}
        </Preview>

        <Body className="body-v2" style={{
          margin: 0, padding: 0,
          backgroundColor: C.bg,
          fontFamily: "'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
        }}>
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" dir={dir}
            style={{ backgroundColor: C.bg }}>
            <tr>
              <td align="center" style={{ padding: '40px 18px 36px' }}>
                <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                  style={{ maxWidth: '560px' }} dir={dir}>

                  {/* ── 1. HERO CARD — v5 cool dynamic Lexi banner ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '18px' }}>
                      <table
                        role="presentation"
                        cellPadding={0}
                        cellSpacing={0}
                        width="100%"
                        className="hero-card"
                        style={{
                          maxWidth: '560px',
                          borderCollapse: 'separate',
                          border: `4px solid ${C.black}`,
                          borderRadius: '18px',
                          boxShadow: `${sh}6px 6px 0px ${C.black}`,
                          backgroundColor: C.bgAlt,
                          overflow: 'hidden',
                        }}>
                        <tr>
                          <td style={{ padding: 0, lineHeight: 0, fontSize: 0 }}>
                            <Link
                              href={playUrl}
                              target="_blank"
                              style={{ textDecoration: 'none', display: 'block', lineHeight: 0 }}
                            >
                              <Img
                                src={HERO_SRC}
                                alt="LexiClash — Lexi bursting in with a letter tile"
                                width="552"
                                height="234"
                                className="hero-banner"
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  maxWidth: '552px',
                                  height: 'auto',
                                  border: 0,
                                  outline: 'none',
                                }}
                              />
                            </Link>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* ── 2. CAPTION LABEL — section header, NOT a button ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '14px' }}>
                      <table role="presentation" cellPadding={0} cellSpacing={0}>
                        <tr>
                          <td align="center" style={{ padding: '4px 0' }}>
                            <Text className="caption-band-text" style={{
                              color: C.lime,
                              fontSize: '12px',
                              fontWeight: 700,
                              letterSpacing: '3px',
                              textTransform: 'uppercase' as const,
                              margin: 0,
                              textAlign: 'center',
                              direction: dir,
                              fontFamily: "'Fredoka', Arial, sans-serif",
                              lineHeight: '1.4',
                            }}>
                              {t.caption}
                            </Text>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style={{ paddingTop: '6px' }}>
                            <table role="presentation" cellPadding={0} cellSpacing={0}>
                              <tr>
                                <td style={{
                                  width: '40px', height: '3px',
                                  backgroundColor: C.lime, fontSize: 0, lineHeight: 0,
                                }}>&nbsp;</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* ── 3. ACTION CARD ── */}
                  <tr>
                    <td align="center">
                      <table
                        role="presentation"
                        cellPadding={0}
                        cellSpacing={0}
                        width="100%"
                        className="action-card"
                        style={{
                          maxWidth: '560px',
                          borderCollapse: 'separate',
                          border: `4px solid ${C.black}`,
                          borderRadius: '18px',
                          boxShadow: `${sh}6px 6px 0px ${C.black}`,
                          backgroundColor: C.bgAlt,
                        }}>

                        {/* greeting — left-aligned (RTL: right) */}
                        <tr>
                          <td style={{ padding: '30px 24px 0', textAlign: startAlign }}>
                            <Heading as="h1" className="h1-v2" style={{
                              color: C.text,
                              fontSize: '23px',
                              margin: 0,
                              fontWeight: 700,
                              textAlign: startAlign,
                              lineHeight: '1.25',
                              letterSpacing: '-0.3px',
                              direction: dir,
                            }}>
                              <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{recipientName}</span>
                              {t.greetingTail}
                            </Heading>
                          </td>
                        </tr>

                        {/* lime accent bar under greeting */}
                        <tr>
                          <td style={{ padding: '12px 24px 0', textAlign: startAlign }}>
                            <table role="presentation" cellPadding={0} cellSpacing={0}
                              align={startAlign} style={{ margin: 0 }}>
                              <tr>
                                <td style={{
                                  width: '52px', height: '6px',
                                  backgroundColor: C.lime, fontSize: 0, lineHeight: 0,
                                }}>&nbsp;</td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        {/* loss-aversion chip — only if days ≥ 7 */}
                        {showMissedDays && (
                          <tr>
                            <td style={{ padding: '18px 24px 0', textAlign: startAlign }}>
                              <table role="presentation" cellPadding={0} cellSpacing={0}
                                align={startAlign} style={{ margin: 0 }}>
                                <tr>
                                  <td
                                    className="missed-chip"
                                    style={{
                                      backgroundColor: C.pink,
                                      color: C.black,
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      letterSpacing: '0.8px',
                                      textTransform: 'uppercase' as const,
                                      padding: '9px 16px',
                                      borderRadius: '999px',
                                      border: `3px solid ${C.black}`,
                                      boxShadow: `${sh}3px 3px 0px ${C.black}`,
                                      fontFamily: "'Fredoka', Arial, sans-serif",
                                      direction: dir,
                                      textAlign: startAlign,
                                    }}>
                                    {t.missedDays(daysSinceLastPlay as number)}
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        )}

                        {/* hint label */}
                        <tr>
                          <td style={{ padding: '22px 24px 8px', textAlign: startAlign }}>
                            <Text style={{
                              color: C.muted,
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '2px',
                              textTransform: 'uppercase' as const,
                              margin: 0,
                              textAlign: startAlign,
                              direction: dir,
                              fontFamily: "'Fredoka', Arial, sans-serif",
                            }}>
                              {t.hint}
                            </Text>
                          </td>
                        </tr>

                        {/* puzzle-row reveal — recessed game board, N tiles, first filled */}
                        <tr>
                          <td style={{ padding: '0 24px 4px' }}>
                            <table
                              role="presentation"
                              cellPadding={0}
                              cellSpacing={0}
                              width="100%"
                              className="tile-board"
                              style={{
                                backgroundColor: C.board,
                                border: `3px solid ${C.black}`,
                                borderRadius: '14px',
                                borderCollapse: 'separate',
                              }}>
                              <tr>
                                <td align="center" style={{ padding: '18px 10px' }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0} dir={dir} style={{ margin: '0 auto' }}>
                                    <tr>
                                      <td
                                        width={44}
                                        height={54}
                                        align="center"
                                        valign="middle"
                                        className="tile-cell"
                                        style={{
                                          width: '44px',
                                          height: '54px',
                                          backgroundColor: C.letterFill,
                                          border: `4px solid ${C.black}`,
                                          borderRadius: '10px',
                                          boxShadow: `${sh}3px 3px 0px ${C.black}`,
                                          textAlign: 'center',
                                        }}
                                      >
                                        <span className="tile-letter" style={{
                                          color: C.black,
                                          fontSize: '24px',
                                          fontWeight: 700,
                                          lineHeight: '54px',
                                          fontFamily: "'Fredoka', Arial, sans-serif",
                                          display: 'inline-block',
                                        }}>
                                          {firstLetter}
                                        </span>
                                      </td>
                                      {blankTiles.flatMap((_, i) => [
                                        <td key={`gap-${i}`} className="tile-gap" style={{ width: '6px' }}>&nbsp;</td>,
                                        <td
                                          key={`blank-${i}`}
                                          data-blank-tile="1"
                                          width={44}
                                          height={54}
                                          align="center"
                                          valign="middle"
                                          className="tile-cell"
                                          style={{
                                            width: '44px',
                                            height: '54px',
                                            backgroundColor: C.blankTileBg,
                                            border: `4px solid ${C.black}`,
                                            borderRadius: '10px',
                                            boxShadow: `${sh}3px 3px 0px ${C.black}`,
                                          }}
                                        >&nbsp;</td>,
                                      ])}
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        {/* pitch line */}
                        <tr>
                          <td style={{ padding: '18px 24px 0', textAlign: startAlign }}>
                            <Text className="pitch-v2" style={{
                              color: C.text,
                              fontSize: '15px',
                              fontWeight: 500,
                              lineHeight: '1.55',
                              textAlign: startAlign,
                              margin: 0,
                              direction: dir,
                            }}>
                              {t.pitch}
                            </Text>
                          </td>
                        </tr>

                        {/* stats strip — social proof + urgency, only if either fires */}
                        {showStatsStrip && (
                          <tr>
                            <td style={{ padding: '12px 24px 0', textAlign: startAlign }}>
                              <Text className="stats-chip" style={{
                                color: C.muted,
                                fontSize: '13px',
                                fontWeight: 600,
                                letterSpacing: '0.3px',
                                lineHeight: '1.5',
                                margin: 0,
                                textAlign: startAlign,
                                direction: dir,
                                fontFamily: "'Fredoka', Arial, sans-serif",
                              }}>
                                {showSolvedToday && (
                                  <span style={{ color: C.lime }}>
                                    {t.solvedToday(fmtNumber(playersToday as number, language))}
                                  </span>
                                )}
                                {showSolvedToday && showHoursLeft && (
                                  <span style={{ color: C.dim }}>&nbsp;&nbsp;·&nbsp;&nbsp;</span>
                                )}
                                {showHoursLeft && (
                                  <span style={{ color: C.pink }}>
                                    {t.hoursLeft(hoursUntilReset as number)}
                                  </span>
                                )}
                              </Text>
                            </td>
                          </tr>
                        )}

                        {/* CTA — full-width block button */}
                        <tr>
                          <td style={{ padding: '22px 24px 30px' }}>
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                              className="cta-td-v2" style={{
                                backgroundColor: C.lime,
                                borderRadius: '14px',
                                border: `3px solid ${C.black}`,
                                boxShadow: `${sh}6px 6px 0px ${C.black}`,
                              }}>
                              <tr>
                                <td align="center">
                                  <Button
                                    href={playUrl}
                                    className="cta-btn-v2"
                                    style={{
                                      boxSizing: 'border-box',
                                      display: 'block',
                                      width: '100%',
                                      backgroundColor: C.lime,
                                      color: C.black,
                                      fontSize: '17px',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      padding: '16px 24px',
                                      borderRadius: '14px',
                                      fontFamily: "'Fredoka', Arial, sans-serif",
                                      letterSpacing: '0.8px',
                                      textAlign: 'center',
                                      textTransform: 'uppercase' as const,
                                    }}>
                                    {t.cta} &rarr;
                                  </Button>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* ── 3b. Secondary "more ways to play" — dynamic public mode
                       grid. Sits BELOW the daily CTA so the puzzle stays primary.
                       Uniform navy tiles; the generated cube image carries the
                       colour, name + tagline stay real text (blocked-image safe).
                       Each tile links straight into the mode. ── */}
                  {modes && modes.length > 0 && (
                    <tr>
                      <td style={{ padding: '6px 0 0' }}>
                        <ModeGrid
                          modes={modes}
                          rtl={rtl}
                          dir={dir}
                          sh={sh}
                          header={t.moreModes}
                          palette={{
                            tileBg: '#1a1a2e',
                            tileBorder: C.letterBorder,
                            title: C.text,
                            tagline: C.muted,
                            header: C.muted,
                            black: C.black,
                          }}
                        />
                      </td>
                    </tr>
                  )}

                  <tr><td style={{ height: '28px', lineHeight: 0, fontSize: 0 }}>&nbsp;</td></tr>

                  {/* ── 4. Footer ── */}
                  <tr>
                    <td style={{ borderTop: `1px solid ${C.divider}`, paddingTop: '24px' }}>
                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                        <tr>
                          <td align="center" dir={dir}>
                            <Text style={{
                              color: C.dim,
                              fontSize: '12px',
                              margin: '0 0 10px',
                              lineHeight: '1.6',
                              direction: dir,
                            }}>
                              {t.footerReason}
                            </Text>
                            <Text style={{ color: C.dim, fontSize: '12px', margin: 0, lineHeight: '1.6' }}>
                              <Link href={unsubscribeUrl} target="_blank"
                                style={{ color: C.muted, textDecoration: 'underline' }}>
                                {t.unsubscribe}
                              </Link>
                              <span style={{ color: C.dim }}>&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                              <Link href={playUrl} target="_blank"
                                style={{ color: C.muted, textDecoration: 'underline' }}>
                                LexiClash
                              </Link>
                              <span style={{ color: C.dim }}>&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                              <Link href={privacyUrl} target="_blank"
                                style={{ color: C.muted, textDecoration: 'underline' }}>
                                {t.privacy}
                              </Link>
                            </Text>
                            <Text style={{ color: C.dim, fontSize: '11px', margin: '16px 0 0' }}>
                              &copy; {year} LexiClash
                            </Text>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </Body>
      </Tailwind>
    </Html>
  );
}

ReengagementEmailV2.PreviewProps = {
  recipientName: 'Word Hunter',
  firstLetter: 'S',
  language: 'en',
  unsubscribeUrl: 'https://lexiclash.live/api/email/unsubscribe?token=test123',
  playUrl: 'https://lexiclash.live/en/daily',
  wordLength: 5,
  daysSinceLastPlay: 14,
  playersToday: 1847,
  hoursUntilReset: 6,
  modes: getWelcomeEmailModes('en', 'https://www.lexiclash.live'),
} satisfies ReengagementEmailV2Props;
