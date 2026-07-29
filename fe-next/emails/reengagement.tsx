/**
 * Re-engagement Email — LexiClash
 *
 * Neo-brutalist dark design with animated mascot, word tiles,
 * RTL support, Gmail dark-mode hardening, and 5-language i18n.
 *
 * Images: dev server reads from emails/static/, prod from CDN.
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
  Tailwind,
  Font,
  pixelBasedPreset,
} from '@react-email/components';

/* ─── i18n copy ─── */

const COPY: Record<string, {
  greeting: (name: string) => string;
  streak: string;
  teaser: string;
  question: string;
  cta: string;
  urgency: string;
  social: string;
  footerReason: string;
  unsubscribe: string;
  privacy: string;
}> = {
  en: {
    greeting: (n) => `Oi ${n}, where'd you go?`,
    streak: 'Your streak just filed a missing persons report',
    teaser: "Today's word starts with...",
    question: 'Bet you can\'t crack it 😏',
    cta: 'Prove Me Wrong',
    urgency: 'Gone by midnight — no pressure',
    social: 'Meanwhile, your friends won\'t stop flexing on the leaderboard',
    footerReason: 'You signed up for this (literally).',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    greeting: (n) => `?${n} ,לאן נעלמת`,
    streak: 'הרצף שלך הגיש תלונה על נטישה',
    teaser: '...המילה של היום מתחילה ב',
    question: '😏 בטוח/ה שתצליח/י?',
    cta: 'תוכיח/י לי',
    urgency: 'נעלם בחצות — בלי לחץ',
    social: 'בינתיים, החברים שלך לא מפסיקים להתגאות בטבלה',
    footerReason: '.נרשמת לזה (ברצון)',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
  },
  sv: {
    greeting: (n) => `Hallå ${n}, vart tog du vägen?`,
    streak: 'Din streak har anmält dig försvunnen',
    teaser: 'Dagens ord börjar med...',
    question: 'Klarar du det? Tveksamt 😏',
    cta: 'Bevisa motsatsen',
    urgency: 'Borta vid midnatt — ingen stress',
    social: 'Under tiden skryter dina vänner på topplistan',
    footerReason: 'Du anmälde dig till detta (frivilligt).',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
  },
  ja: {
    greeting: (n) => `${n}さん、どこ行っちゃったの？`,
    streak: '連続記録が捜索願を出しました',
    teaser: '今日の単語の最初の文字は...',
    question: '解ける？ …無理かもね 😏',
    cta: 'やれるもんならどうぞ',
    urgency: '深夜0時に消滅 — 焦らないで',
    social: 'あなたがいない間、フレンドがランキング爆上げ中',
    footerReason: '自分で登録したんですよ。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  es: {
    greeting: (n) => `Oye ${n}, ¿a dónde te fuiste?`,
    streak: 'Tu racha acaba de denunciar tu desaparición',
    teaser: 'La palabra de hoy empieza con...',
    question: '¿Seguro que puedes? 😏',
    cta: 'Demuéstramelo',
    urgency: 'Desaparece a medianoche — sin presión',
    social: 'Mientras tanto, tus amigos no paran de presumir en la tabla',
    footerReason: 'Te apuntaste a esto (voluntariamente).',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
  },
};

/** Rotating subject lines per language */
export const SUBJECT_LINES: Record<string, ((letter: string, name: string) => string)[]> = {
  en: [
    (l) => `"${l}____" — we dare you 👀`,
    (_l, n) => `${n}, your streak just mass-texted us crying`,
    (l) => `today's word starts with "${l}" and ends with regret if you skip it`,
    (_l, n) => `${n} ghosted us and honestly? rude`,
    (l) => `"${l}___" — your friends already solved it btw`,
  ],
  he: [
    (l) => `"${l}____" — מעזים אותך 👀`,
    (_l, n) => `${n}, הרצף שלך שלח לנו הודעה בבכי`,
    (l) => `המילה מתחילה ב"${l}" ונגמרת בחרטה אם תדלג/י`,
    (_l, n) => `${n} עשה/תה לנו גוסטינג ובכנות? חוצפה`,
    (l) => `"${l}___" — החברים שלך כבר פתרו אגב`,
  ],
  sv: [
    (l) => `"${l}____" — vi utmanar dig 👀`,
    (_l, n) => `${n}, din streak skickade precis ett gråtande sms`,
    (l) => `dagens ord börjar med "${l}" och slutar med ånger om du skippar`,
    (_l, n) => `${n} ghostade oss och ärligt talat? oförskämt`,
    (l) => `"${l}___" — dina vänner har redan löst det btw`,
  ],
  ja: [
    (l) => `「${l}____」— やれるもんなら 👀`,
    (_l, n) => `${n}さん、連続記録が泣きながらDM送ってきた`,
    (l) => `「${l}」で始まる今日の単語、スキップしたら後悔するよ`,
    (_l, n) => `${n}さんに既読スルーされた件、正直ひどい`,
    (l) => `「${l}___」— フレンドはもう解いたけどね`,
  ],
  es: [
    (l) => `"${l}____" — te retamos 👀`,
    (_l, n) => `${n}, tu racha nos mandó un mensaje llorando`,
    (l) => `la palabra empieza con "${l}" y termina en arrepentimiento si te la saltas`,
    (_l, n) => `${n} nos ghosteó y sinceramente? qué grosería`,
    (l) => `"${l}___" — tus amigos ya lo resolvieron por cierto`,
  ],
};

/** Pick a subject line based on day-of-year rotation */
export function getReengagementSubject(
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

/* ─── Props ─── */

interface ReengagementEmailProps {
  recipientName: string;
  firstLetter: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
}

/* ─── Assets ─── */

const mascotSrc = 'https://www.lexiclash.live/mascot/crying-nobg.gif';

/* ─── Colors (solid hex only — Gmail dark-mode safe) ─── */

const C = {
  bg: '#1a1a2e',
  card: '#252545',
  cardTop: '#252545',
  cardInner: '#1e1e3a',
  tileEmpty: '#2a2a4a',
  border: '#000000',
  tileBorder: '#44447a',
  muted: '#9CA3AF',
  subtle: '#9CA3AF',
  footer: '#666666',
  urgencyBg: '#331030',
  urgencyBorder: '#6a2858',
  lime: '#A8E600',
  limeMuted: '#96CC00',
  pink: '#FF1493',
  cyan: '#5CE0D6',
  purple: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
  filledTile: '#5CE0D6',
  grayDark: '#374151',
  grayLight: '#9CA3AF',
} as const;

/* ─── Component ─── */

export default function ReengagementEmail({
  recipientName,
  firstLetter,
  language,
  unsubscribeUrl,
  playUrl,
}: ReengagementEmailProps) {
  const t = COPY[language] || COPY['en'];
  const rtl = language === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const sh = rtl ? '-' : '';
  /* arrow removed — cleaner CTA without play icon */
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';
  const privacyUrl = `https://lexiclash.live/${locale}/privacy`;
  const year = new Date().getFullYear();

  const TILES = 5;
  const firstIdx = rtl ? TILES - 1 : 0;

  return (
    <Html lang={language} dir={dir}>
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head>
          <Font
            fontFamily="Fredoka"
            fallbackFontFamily="Arial"
            webFont={{
              url: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap',
              format: 'woff2',
            }}
          />
          <meta name="color-scheme" content="dark" />
          <meta name="supported-color-schemes" content="dark" />
          <style>{`
            u + .body { background-color: ${C.bg} !important; }
            [data-ogsc] h1 { color: ${C.white} !important; }
            [data-ogsc] .cta-btn { background-color: ${C.lime} !important; color: ${C.black} !important; }
            [data-ogsc] .cta-td { background-color: ${C.lime} !important; }
            [data-ogsc] .streak { color: ${C.pink} !important; }
            [data-ogsc] .q { color: ${C.cyan} !important; }
            [data-ogsb] .cta-btn { background-color: ${C.lime} !important; }
            [data-ogsb] .cta-td { background-color: ${C.lime} !important; }
            :root { color-scheme: dark !important; }
            @media (prefers-color-scheme: dark) {
              .body, body { background-color: ${C.bg} !important; }
              .cta-btn { background-color: ${C.lime} !important; color: ${C.black} !important; }
              .cta-td { background-color: ${C.lime} !important; }
            }
            u + .body .cta-btn { background-color: ${C.lime} !important; color: ${C.black} !important; }
            u + .body .cta-td { background-color: ${C.lime} !important; }
            @media (max-width: 480px) {
              .tile-cell { width: 44px !important; height: 44px !important; font-size: 22px !important; }
            }
          `}</style>
        </Head>

        <Preview>
          {t.teaser} {firstLetter} — {t.question}
        </Preview>

        <Body className="body" style={{
          margin: 0, padding: 0,
          backgroundColor: C.bg,
          fontFamily: "'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}>
          {/* Outer centering table */}
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" dir={dir}
            style={{ backgroundColor: C.bg }}>
            <tr>
              <td align="center" style={{ padding: '32px 20px' }}>
                <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                  style={{ maxWidth: '540px' }} dir={dir}>

                  {/* ── Text wordmark ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '18px' }}>
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

                  {/* ── Main Card ── */}
                  <tr>
                    <td>
                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                        dir={dir} style={{
                          backgroundColor: C.card,
                          borderRadius: '20px',
                          border: `4px solid ${C.black}`,
                          boxShadow: `${sh}8px 8px 0px ${C.black}`,
                          overflow: 'hidden',
                        }}>

                        {/* Rainbow gradient strip */}
                        <tr>
                          <td style={{
                            background: `linear-gradient(90deg, ${C.lime}, ${C.cyan}, ${C.pink})`,
                            height: '6px', fontSize: 0, lineHeight: 0,
                          }}>&nbsp;</td>
                        </tr>

                        <tr>
                          <td style={{ padding: '24px 24px 28px' }}>

                            {/* ── Mascot (clipped circle badge) ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td align="center" style={{ paddingBottom: '16px' }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0}>
                                    <tr>
                                      <td
                                        align="center"
                                        valign="middle"
                                        width={140}
                                        height={140}
                                        style={{
                                          width: '140px',
                                          height: '140px',
                                          backgroundColor: C.pink,
                                          borderRadius: '9999px',
                                          border: `4px solid ${C.black}`,
                                          boxShadow: `${sh}6px 6px 0px ${C.black}`,
                                          overflow: 'hidden',
                                          lineHeight: 0,
                                          fontSize: 0,
                                        }}
                                      >
                                        <Img
                                          src={mascotSrc}
                                          alt="Lexi misses you"
                                          width="132"
                                          height="132"
                                          style={{
                                            display: 'block',
                                            width: '132px',
                                            height: '132px',
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
                            </table>

                            {/* ── Greeting + streak ── */}
                            <Heading as="h1" style={{
                              color: C.white,
                              fontSize: '28px',
                              margin: '0 0 10px',
                              fontWeight: 700,
                              textAlign: 'center',
                              lineHeight: '1.35',
                              direction: dir,
                            }}>
                              {t.greeting(recipientName)}
                            </Heading>
                            <Text className="streak" style={{
                              color: C.pink,
                              fontSize: '15px',
                              margin: '0 0 20px',
                              fontWeight: 600,
                              textAlign: 'center',
                              direction: dir,
                            }}>
                              🔥 {t.streak}
                            </Text>

                            {/* ── Word Tiles zone ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                              style={{
                                backgroundColor: C.cardInner,
                                borderRadius: '16px',
                                border: `2px solid ${C.black}`,
                                marginBottom: '20px',
                              }}>
                              <tr>
                                <td style={{ padding: '24px 20px' }}>
                                  <Text style={{
                                    color: C.muted, fontSize: '12px', margin: '0 0 16px',
                                    textAlign: 'center', fontWeight: 700, direction: dir,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase' as const,
                                  }}>
                                    {t.teaser}
                                  </Text>

                                  {/* Tile row */}
                                  <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                                    style={{ marginBottom: '16px' }}>
                                    <tr>
                                      <td align="center">
                                        <table role="presentation" cellPadding={0} cellSpacing={10}
                                          dir={dir} style={{ borderCollapse: 'separate' }}>
                                          <tr>
                                            {Array.from({ length: TILES }, (_, i) => {
                                              const isFilled = i === firstIdx;
                                              return (
                                                <td key={`tile-${i}`} width={52} height={52} align="center" valign="middle"
                                                  style={{
                                                    width: '52px', height: '52px',
                                                    backgroundColor: isFilled ? C.filledTile : C.tileEmpty,
                                                    border: isFilled
                                                      ? `3px solid ${C.black}`
                                                      : `2px solid ${C.tileBorder}`,
                                                    borderRadius: '10px',
                                                    boxShadow: isFilled
                                                      ? `${sh}3px 3px 0px ${C.black}`
                                                      : 'none',
                                                    fontSize: isFilled ? '26px' : '20px',
                                                    fontWeight: 700,
                                                    color: isFilled ? C.black : C.tileBorder,
                                                    fontFamily: "'Fredoka', Arial, sans-serif",
                                                    textAlign: 'center',
                                                  }}>
                                                  {isFilled ? firstLetter : '?'}
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>

                                  <Text className="q" style={{
                                    color: C.cyan, fontSize: '16px', textAlign: 'center',
                                    margin: '0', fontWeight: 600, direction: dir,
                                  }}>
                                    {t.question}
                                  </Text>
                                </td>
                              </tr>
                            </table>

                            {/* ── CTA Button — lime, neo-brutalist ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td align="center" style={{ paddingBottom: '24px' }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0}
                                    style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}>
                                    <tr>
                                      <td align="center" className="cta-td" style={{
                                        backgroundColor: C.lime,
                                        borderRadius: '12px',
                                        border: `3px solid ${C.black}`,
                                        boxShadow: `${sh}5px 5px 0px ${C.black}`,
                                      }}>
                                        <Button
                                          href={playUrl}
                                          className="cta-btn"
                                          style={{
                                            display: 'block',
                                            backgroundColor: C.lime,
                                            color: C.black,
                                            fontSize: '18px',
                                            fontWeight: 700,
                                            textDecoration: 'none',
                                            padding: '16px 48px',
                                            borderRadius: '12px',
                                            fontFamily: "'Fredoka', Arial, sans-serif",
                                            letterSpacing: '2px',
                                            textAlign: 'center',
                                            textTransform: 'uppercase' as const,
                                            width: '100%',
                                          }}>
                                          ▶ &nbsp;{t.cta}
                                        </Button>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            {/* Urgency bar — styled like the daily email streak reminder */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td style={{
                                  backgroundColor: C.urgencyBg,
                                  border: `2px solid ${C.urgencyBorder}`,
                                  borderRadius: '8px',
                                  padding: '14px 16px',
                                  marginBottom: '16px',
                                }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                                    <tr>
                                      <td width="32" valign="middle">
                                        <span style={{ fontSize: '22px' }}>⏰</span>
                                      </td>
                                      <td valign="middle">
                                        <span style={{
                                          color: C.pink,
                                          fontSize: '14px',
                                          fontWeight: 600,
                                          lineHeight: '1.4',
                                          direction: dir,
                                        }}>
                                          {t.urgency}
                                        </span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            {/* Social proof */}
                            <Text style={{
                              color: C.subtle, fontSize: '13px', margin: '16px 0 0',
                              textAlign: 'center', fontStyle: 'italic', direction: dir,
                            }}>
                              {t.social}
                            </Text>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* ── Footer ── */}
                  <tr>
                    <td style={{ paddingTop: '24px' }}>
                      {/* Divider */}
                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                        style={{ marginBottom: '20px' }}>
                        <tr>
                          <td style={{ borderTop: `1px solid ${C.grayDark}` }}>&nbsp;</td>
                        </tr>
                      </table>

                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                        <tr>
                          <td align="center" dir={dir}>
                            <Text style={{
                              color: C.footer, fontSize: '12px', margin: '0 0 12px',
                              lineHeight: '1.6', direction: dir,
                            }}>
                              {t.footerReason}
                            </Text>
                            <Text style={{ color: C.footer, fontSize: '12px', margin: '0', lineHeight: '1.6' }}>
                              <Link href={unsubscribeUrl} target="_blank"
                                style={{ color: C.grayLight, textDecoration: 'underline' }}>
                                {t.unsubscribe}
                              </Link>
                              <span style={{ color: C.grayDark }}>&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                              <Link href={playUrl} target="_blank"
                                style={{ color: C.grayLight, textDecoration: 'underline' }}>
                                LexiClash
                              </Link>
                              <span style={{ color: C.grayDark }}>&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                              <Link href={privacyUrl} target="_blank"
                                style={{ color: C.grayLight, textDecoration: 'underline' }}>
                                {t.privacy}
                              </Link>
                            </Text>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                        style={{ marginTop: '24px' }}>
                        <tr>
                          <td align="center">
                            <span style={{ color: C.grayDark, fontSize: '11px' }}>
                              &copy; {year} LexiClash
                            </span>
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

ReengagementEmail.PreviewProps = {
  recipientName: 'Word Hunter',
  firstLetter: 'S',
  language: 'en',
  unsubscribeUrl: 'https://lexiclash.live/api/email/unsubscribe?token=test123',
  playUrl: 'https://lexiclash.live/en/daily',
} satisfies ReengagementEmailProps;
