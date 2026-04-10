/**
 * Re-engagement Email v2 — LexiClash
 *
 * Fresh ground-up redesign. Not a refactor of v1.
 *
 * Architectural differences from v1:
 *  • No single bordered "card" — flat stacked sections on navy
 *  • Asymmetric hero: circular marshmallow badge + heading as a pair
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
  urgency: string;
  social: string;
  footerReason: string;
  unsubscribe: string;
  privacy: string;
}

const COPY: Record<string, Copy> = {
  en: {
    greeting: (n) => `${n}, you good?`,
    missed: "Your streak's on life support. Lexi's been pacing the hallway.",
    hint: 'Your hint for today',
    pitch: "30 seconds. One word. You've done harder things before breakfast.",
    cta: "Let's go",
    urgency: 'This puzzle disappears at midnight. Clock is very much ticking.',
    social: 'PS — your friends already played. They will not shut up about it.',
    footerReason: 'You signed up for daily word reminders. Past-you was optimistic.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    greeting: (n) => `?${n} ,הכל טוב`,
    missed: '.הרצף שלך תלוי בחוט, וקסי כבר צועדת הלוך ושוב ליד הדלת',
    hint: 'הרמז שלך להיום',
    pitch: '.שלושים שניות, מילה אחת. עשית דברים קשים יותר לפני ארוחת הבוקר',
    cta: 'יאללה',
    urgency: '.החידה נעלמת בחצות. השעון רץ ולא בצחוק',
    social: '.אגב — החברים שלך כבר שיחקו. והם לא מפסיקים לדבר על זה',
    footerReason: '.נרשמת לתזכורות מילה יומית. ה"אתה" של פעם היה אופטימי',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
  },
  sv: {
    greeting: (n) => `${n}, allt bra?`,
    missed: 'Din streak ligger på intensiven. Lexi slutar inte stirra på dörren.',
    hint: 'Din ledtråd för idag',
    pitch: 'Trettio sekunder. Ett ord. Du har gjort svårare saker före frukost.',
    cta: 'Nu kör vi',
    urgency: 'Pusslet försvinner vid midnatt. Klockan tickar på riktigt.',
    social: 'PS — dina vänner har redan spelat. De pratar inte om något annat.',
    footerReason: 'Du anmälde dig till dagliga ordpåminnelser. Ditt gamla jag var optimistiskt.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
  },
  ja: {
    greeting: (n) => `${n}さん、元気？`,
    missed: '連続記録が瀕死。レキシはずっとドアをチラ見してる。',
    hint: '今日のヒント',
    pitch: '30秒。一単語。朝飯前より難しいこと、きっとやってきたでしょ。',
    cta: 'いこう',
    urgency: 'このパズルは深夜0時に消える。時計はマジで進んでる。',
    social: 'PS — フレンドはもう解いた。そしてずっとその話してる。',
    footerReason: '毎日の単語リマインダーに登録したよね。過去の自分は希望に満ちてた。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  es: {
    greeting: (n) => `${n}, ¿todo bien?`,
    missed: 'Tu racha cuelga de un hilo. Lexi no deja de mirar la puerta.',
    hint: 'Tu pista de hoy',
    pitch: 'Treinta segundos. Una palabra. Has hecho cosas más difíciles antes del café.',
    cta: 'Vamos',
    urgency: 'El puzzle desaparece a medianoche. El reloj va en serio.',
    social: 'PD — tus amigos ya jugaron. Y no hablan de otra cosa.',
    footerReason: 'Te suscribiste a recordatorios diarios. El "tú" de antes tenía fe.',
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
    () => `your streak is on life support`,
    (l) => `30 seconds. one word. starts with "${l}".`,
    (_l, n) => `lexi's doing the sad eyes again, ${n}`,
    (l) => `small hint: "${l}" ___ ___ ___`,
  ],
  he: [
    (l) => `אוקיי אבל האות הראשונה היא "${l}"...`,
    (_l, n) => `${n}, עבר קצת זמן 👀`,
    () => `הרצף שלך בטיפול נמרץ`,
    (l) => `30 שניות. מילה אחת. מתחילה ב-"${l}".`,
    (_l, n) => `${n}, קסי שוב עם העיניים העצובות`,
    (l) => `רמז קטן: "${l}" ___ ___ ___`,
  ],
  sv: [
    (l) => `okej men första bokstaven är "${l}"...`,
    (_l, n) => `${n}, det var ett tag sen 👀`,
    () => `din streak ligger på akuten`,
    (l) => `30 sekunder. ett ord. börjar med "${l}".`,
    (_l, n) => `${n}, lexi gör hundögonen igen`,
    (l) => `liten ledtråd: "${l}" ___ ___ ___`,
  ],
  ja: [
    (l) => `最初の文字「${l}」なんだけどさ...`,
    (_l, n) => `${n}さん、久しぶり 👀`,
    () => `連続記録が瀕死です`,
    (l) => `30秒、一単語、「${l}」で始まる`,
    (_l, n) => `${n}さん、レキシがまた寂しがってる`,
    (l) => `小さなヒント：「${l}」 ___ ___ ___`,
  ],
  es: [
    (l) => `vale, la primera letra es "${l}"...`,
    (_l, n) => `${n}, ha pasado un rato 👀`,
    () => `tu racha está en terapia intensiva`,
    (l) => `30 segundos. una palabra. empieza con "${l}".`,
    (_l, n) => `${n}, lexi está con los ojitos tristes`,
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

// Use www. domain — lexiclash.live 301s to www, and email clients don't follow redirects
const MASCOT_SRC = 'https://www.lexiclash.live/mascot/waving.gif';

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
            @media (max-width: 480px) {
              .h1-v2 { font-size: 26px !important; line-height: 1.25 !important; }
              .mascot-ring { width: 132px !important; height: 132px !important; }
              .mascot-img { width: 124px !important; height: 124px !important; }
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

                  {/* ── 1. Text wordmark ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '28px' }}>
                      <Link href={playUrl} target="_blank"
                        style={{
                          color: C.lime,
                          fontSize: '20px',
                          fontWeight: 700,
                          letterSpacing: '5px',
                          textDecoration: 'none',
                          fontFamily: "'Fredoka', Arial, sans-serif",
                        }}>
                        LEXICLASH
                      </Link>
                    </td>
                  </tr>

                  {/* ── 2. HERO — circular marshmallow badge (clipped) ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '20px' }}>
                      <table role="presentation" cellPadding={0} cellSpacing={0}>
                        <tr>
                          <td
                            className="mascot-ring"
                            align="center"
                            valign="middle"
                            width={160}
                            height={160}
                            style={{
                              width: '160px',
                              height: '160px',
                              backgroundColor: C.badge,
                              borderRadius: '9999px',
                              border: `4px solid ${C.black}`,
                              boxShadow: `${sh}6px 6px 0px ${C.black}`,
                              overflow: 'hidden',
                              lineHeight: 0,
                              fontSize: 0,
                            }}
                          >
                            <Img
                              src={MASCOT_SRC}
                              alt="Lexi waving hello"
                              width="148"
                              height="148"
                              className="mascot-img"
                              style={{
                                display: 'block',
                                width: '148px',
                                height: '148px',
                                borderRadius: '9999px',
                                border: 0,
                                outline: 'none',
                              }}
                            />
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* ── 3. Heading ── */}
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

                  {/* ── 4. LETTER REVEAL — the hint IS the invitation ── */}
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

                  {/* ── 5. Pitch line ── */}
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

                  {/* ── 6. CTA — single primary action ── */}
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

                  {/* ── 7. Urgency — inline, not a boxed panel (v1 had a box) ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '18px' }}>
                      <Text style={{
                        color: C.pink,
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'center',
                        margin: 0,
                        direction: dir,
                      }}>
                        ⏳ {t.urgency}
                      </Text>
                    </td>
                  </tr>

                  {/* ── 8. Social proof, casual P.S. ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '28px' }}>
                      <Text style={{
                        color: C.muted,
                        fontSize: '13px',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        margin: 0,
                        lineHeight: '1.5',
                        direction: dir,
                      }}>
                        {t.social}
                      </Text>
                    </td>
                  </tr>

                  {/* ── 9. Footer ── */}
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
