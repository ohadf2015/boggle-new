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
  missed: string;
  hint: string;          // small label above the letter reveal
  pitch: string;         // line between letter reveal and CTA
  cta: string;
  footerReason: string;
  unsubscribe: string;
  privacy: string;
}

const COPY: Record<string, Copy> = {
  en: {
    greeting: (n) => `${n}, you good?`,
    missed: "Been a minute. Today's word is waiting.",
    hint: 'Your hint for today',
    pitch: "30 seconds. One word. That's it.",
    cta: "Let's go",
    footerReason: 'You signed up for daily word reminders.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    greeting: (n) => `${n}, הכל טוב?`,
    missed: 'עבר קצת זמן. המילה של היום מחכה.',
    hint: 'הרמז שלך להיום',
    pitch: '30 שניות. מילה אחת. זהו.',
    cta: 'יאללה',
    footerReason: 'נרשמת לתזכורות מילה יומית.',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
  },
  sv: {
    greeting: (n) => `${n}, allt bra?`,
    missed: 'Det var ett tag sen. Dagens ord väntar.',
    hint: 'Din ledtråd för idag',
    pitch: '30 sekunder. Ett ord. Klart.',
    cta: 'Nu kör vi',
    footerReason: 'Du anmälde dig till dagliga ordpåminnelser.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
  },
  ja: {
    greeting: (n) => `${n}さん、元気？`,
    missed: 'お久しぶり。今日の単語、待ってるよ。',
    hint: '今日のヒント',
    pitch: '30秒、一単語、それだけ。',
    cta: 'いこう',
    footerReason: '毎日の単語リマインダーに登録してくれたよね。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  es: {
    greeting: (n) => `${n}, ¿todo bien?`,
    missed: 'Ha pasado un rato. La palabra de hoy te espera.',
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
// Locale-agnostic celebration scene: mascot + flying letter tiles + sparkles.
// Replaces the v2-original split (localized OG card + small mascot GIF circle).
const HERO_SRC = 'https://www.lexiclash.live/email/reengagement-hero-v2.jpg';

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
            [data-ogsc] .missed-v2 { color: ${C.pink} !important; }
            [data-ogsc] .hint-label { color: ${C.hint} !important; }
            [data-ogsb] .body-v2 { background-color: ${C.bg} !important; }
            [data-ogsb] .cta-btn-v2 { background-color: ${C.lime} !important; }
            [data-ogsb] .cta-td-v2 { background-color: ${C.lime} !important; }
            /* Gmail dark mode — prevent color inversion */
            :root { color-scheme: dark !important; }
            @media (prefers-color-scheme: dark) {
              .body-v2, body { background-color: ${C.bg} !important; }
              h1 { color: ${C.text} !important; }
              .cta-btn-v2 { background-color: ${C.lime} !important; color: ${C.black} !important; }
              .cta-td-v2 { background-color: ${C.lime} !important; }
              .missed-v2 { color: ${C.pink} !important; }
              .hint-label { color: ${C.hint} !important; }
            }
            /* Google dark mode specificity boost */
            u + .body-v2 .cta-btn-v2 { background-color: ${C.lime} !important; color: ${C.black} !important; }
            u + .body-v2 .cta-td-v2 { background-color: ${C.lime} !important; }
            /* Hero banner scales fluidly: width:100% with max-width 560 in inline style */
            .hero-banner { box-shadow: ${sh}6px 6px 0px ${C.black} !important; }
            @media (max-width: 480px) {
              .h1-v2 { font-size: 26px !important; line-height: 1.25 !important; }
              .hero-banner { box-shadow: ${sh}4px 4px 0px ${C.black} !important; border-radius: 14px !important; }
              .letter-big { font-size: 56px !important; }
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

                  {/* ── 1. HERO BANNER — locale-agnostic celebration scene
                          (mascot + flying letter tiles + sparkles).
                          Single visual that does the brand AND emotional work
                          previously split between OG card + mascot circle. ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '28px' }}>
                      <Link
                        href={playUrl}
                        target="_blank"
                        style={{ textDecoration: 'none', display: 'inline-block', lineHeight: 0 }}
                      >
                        <Img
                          src={HERO_SRC}
                          alt="LexiClash — letter tiles bursting around Lexi the marshmallow mascot"
                          width="560"
                          height="312"
                          className="hero-banner"
                          style={{
                            display: 'block',
                            width: '100%',
                            maxWidth: '560px',
                            height: 'auto',
                            border: `4px solid ${C.black}`,
                            borderRadius: '18px',
                            boxShadow: `${sh}6px 6px 0px ${C.black}`,
                            outline: 'none',
                          }}
                        />
                      </Link>
                    </td>
                  </tr>

                  {/* ── 2. Heading ── */}
                  <tr>
                    <td align="center" style={{ padding: '0 12px' }}>
                      <Heading as="h1" className="h1-v2" style={{
                        color: C.text,
                        fontSize: '32px',
                        margin: '0 0 14px',
                        fontWeight: 700,
                        textAlign: 'center',
                        lineHeight: '1.2',
                        letterSpacing: '-0.5px',
                        direction: dir,
                      }}>
                        {t.greeting(recipientName)}
                      </Heading>

                      <Text className="missed-v2" style={{
                        color: C.pink,
                        fontSize: '15px',
                        margin: '0 0 24px',
                        fontWeight: 500,
                        textAlign: 'center',
                        lineHeight: '1.55',
                        maxWidth: '420px',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        direction: dir,
                      }}>
                        {t.missed}
                      </Text>
                    </td>
                  </tr>

                  {/* ── 3. LETTER REVEAL — the hint IS the invitation ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '14px' }}>
                      <Text className="hint-label" style={{
                        color: C.hint,
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '2.5px',
                        textTransform: 'uppercase' as const,
                        margin: '0 0 14px',
                        textAlign: 'center',
                        direction: dir,
                      }}>
                        ◆&nbsp;&nbsp;{t.hint}&nbsp;&nbsp;◆
                      </Text>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style={{ paddingBottom: '20px' }}>
                      {/* Giant single letter tile — the visual hook */}
                      <table role="presentation" cellPadding={0} cellSpacing={0}>
                        <tr>
                          <td
                            width={120}
                            height={120}
                            align="center"
                            valign="middle"
                            className="letter-big-cell"
                            style={{
                              width: '120px',
                              height: '120px',
                              backgroundColor: C.letterFill,
                              border: `4px solid ${C.black}`,
                              borderRadius: '18px',
                              boxShadow: `${sh}6px 6px 0px ${C.black}`,
                              textAlign: 'center',
                            }}
                          >
                            <span className="letter-big" style={{
                              color: C.black,
                              fontSize: '72px',
                              fontWeight: 700,
                              lineHeight: '120px',
                              fontFamily: "'Fredoka', Arial, sans-serif",
                              display: 'inline-block',
                            }}>
                              {firstLetter}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* Trailing underscores to tease the remaining word */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '20px' }}>
                      <span style={{
                        color: C.muted,
                        fontSize: '28px',
                        fontWeight: 700,
                        letterSpacing: '8px',
                        fontFamily: "'Fredoka', Arial, sans-serif",
                      }}>
                        _ _ _ _
                      </span>
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
