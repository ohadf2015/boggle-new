/**
 * Re-engagement Email v2 — LexiClash
 *
 * Conversion-tuned redesign:
 *  • Hero v4 (kawaii Lexi peeking with "?" tile + lime/pink sunburst)
 *  • Puzzle-row reveal: N tiles, first filled, rest hollow. Reads as a real
 *    partial word instead of "[tile] _ _ _ _" placeholder text.
 *  • Three optional personalization hooks (loss aversion / social proof /
 *    urgency) that gracefully no-op when the metric is missing or below
 *    threshold — keeps the email coherent for users without history.
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

/* ───────────────────────── i18n copy ─────────────────────────
 * Voice: slightly sarcastic best-friend. Contractions, specifics,
 * zero hedging. Conditional hooks soft-gate per metric.
 */

interface Copy {
  greeting: (name: string) => string;
  caption: string;
  hint: string;
  pitch: string;
  cta: string;
  footerReason: string;
  unsubscribe: string;
  privacy: string;
  missedDays: (n: number) => string;
  solvedToday: (n: string) => string;
  hoursLeft: (h: number) => string;
}

const COPY: Record<string, Copy> = {
  en: {
    greeting: (n) => `${n}, you good?`,
    caption: "Today's word is waiting",
    hint: 'Your hint for today',
    pitch: "One word. 30 seconds. Don't overthink it.",
    cta: "Let's go",
    footerReason: 'You signed up for daily word reminders.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
    missedDays: (n) => `${n} days no-show — let's fix that.`,
    solvedToday: (n) => `${n} players already cracked today's word`,
    hoursLeft: (h) => `${h}h left before it resets`,
  },
  he: {
    greeting: (n) => `${n}, הכל טוב?`,
    caption: 'מילה אחת מחכה לך',
    hint: 'הרמז שלך להיום',
    pitch: 'מילה אחת. 30 שניות. בלי לחשוב יותר מדי.',
    cta: 'יאללה',
    footerReason: 'נרשמת לתזכורות מילה יומית.',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
    missedDays: (n) => `${n} ימים בלי לשחק. די.`,
    solvedToday: (n) => `${n} שחקנים כבר פתרו את המילה של היום`,
    hoursLeft: (h) => `נשארו ${h}h עד הריסט`,
  },
  sv: {
    greeting: (n) => `${n}, allt bra?`,
    caption: 'Dagens ord väntar',
    hint: 'Din ledtråd för idag',
    pitch: 'Ett ord. 30 sekunder. Tänk inte för mycket.',
    cta: 'Nu kör vi',
    footerReason: 'Du anmälde dig till dagliga ordpåminnelser.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
    missedDays: (n) => `${n} dagar utan dig.`,
    solvedToday: (n) => `${n} spelare har redan löst dagens ord`,
    hoursLeft: (h) => `${h}h kvar innan det nollställs`,
  },
  ja: {
    greeting: (n) => `${n}さん、元気？`,
    caption: '今日の単語、待機中',
    hint: '今日のヒント',
    pitch: '一単語、30秒、考えすぎないで。',
    cta: 'いこう',
    footerReason: '毎日の単語リマインダーに登録してくれたよね。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
    missedDays: (n) => `${n}日も会ってないね。`,
    solvedToday: (n) => `${n}人がもう今日の単語を解いた`,
    hoursLeft: (h) => `リセットまであと${h}h`,
  },
  es: {
    greeting: (n) => `${n}, ¿todo bien?`,
    caption: 'La palabra de hoy te espera',
    hint: 'Tu pista de hoy',
    pitch: 'Una palabra. 30 segundos. No le des tantas vueltas.',
    cta: 'Vamos',
    footerReason: 'Te suscribiste a recordatorios diarios.',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
    missedDays: (n) => `${n} días sin verte.`,
    solvedToday: (n) => `${n} jugadores ya resolvieron la palabra de hoy`,
    hoursLeft: (h) => `quedan ${h}h antes del reset`,
  },
};

/**
 * Click-optimized subject lines.
 * Formula: lowercase (personal), curiosity gap (incomplete), specific (letter or name).
 */
export const SUBJECT_LINES: Record<string, ((letter: string, name: string) => string)[]> = {
  en: [
    (l) => `ok but the first letter is "${l}"...`,
    (_l, n) => `${n}, it's been a minute 👀`,
    (l) => `today's hint starts with "${l}"`,
    (l) => `30 seconds. one word. starts with "${l}".`,
    (_l, n) => `lexi made you tea, ${n} ☕`,
    (l) => `small hint: "${l}" ___ ___ ___`,
  ],
  he: [
    (l) => `אוקיי אבל האות הראשונה היא "${l}"...`,
    (_l, n) => `${n}, עבר קצת זמן 👀`,
    (l) => `הרמז של היום מתחיל ב-"${l}"`,
    (l) => `30 שניות. מילה אחת. מתחילה ב-"${l}".`,
    (_l, n) => `${n}, לקסי הכינה לך תה ☕`,
    (l) => `רמז קטן: "${l}" ___ ___ ___`,
  ],
  sv: [
    (l) => `okej men första bokstaven är "${l}"...`,
    (_l, n) => `${n}, det var ett tag sen 👀`,
    (l) => `dagens ledtråd börjar med "${l}"`,
    (l) => `30 sekunder. ett ord. börjar med "${l}".`,
    (_l, n) => `${n}, lexi har bryggt te ☕`,
    (l) => `liten ledtråd: "${l}" ___ ___ ___`,
  ],
  ja: [
    (l) => `最初の文字「${l}」なんだけどさ...`,
    (_l, n) => `${n}さん、久しぶり 👀`,
    (l) => `今日のヒントは「${l}」から`,
    (l) => `30秒、一単語、「${l}」で始まる`,
    (_l, n) => `${n}さん、レキシがお茶入れたよ ☕`,
    (l) => `小さなヒント：「${l}」 ___ ___ ___`,
  ],
  es: [
    (l) => `vale, la primera letra es "${l}"...`,
    (_l, n) => `${n}, ha pasado un rato 👀`,
    (l) => `la pista de hoy empieza con "${l}"`,
    (l) => `30 segundos. una palabra. empieza con "${l}".`,
    (_l, n) => `${n}, lexi te preparó té ☕`,
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

// Below these floors, the chip would feel awkward ("1 days no-show", "12 already
// cracked"). Above the urgency ceiling, the countdown stops being motivating.
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
}

/* ───────────────────────── Assets ───────────────────────── */

// v4 hero: bespoke kawaii Lexi mascot peeking from left with "?" tile + lime/pink
// sunburst + floating S/T/A/R/K tiles drifting right. 1104×468 progressive JPEG,
// ~70KB. Locale-agnostic (no text in image).
const HERO_SRC = 'https://www.lexiclash.live/email/reengagement-hero-v4.jpg';

/* ─── Palette (solid hex only — dark-mode safe) ─── */

const C = {
  bg: '#14142b',
  bgAlt: '#1c1c3a',
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
  black: '#000000',
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
}: ReengagementEmailV2Props) {
  const t = COPY[language] || COPY['en'];
  const rtl = language === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const sh = rtl ? '-' : '';
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
            [data-ogsc] .caption-strip { background-color: ${C.bg} !important; }
            [data-ogsc] .missed-chip { background-color: ${C.pink} !important; color: ${C.black} !important; }
            [data-ogsc] .stats-chip { color: ${C.muted} !important; }
            [data-ogsb] .body-v2 { background-color: ${C.bg} !important; }
            [data-ogsb] .cta-btn-v2 { background-color: ${C.lime} !important; }
            [data-ogsb] .cta-td-v2 { background-color: ${C.lime} !important; }
            [data-ogsb] .caption-strip { background-color: ${C.bg} !important; }
            [data-ogsb] .missed-chip { background-color: ${C.pink} !important; }
            :root { color-scheme: dark !important; }
            @media (prefers-color-scheme: dark) {
              .body-v2, body { background-color: ${C.bg} !important; }
              h1 { color: ${C.text} !important; }
              .cta-btn-v2 { background-color: ${C.lime} !important; color: ${C.black} !important; }
              .cta-td-v2 { background-color: ${C.lime} !important; }
              .caption-strip { background-color: ${C.bg} !important; }
              .missed-chip { background-color: ${C.pink} !important; color: ${C.black} !important; }
              .stats-chip { color: ${C.muted} !important; }
            }
            u + .body-v2 .cta-btn-v2 { background-color: ${C.lime} !important; color: ${C.black} !important; }
            u + .body-v2 .cta-td-v2 { background-color: ${C.lime} !important; }
            @media (max-width: 480px) {
              .h1-v2 { font-size: 26px !important; line-height: 1.25 !important; }
              .hero-card { box-shadow: ${sh}4px 4px 0px ${C.black} !important; border-radius: 14px !important; }
              .tile-cell { width: 52px !important; height: 64px !important; }
              .tile-letter { font-size: 30px !important; line-height: 64px !important; }
              .tile-gap { width: 6px !important; }
              .pitch-v2 { font-size: 14px !important; }
              .missed-chip { font-size: 12px !important; padding: 8px 14px !important; }
              .stats-chip { font-size: 12px !important; }
            }
          `}</style>
        </Head>

        <Preview>
          {t.hint}: {firstLetter}… {t.cta.toLowerCase()}
        </Preview>

        <Body className="body-v2" style={{
          margin: 0, padding: 0,
          backgroundColor: C.bg,
          fontFamily: "'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
        }}>
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" dir={dir}
            style={{ backgroundColor: C.bg }}>
            <tr>
              <td align="center" style={{ padding: '48px 20px 40px' }}>
                <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                  style={{ maxWidth: '560px' }} dir={dir}>

                  {/* ── 1. HERO CARD — v4 Lexi banner + locale caption strip ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '28px' }}>
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
                                alt="LexiClash — kawaii Lexi peeking with a letter tile"
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
                        <tr>
                          <td className="caption-strip" style={{
                            backgroundColor: C.bg,
                            padding: '14px 20px',
                            borderTop: `3px solid ${C.black}`,
                            textAlign: 'center',
                          }}>
                            <Text style={{
                              color: C.lime,
                              fontSize: '13px',
                              fontWeight: 700,
                              letterSpacing: '2px',
                              textTransform: 'uppercase' as const,
                              margin: 0,
                              textAlign: 'center',
                              direction: dir,
                              fontFamily: "'Fredoka', Arial, sans-serif",
                              lineHeight: '1.3',
                            }}>
                              {t.caption}
                            </Text>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* ── 2. ACTION CARD ── */}
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

                        {/* greeting */}
                        <tr>
                          <td align="center" style={{ padding: '32px 20px 18px' }}>
                            <Heading as="h1" className="h1-v2" style={{
                              color: C.text,
                              fontSize: '32px',
                              margin: 0,
                              fontWeight: 700,
                              textAlign: 'center',
                              lineHeight: '1.2',
                              letterSpacing: '-0.5px',
                              direction: dir,
                            }}>
                              {t.greeting(recipientName)}
                            </Heading>
                          </td>
                        </tr>

                        {/* loss-aversion chip — only if days ≥ 7 */}
                        {showMissedDays && (
                          <tr>
                            <td align="center" style={{ paddingBottom: '20px' }}>
                              <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto' }}>
                                <tr>
                                  <td
                                    className="missed-chip"
                                    style={{
                                      backgroundColor: C.pink,
                                      color: C.black,
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      letterSpacing: '1.5px',
                                      textTransform: 'uppercase' as const,
                                      padding: '10px 18px',
                                      borderRadius: '999px',
                                      border: `3px solid ${C.black}`,
                                      boxShadow: `${sh}3px 3px 0px ${C.black}`,
                                      fontFamily: "'Fredoka', Arial, sans-serif",
                                      direction: dir,
                                      textAlign: 'center',
                                    }}>
                                    {t.missedDays(daysSinceLastPlay as number)}
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        )}

                        {/* puzzle-row reveal — N tiles, first filled */}
                        <tr>
                          <td align="center" style={{ padding: '6px 20px 22px' }}>
                            <table role="presentation" cellPadding={0} cellSpacing={0} dir={dir} style={{ margin: '0 auto' }}>
                              <tr>
                                <td
                                  width={64}
                                  height={76}
                                  align="center"
                                  valign="middle"
                                  className="tile-cell"
                                  style={{
                                    width: '64px',
                                    height: '76px',
                                    backgroundColor: C.letterFill,
                                    border: `4px solid ${C.black}`,
                                    borderRadius: '12px',
                                    boxShadow: `${sh}4px 4px 0px ${C.black}`,
                                    textAlign: 'center',
                                  }}
                                >
                                  <span className="tile-letter" style={{
                                    color: C.black,
                                    fontSize: '40px',
                                    fontWeight: 700,
                                    lineHeight: '76px',
                                    fontFamily: "'Fredoka', Arial, sans-serif",
                                    display: 'inline-block',
                                  }}>
                                    {firstLetter}
                                  </span>
                                </td>
                                {blankTiles.flatMap((_, i) => [
                                  <td key={`gap-${i}`} className="tile-gap" style={{ width: '10px' }}>&nbsp;</td>,
                                  <td
                                    key={`blank-${i}`}
                                    data-blank-tile="1"
                                    width={64}
                                    height={76}
                                    align="center"
                                    valign="middle"
                                    className="tile-cell"
                                    style={{
                                      width: '64px',
                                      height: '76px',
                                      backgroundColor: C.blankTileBg,
                                      border: `4px solid ${C.black}`,
                                      borderRadius: '12px',
                                      boxShadow: `${sh}4px 4px 0px ${C.black}`,
                                    }}
                                  >&nbsp;</td>,
                                ])}
                              </tr>
                            </table>
                          </td>
                        </tr>

                        {/* pitch line */}
                        <tr>
                          <td align="center" style={{ padding: '0 20px 18px' }}>
                            <Text className="pitch-v2" style={{
                              color: C.text,
                              fontSize: '16px',
                              fontWeight: 500,
                              lineHeight: '1.55',
                              textAlign: 'center',
                              margin: 0,
                              maxWidth: '440px',
                              marginLeft: 'auto',
                              marginRight: 'auto',
                              direction: dir,
                            }}>
                              {t.pitch}
                            </Text>
                          </td>
                        </tr>

                        {/* stats strip — social proof + urgency, only if either fires */}
                        {showStatsStrip && (
                          <tr>
                            <td align="center" style={{ padding: '0 20px 22px' }}>
                              <Text className="stats-chip" style={{
                                color: C.muted,
                                fontSize: '13px',
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                lineHeight: '1.5',
                                margin: 0,
                                textAlign: 'center',
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

                        {/* CTA */}
                        <tr>
                          <td align="center" style={{ padding: '0 20px 32px' }}>
                            <table role="presentation" cellPadding={0} cellSpacing={0}
                              style={{ margin: '0 auto' }}>
                              <tr>
                                <td align="center" className="cta-td-v2" style={{
                                  backgroundColor: C.lime,
                                  borderRadius: '16px',
                                  border: `3px solid ${C.black}`,
                                  boxShadow: `${sh}6px 6px 0px ${C.black}`,
                                }}>
                                  <Button
                                    href={playUrl}
                                    className="cta-btn-v2"
                                    style={{
                                      boxSizing: 'border-box',
                                      display: 'inline-block',
                                      backgroundColor: C.lime,
                                      color: C.black,
                                      fontSize: '19px',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      padding: '20px 56px',
                                      borderRadius: '16px',
                                      fontFamily: "'Fredoka', Arial, sans-serif",
                                      letterSpacing: '1.5px',
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

                  <tr><td style={{ height: '28px', lineHeight: 0, fontSize: 0 }}>&nbsp;</td></tr>

                  {/* ── 3. Footer ── */}
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
} satisfies ReengagementEmailV2Props;
