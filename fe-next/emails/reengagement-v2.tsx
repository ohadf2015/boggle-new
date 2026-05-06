/**
 * Re-engagement Email v2 — LexiClash
 *
 * Fresh ground-up redesign. Not a refactor of v1.
 *
 * Architectural differences from v1:
 *  • No single bordered "card" — flat stacked sections on navy
 *  • Single bold hero illustration replaces split OG card + mascot circle
 *    (mascot + flying letter tiles + sparkles, locale-agnostic, ~115KB JPEG)
 *  • Letter reveal moved into the CTA zone (the hint IS the invitation)
 *  • Typographic hierarchy: 32px heading, 14px everything else
 *  • Humanized copy: contractions, concrete imagery, no AI hedging
 *  • Click-optimized subjects: lowercase, curiosity-gap, incomplete
 *
 * Email best practices:
 *  • Table-based, max-width 600px, centered
 *  • Inline styles, solid hex only, dark-mode hardened
 *  • Single primary CTA, no competing links above the fold
 *  • Alt text on every image, preview text < 90 chars
 *  • Text logo (no image dependency) + List-Unsubscribe header
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
 * zero hedging. Written after reviewing humanizer principles:
 * vary rhythm, kill symmetric parallelism, concrete > abstract.
 */

interface Copy {
  greeting: (name: string) => string;
  caption: string;       // lime banner caption inside hero card (uppercase, MP-style)
  hint: string;          // small label above the letter reveal (kept for preview text)
  pitch: string;         // line between letter reveal and CTA
  cta: string;
  footerReason: string;
  unsubscribe: string;
  privacy: string;
}

const COPY: Record<string, Copy> = {
  en: {
    greeting: (n) => `${n}, you good?`,
    caption: "Today's word is waiting",
    hint: 'Your hint for today',
    pitch: "30 seconds. One word. That's it.",
    cta: "Let's go",
    footerReason: 'You signed up for daily word reminders.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    greeting: (n) => `${n}, הכל טוב?`,
    caption: 'מילה אחת מחכה לך',
    hint: 'הרמז שלך להיום',
    pitch: '30 שניות. מילה אחת. זהו.',
    cta: 'יאללה',
    footerReason: 'נרשמת לתזכורות מילה יומית.',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
  },
  sv: {
    greeting: (n) => `${n}, allt bra?`,
    caption: 'Dagens ord väntar',
    hint: 'Din ledtråd för idag',
    pitch: '30 sekunder. Ett ord. Klart.',
    cta: 'Nu kör vi',
    footerReason: 'Du anmälde dig till dagliga ordpåminnelser.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
  },
  ja: {
    greeting: (n) => `${n}さん、元気？`,
    caption: '今日の単語、待機中',
    hint: '今日のヒント',
    pitch: '30秒、一単語、それだけ。',
    cta: 'いこう',
    footerReason: '毎日の単語リマインダーに登録してくれたよね。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  es: {
    greeting: (n) => `${n}, ¿todo bien?`,
    caption: 'La palabra de hoy te espera',
    hint: 'Tu pista de hoy',
    pitch: '30 segundos. Una palabra. Listo.',
    cta: 'Vamos',
    footerReason: 'Te suscribiste a recordatorios diarios.',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
  },
};

/**
 * Click-optimized subject lines.
 * Formula: lowercase (personal), curiosity gap (incomplete), specific (letter or name).
 * Rotation by day-of-year keeps the inbox feel fresh.
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

/* ───────────────────────── Props ───────────────────────── */

interface ReengagementEmailV2Props {
  recipientName: string;
  firstLetter: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
}

/* ───────────────────────── Assets ───────────────────────── */

// Use www. domain — lexiclash.live 301s to www, and email clients don't follow redirects.
// Bespoke re-engagement hero: kawaii squad around a glowing word board, neon lime/pink
// dual-ring backdrop, floating ABC tiles. Same "your squad is waiting" emotional beat as
// the MP InviteCard but rendered specifically for email letterbox (no Scrabble grid, brighter
// character palette, looser composition that survives 3:1 crop in dark-mode clients).
const HERO_SRC = 'https://www.lexiclash.live/email/reengagement-hero-v3.jpg';

/* ─── Palette (solid hex only — dark-mode safe) ─── */

const C = {
  bg: '#14142b',          // slightly deeper than v1 navy
  bgAlt: '#1c1c3a',       // subtle panel background
  badge: '#A8E600',       // lime ring around mascot
  hint: '#8B5CF6',        // purple label (new accent, not in v1)
  letterFill: '#5CE0D6',  // cyan tile
  letterBorder: '#3a3a6a',
  text: '#FFFFFF',
  muted: '#A1A1B5',
  dim: '#6b6b85',
  pink: '#FF1493',
  lime: '#A8E600',
  black: '#000000',
  divider: '#2a2a48',
} as const;

/* ───────────────────────── Component ───────────────────────── */

export default function ReengagementEmailV2({
  recipientName,
  firstLetter,
  language,
  unsubscribeUrl,
  playUrl,
}: ReengagementEmailV2Props) {
  const t = COPY[language] || COPY['en'];
  const rtl = language === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const sh = rtl ? '-' : '';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';
  const privacyUrl = `https://lexiclash.live/${locale}/privacy`;
  const year = new Date().getFullYear();

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
            /* Force dark bg in all email clients */
            u + .body-v2 { background-color: ${C.bg} !important; }
            /* Outlook dark mode (data-ogsc = color, data-ogsb = background) */
            [data-ogsc] h1 { color: ${C.text} !important; }
            [data-ogsc] .cta-btn-v2 { background-color: ${C.lime} !important; color: ${C.black} !important; }
            [data-ogsc] .cta-td-v2 { background-color: ${C.lime} !important; }
            [data-ogsc] .caption-strip { background-color: ${C.bg} !important; }
            [data-ogsb] .body-v2 { background-color: ${C.bg} !important; }
            [data-ogsb] .cta-btn-v2 { background-color: ${C.lime} !important; }
            [data-ogsb] .cta-td-v2 { background-color: ${C.lime} !important; }
            [data-ogsb] .caption-strip { background-color: ${C.bg} !important; }
            /* Gmail dark mode — prevent color inversion */
            :root { color-scheme: dark !important; }
            @media (prefers-color-scheme: dark) {
              .body-v2, body { background-color: ${C.bg} !important; }
              h1 { color: ${C.text} !important; }
              .cta-btn-v2 { background-color: ${C.lime} !important; color: ${C.black} !important; }
              .cta-td-v2 { background-color: ${C.lime} !important; }
              .caption-strip { background-color: ${C.bg} !important; }
            }
            /* Google dark mode specificity boost */
            u + .body-v2 .cta-btn-v2 { background-color: ${C.lime} !important; color: ${C.black} !important; }
            u + .body-v2 .cta-td-v2 { background-color: ${C.lime} !important; }
            /* Hero card scales fluidly: width:100% with max-width 560 in inline style */
            @media (max-width: 480px) {
              .h1-v2 { font-size: 26px !important; line-height: 1.25 !important; }
              .hero-card { box-shadow: ${sh}4px 4px 0px ${C.black} !important; border-radius: 14px !important; }
              .letter-big { font-size: 44px !important; line-height: 76px !important; }
              .letter-big-cell { width: 76px !important; height: 76px !important; }
              .reveal-slots span { font-size: 28px !important; letter-spacing: 8px !important; }
              .pitch-v2 { font-size: 14px !important; }
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

                  {/* ── 1. HERO CARD — MP-style letterbox banner with lime caption
                          strip, all wrapped in a single neo-brutalist bordered
                          container. Same visual treatment as the InviteCard
                          ("Bring Your Squad") so the brand language stays coherent
                          across re-engagement and in-app invite surfaces. ── */}
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
                                alt="LexiClash — kawaii squad bursting with letter tiles"
                                width="552"
                                height="184"
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

                  {/* ── 2. Heading — single line, no pink sub-copy.
                          (The "missed you" sentiment now lives in the subject line
                          + the hero caption strip, so we kill the redundancy here.) ── */}
                  <tr>
                    <td align="center" style={{ padding: '0 12px 26px' }}>
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

                  {/* ── 3. INLINE LETTER REVEAL — first-letter tile + underscores
                          on the SAME row. Reads as a real partial word
                          (S _ _ _ _) instead of two stacked decorative blocks. ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '24px' }}>
                      <table role="presentation" cellPadding={0} cellSpacing={0} dir={dir}>
                        <tr>
                          <td
                            width={92}
                            height={92}
                            align="center"
                            valign="middle"
                            className="letter-big-cell"
                            style={{
                              width: '92px',
                              height: '92px',
                              backgroundColor: C.letterFill,
                              border: `4px solid ${C.black}`,
                              borderRadius: '14px',
                              boxShadow: `${sh}5px 5px 0px ${C.black}`,
                              textAlign: 'center',
                            }}
                          >
                            <span className="letter-big" style={{
                              color: C.black,
                              fontSize: '54px',
                              fontWeight: 700,
                              lineHeight: '92px',
                              fontFamily: "'Fredoka', Arial, sans-serif",
                              display: 'inline-block',
                            }}>
                              {firstLetter}
                            </span>
                          </td>
                          <td
                            valign="middle"
                            className="reveal-slots"
                            style={{
                              paddingLeft: rtl ? 0 : '22px',
                              paddingRight: rtl ? '22px' : 0,
                            }}
                          >
                            <span style={{
                              color: C.muted,
                              fontSize: '34px',
                              fontWeight: 700,
                              letterSpacing: '10px',
                              fontFamily: "'Fredoka', Arial, sans-serif",
                              whiteSpace: 'nowrap',
                            }}>
                              _ _ _ _
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* ── 4. Pitch line ── */}
                  <tr>
                    <td align="center" style={{ padding: '0 20px 20px' }}>
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

                  {/* ── 5. CTA — single primary action ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '24px' }}>
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

                  {/* spacer above footer */}
                  <tr><td style={{ height: '12px', lineHeight: 0, fontSize: 0 }}>&nbsp;</td></tr>

                  {/* ── 6. Footer ── */}
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
} satisfies ReengagementEmailV2Props;
