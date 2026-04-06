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

/* ─── Image base: dev server vs production CDN ─── */

const imgBase = process.env.NODE_ENV === 'production'
  ? 'https://lexiclash.live'
  : '';

const mascotSrc = `${imgBase}/static/mascot-waving.gif`;

/* ─── Colors (solid hex only — Gmail dark-mode safe) ─── */

const C = {
  bg: '#0f0f23',
  card: '#1a1a35',
  cardTop: '#221a40',
  cardInner: '#141430',
  tileEmpty: '#2a2a55',
  border: '#2e2e55',
  tileBorder: '#44447a',
  muted: '#9999bb',
  subtle: '#7a7aa0',
  footer: '#606080',
  urgencyBg: '#331030',
  urgencyBorder: '#6a2858',
  lime: '#BFFF00',
  pink: '#FF6BB8',
  cyan: '#00FFFF',
  purple: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
  mascotBg: '#1e1e3e',
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
  const arrow = rtl ? '◀' : '▶';
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
            [data-ogsc] .streak { color: ${C.pink} !important; }
            [data-ogsc] .q { color: ${C.cyan} !important; }
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
          fontFamily: "'Fredoka', Arial, Helvetica, sans-serif",
        }}>
          {/* Outer centering table */}
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" dir={dir}
            style={{ backgroundColor: C.bg }}>
            <tr>
              <td align="center" style={{ padding: '32px 16px' }}>
                <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                  style={{ maxWidth: '460px' }} dir={dir}>

                  {/* ── Text Logo ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '24px' }}>
                      <Link href={playUrl} target="_blank" style={{ textDecoration: 'none' }}>
                        <span style={{
                          fontSize: '32px',
                          fontWeight: 700,
                          color: C.lime,
                          letterSpacing: '4px',
                          fontFamily: "'Fredoka', Arial, sans-serif",
                          textShadow: `${sh}2px 2px 0px ${C.black}`,
                        }}>
                          LEXICLASH
                        </span>
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
                          boxShadow: `${sh}6px 6px 0px ${C.black}`,
                          overflow: 'hidden',
                        }}>

                        {/* Rainbow gradient strip — thicker for visibility */}
                        <tr>
                          <td style={{
                            background: `linear-gradient(90deg, ${C.lime}, ${C.cyan}, ${C.purple}, ${C.pink})`,
                            height: '6px', fontSize: 0, lineHeight: 0,
                          }}>&nbsp;</td>
                        </tr>

                        <tr>
                          <td>
                            {/* ── Mascot in dark circle to mask white bg ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td align="center" style={{
                                  padding: '40px 28px 16px',
                                  backgroundColor: C.cardTop,
                                }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0}>
                                    <tr>
                                      <td align="center" valign="middle" style={{
                                        width: '130px',
                                        height: '130px',
                                        backgroundColor: C.mascotBg,
                                        borderRadius: '50%',
                                        border: `3px solid ${C.border}`,
                                        boxShadow: `${sh}3px 3px 0px ${C.black}`,
                                        overflow: 'hidden',
                                      }}>
                                        <Img
                                          src={mascotSrc}
                                          alt="Lexi waving hello"
                                          width="120"
                                          height="120"
                                          style={{ display: 'block', width: '120px', height: '120px' }}
                                        />
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            {/* ── Greeting + streak ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td style={{ padding: '4px 32px 0' }}>
                                  <Heading as="h1" style={{
                                    color: C.white,
                                    fontSize: '26px',
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
                                    margin: '0 0 32px',
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    direction: dir,
                                  }}>
                                    🔥 {t.streak}
                                  </Text>
                                </td>
                              </tr>
                            </table>

                            {/* ── Word Tiles zone ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td style={{
                                  padding: '28px 28px 24px',
                                  backgroundColor: C.cardInner,
                                }}>
                                  <Text style={{
                                    color: C.muted, fontSize: '14px', margin: '0 0 18px',
                                    textAlign: 'center', fontWeight: 500, direction: dir,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase' as const,
                                  }}>
                                    {t.teaser}
                                  </Text>

                                  {/* Tile row */}
                                  <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                                    style={{ marginBottom: '18px' }}>
                                    <tr>
                                      <td align="center">
                                        <table role="presentation" cellPadding={0} cellSpacing={10}
                                          dir={dir} style={{ borderCollapse: 'separate' }}>
                                          <tr>
                                            {Array.from({ length: TILES }, (_, i) => {
                                              const isFilled = i === firstIdx;
                                              return (
                                                <td key={i} width={52} height={52} align="center" valign="middle"
                                                  style={{
                                                    width: '52px', height: '52px',
                                                    backgroundColor: isFilled ? C.lime : C.tileEmpty,
                                                    border: isFilled
                                                      ? `3px solid ${C.black}`
                                                      : `2px solid ${C.tileBorder}`,
                                                    borderRadius: '12px',
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

                            {/* ── CTA + urgency ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td style={{ padding: '28px 28px 28px' }}>
                                  {/* CTA button — full width for impact */}
                                  <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                                    <tr>
                                      <td align="center" style={{ paddingBottom: '24px' }}>
                                        <table role="presentation" cellPadding={0} cellSpacing={0}
                                          style={{ width: '100%', maxWidth: '320px' }}>
                                          <tr>
                                            <td align="center" style={{
                                              backgroundColor: C.lime,
                                              borderRadius: '14px',
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
                                                  fontSize: '20px',
                                                  fontWeight: 700,
                                                  textDecoration: 'none',
                                                  padding: '16px 32px',
                                                  borderRadius: '14px',
                                                  fontFamily: "'Fredoka', Arial, sans-serif",
                                                  letterSpacing: '0.5px',
                                                  textAlign: 'center',
                                                  width: '100%',
                                                }}>
                                                {arrow}&nbsp;&nbsp;{t.cta}
                                              </Button>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>

                                  {/* Urgency pill */}
                                  <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                                    <tr>
                                      <td align="center" style={{ paddingBottom: '18px' }}>
                                        <table role="presentation" cellPadding={0} cellSpacing={0}>
                                          <tr>
                                            <td style={{
                                              backgroundColor: C.urgencyBg,
                                              border: `1px solid ${C.urgencyBorder}`,
                                              borderRadius: '20px',
                                              padding: '8px 22px',
                                              fontSize: '13px',
                                              color: C.pink,
                                              fontWeight: 600,
                                              textAlign: 'center',
                                            }}>
                                              ⏰ {t.urgency}
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>

                                  <Text style={{
                                    color: C.subtle, fontSize: '13px', margin: '0',
                                    textAlign: 'center', fontStyle: 'italic', direction: dir,
                                  }}>
                                    {t.social}
                                  </Text>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* ── Footer ── */}
                  <tr>
                    <td align="center" dir={dir} style={{ padding: '28px 0 8px' }}>
                      <Text style={{
                        color: C.footer, fontSize: '11px', margin: '0 0 8px',
                        lineHeight: '1.6', direction: dir,
                      }}>
                        {t.footerReason}
                      </Text>
                      <Text style={{ color: C.footer, fontSize: '11px', margin: '0', lineHeight: '1.6' }}>
                        <Link href={unsubscribeUrl} target="_blank"
                          style={{ color: C.muted, textDecoration: 'underline' }}>
                          {t.unsubscribe}
                        </Link>
                        <span style={{ color: '#303050' }}>&nbsp;&middot;&nbsp;</span>
                        <Link href={playUrl} target="_blank"
                          style={{ color: C.muted, textDecoration: 'underline' }}>
                          LexiClash
                        </Link>
                        <span style={{ color: '#303050' }}>&nbsp;&middot;&nbsp;</span>
                        <Link href={privacyUrl} target="_blank"
                          style={{ color: C.muted, textDecoration: 'underline' }}>
                          {t.privacy}
                        </Link>
                      </Text>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style={{ padding: '4px 0 0' }}>
                      <span style={{ color: '#404060', fontSize: '10px' }}>
                        &copy; {year} LexiClash
                      </span>
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
