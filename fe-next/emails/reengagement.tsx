/**
 * Re-engagement Email — React Email Template
 * Neo-brutalist dark design with RTL support and localized content
 *
 * 3-zone layout:
 *   Zone 1 — Emotional hook: mascot + greeting + streak warning
 *   Zone 2 — Curiosity gap: word tiles (the hero element)
 *   Zone 3 — CTA: single prominent button + urgency
 *
 * Gmail Dark Mode hardening:
 * - Solid hex colors only (no rgba)
 * - No opacity on text elements
 * - [data-ogsc] overrides for Gmail's color-shifting
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

// ==========================================
// Localized Strings
// ==========================================

const LOCALIZED_STRINGS: Record<string, {
  greeting: (name: string) => string;
  teaser: string;
  question: string;
  cta: string;
  footerReason: string;
  urgency: string;
  streakLost: string;
  unsubscribe: string;
  privacy: string;
  comeBack: string;
}> = {
  en: {
    greeting: (name) => `We miss you, ${name}!`,
    teaser: "Today's word starts with...",
    question: 'Can you figure it out?',
    cta: 'Reveal the Word',
    footerReason: 'You subscribed to daily challenges.',
    urgency: 'Expires at midnight',
    streakLost: 'Your streak is fading...',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
    comeBack: "Your friends are still climbing the leaderboard",
  },
  he: {
    greeting: (name) => `!${name} ,התגעגענו אליך`,
    teaser: '...המילה של היום מתחילה ב',
    question: '?תצליח/י לגלות',
    cta: 'גלו את המילה',
    footerReason: '.נרשמת לאתגר היומי',
    urgency: 'נגמר בחצות',
    streakLost: '...הרצף שלך נעלם',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
    comeBack: 'החברים שלך עדיין מטפסים בטבלה',
  },
  sv: {
    greeting: (name) => `Vi saknar dig, ${name}!`,
    teaser: 'Dagens ord börjar med...',
    question: 'Kan du lista ut det?',
    cta: 'Avslöja ordet',
    footerReason: 'Du prenumererar på dagliga utmaningar.',
    urgency: 'Slutar vid midnatt',
    streakLost: 'Din streak bleknar...',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
    comeBack: 'Dina vänner klättrar fortfarande på topplistan',
  },
  ja: {
    greeting: (name) => `${name}さん、お待ちしています！`,
    teaser: '今日の単語の最初の文字は...',
    question: 'わかりますか？',
    cta: '単語を明かす',
    footerReason: 'デイリーチャレンジに登録しています。',
    urgency: '深夜0時に終了',
    streakLost: '連続記録が消えかけています...',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
    comeBack: 'フレンドはまだランキングを上げています',
  },
  es: {
    greeting: (name) => `¡Te extrañamos, ${name}!`,
    teaser: 'La palabra de hoy empieza con...',
    question: '¿Puedes adivinarla?',
    cta: 'Revelar la palabra',
    footerReason: 'Te suscribiste al desafío diario.',
    urgency: 'Expira a medianoche',
    streakLost: 'Tu racha se desvanece...',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
    comeBack: 'Tus amigos siguen subiendo en la tabla',
  },
};

/** Subject line variations per language (rotate by day) */
export const SUBJECT_LINES: Record<string, ((letter: string, name: string) => string)[]> = {
  en: [
    (l) => `psst... it starts with "${l}" \u{1F440}`,
    (_l, name) => `${name}!! come back, we left you something`,
    (l) => `ok but "${l}____" is a tough one today`,
    (_l, name) => `hey ${name}, you won't believe today's word`,
    (l) => `quick — today's hint: ${l}___`,
  ],
  he: [
    (l) => `פסטט... זה מתחיל ב"${l}" \u{1F440}`,
    (_l, name) => `${name}!! תחזור/י, השארנו לך משהו`,
    (l) => `"${l}____" — קשה היום, אה?`,
    (_l, name) => `הי ${name}, לא תאמין/י מה המילה היום`,
    (l) => `רמז מהיר: ${l}___`,
  ],
  sv: [
    (l) => `psst... det börjar med "${l}" \u{1F440}`,
    (_l, name) => `${name}!! kom tillbaka, vi sparade något`,
    (l) => `"${l}____" — en tuff idag`,
    (_l, name) => `hey ${name}, du kommer inte tro dagens ord`,
    (l) => `snabb ledtråd: ${l}___`,
  ],
  ja: [
    (l) => `ねえ…「${l}」から始まるよ \u{1F440}`,
    (_l, name) => `${name}さん！戻ってきて、何か残してあるよ`,
    (l) => `「${l}____」今日は難しいかも`,
    (_l, name) => `ねえ${name}さん、今日の単語すごいよ`,
    (l) => `ヒント: ${l}___`,
  ],
  es: [
    (l) => `psst... empieza con "${l}" \u{1F440}`,
    (_l, name) => `${name}!! vuelve, te dejamos algo`,
    (l) => `"${l}____" — hoy está difícil`,
    (_l, name) => `oye ${name}, no vas a creer la palabra de hoy`,
    (l) => `pista rápida: ${l}___`,
  ],
};

// ==========================================
// Helper Functions
// ==========================================

export function getReengagementSubject(
  language: string,
  firstLetter: string,
  recipientName: string,
): string {
  const lines = SUBJECT_LINES[language] || SUBJECT_LINES['en'];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24),
  );
  return lines[dayOfYear % lines.length](firstLetter, recipientName);
}

// ==========================================
// Props
// ==========================================

interface ReengagementEmailProps {
  recipientName: string;
  firstLetter: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
  baseUrl: string;
}

// ==========================================
// Colors (Gmail dark mode-safe — all solid hex)
// ==========================================

const C = {
  bgOuter: '#0d0d1f',
  bgCard: '#1a1a35',
  bgTileEmpty: '#252548',
  borderCard: '#2e2e55',
  borderTileEmpty: '#3a3a65',
  textMuted: '#8888aa',
  textSubtle: '#6a6a90',
  textFooter: '#707090',
  urgencyBg: '#2a1028',
  urgencyBorder: '#5a2048',
  lime: '#BFFF00',
  pinkLight: '#FF6BB8',
  cyan: '#00FFFF',
  white: '#FFFFFF',
  black: '#000000',
} as const;

const WORD_TILE_COUNT = 5;

// ==========================================
// Component
// ==========================================

export default function ReengagementEmail({
  recipientName,
  firstLetter,
  language,
  unsubscribeUrl,
  playUrl,
  baseUrl,
}: ReengagementEmailProps) {
  const strings = LOCALIZED_STRINGS[language] || LOCALIZED_STRINGS['en'];
  const isRTL = language === 'he';
  const dir = isRTL ? 'rtl' : 'ltr';
  const shadowDir = isRTL ? '-' : '';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';
  const privacyUrl = `${baseUrl}/${locale}/privacy`;
  const playArrow = isRTL ? '\u25C0' : '\u25B6';
  const currentYear = new Date().getFullYear();

  const logoUrl = language === 'he'
    ? `${baseUrl}/logos/lexiclash_logo_hebrew-min.webp`
    : `${baseUrl}/logos/lexiclash_logo_english-min.webp`;
  const mascotUrl = `${baseUrl}/mascot/waving.gif`;

  // Build tile indices — RTL reverses which tile gets the letter
  const tiles = Array.from({ length: WORD_TILE_COUNT }, (_, i) => {
    const isFirst = isRTL ? i === WORD_TILE_COUNT - 1 : i === 0;
    return { index: i, isFirst };
  });

  return (
    <Html lang={language} dir={dir}>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                'neo-lime': C.lime,
                'neo-pink-light': C.pinkLight,
                'neo-cyan': C.cyan,
              },
            },
          },
        }}
      >
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
          {/* Gmail dark mode overrides */}
          <style>{`
            u + .body { background-color: ${C.bgOuter} !important; }
            [data-ogsc] h1,
            [data-ogsc] .greeting-text { color: ${C.white} !important; }
            [data-ogsc] .cta-link { background-color: ${C.lime} !important; color: ${C.black} !important; }
            [data-ogsc] .streak-text { color: ${C.pinkLight} !important; }
            [data-ogsc] .question-text { color: ${C.cyan} !important; }
            [data-ogsc] .tile-letter { background-color: ${C.lime} !important; color: ${C.black} !important; }
            [data-ogsc] .tile-empty { background-color: ${C.bgTileEmpty} !important; }
          `}</style>
        </Head>

        <Preview>
          {strings.teaser} {firstLetter} — {strings.question}
        </Preview>

        <Body
          className="body"
          style={{
            margin: 0,
            padding: 0,
            backgroundColor: C.bgOuter,
            fontFamily: "'Fredoka', Arial, Helvetica, sans-serif",
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          {/* Outer wrapper */}
          <table
            role="presentation"
            cellPadding={0}
            cellSpacing={0}
            width="100%"
            dir={dir}
            style={{ backgroundColor: C.bgOuter }}
          >
            <tr>
              <td align="center" style={{ padding: '28px 20px' }}>
                <table
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  width="100%"
                  dir={dir}
                  style={{ maxWidth: '440px' }}
                >
                  {/* Logo */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '24px' }}>
                      <Link href={playUrl} target="_blank">
                        <Img
                          src={logoUrl}
                          alt="LexiClash"
                          width="100"
                          style={{ display: 'block', maxWidth: '100px', height: 'auto' }}
                        />
                      </Link>
                    </td>
                  </tr>

                  {/* Main Card */}
                  <tr>
                    <td>
                      <table
                        role="presentation"
                        cellPadding={0}
                        cellSpacing={0}
                        width="100%"
                        dir={dir}
                        style={{
                          backgroundColor: C.bgCard,
                          border: `2px solid ${C.borderCard}`,
                          borderRadius: '20px',
                          boxShadow: `${shadowDir}6px 6px 0px ${C.black}`,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Top accent bar */}
                        <tr>
                          <td
                            style={{
                              backgroundColor: C.lime,
                              height: '4px',
                              fontSize: 0,
                              lineHeight: 0,
                            }}
                          >
                            &nbsp;
                          </td>
                        </tr>

                        <tr>
                          <td style={{ padding: '32px 28px 36px', backgroundColor: C.bgCard }}>

                            {/* ═══ ZONE 1: Emotional Hook ═══ */}

                            {/* Mascot */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td align="center" style={{ paddingBottom: '12px' }}>
                                  <Img
                                    src={mascotUrl}
                                    alt="Lexi"
                                    width="72"
                                    height="72"
                                    style={{ display: 'block', width: '72px', height: '72px' }}
                                  />
                                </td>
                              </tr>
                            </table>

                            {/* Greeting */}
                            <Heading
                              className="greeting-text"
                              as="h1"
                              style={{
                                color: C.white,
                                fontSize: '26px',
                                margin: '0 0 6px',
                                fontWeight: 700,
                                textAlign: 'center',
                                lineHeight: 1.3,
                                direction: dir,
                              }}
                            >
                              {strings.greeting(recipientName)}
                            </Heading>

                            {/* Streak fading */}
                            <Text
                              className="streak-text"
                              style={{
                                color: C.pinkLight,
                                fontSize: '14px',
                                margin: '0 0 28px',
                                fontWeight: 500,
                                textAlign: 'center',
                                direction: dir,
                              }}
                            >
                              {'\u{1F525}'} {strings.streakLost}
                            </Text>

                            {/* ═══ ZONE 2: Curiosity Gap (Hero) ═══ */}

                            {/* Teaser */}
                            <Text
                              style={{
                                color: C.textMuted,
                                fontSize: '15px',
                                lineHeight: 1.5,
                                margin: '0 0 16px',
                                textAlign: 'center',
                                fontWeight: 500,
                                direction: dir,
                                letterSpacing: '0.3px',
                              }}
                            >
                              {strings.teaser}
                            </Text>

                            {/* Word Tiles — using <td> for Gmail safety */}
                            <table
                              role="presentation"
                              cellPadding={0}
                              cellSpacing={0}
                              width="100%"
                              style={{ marginBottom: '12px' }}
                            >
                              <tr>
                                <td align="center">
                                  <table
                                    role="presentation"
                                    cellPadding={0}
                                    cellSpacing={8}
                                    dir={dir}
                                    style={{ borderCollapse: 'separate' }}
                                  >
                                    <tr>
                                      {tiles.map((tile) =>
                                        tile.isFirst ? (
                                          <td
                                            key={tile.index}
                                            className="tile-letter"
                                            width={56}
                                            height={56}
                                            align="center"
                                            valign="middle"
                                            style={{
                                              width: '56px',
                                              height: '56px',
                                              backgroundColor: C.lime,
                                              border: `3px solid ${C.black}`,
                                              borderRadius: '12px',
                                              boxShadow: `${shadowDir}3px 3px 0px ${C.black}`,
                                              fontSize: '28px',
                                              fontWeight: 700,
                                              color: C.black,
                                              fontFamily: "'Fredoka', Arial, sans-serif",
                                              textAlign: 'center',
                                            }}
                                          >
                                            {firstLetter}
                                          </td>
                                        ) : (
                                          <td
                                            key={tile.index}
                                            className="tile-empty"
                                            width={56}
                                            height={56}
                                            align="center"
                                            valign="middle"
                                            style={{
                                              width: '56px',
                                              height: '56px',
                                              backgroundColor: C.bgTileEmpty,
                                              border: `2px solid ${C.borderTileEmpty}`,
                                              borderRadius: '12px',
                                              boxShadow: `${shadowDir}2px 2px 0px #0a0a18`,
                                              fontSize: '22px',
                                              fontWeight: 600,
                                              color: '#55558a',
                                              fontFamily: "'Fredoka', Arial, sans-serif",
                                              textAlign: 'center',
                                            }}
                                          >
                                            ?
                                          </td>
                                        ),
                                      )}
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            {/* Question */}
                            <Text
                              className="question-text"
                              style={{
                                color: C.cyan,
                                fontSize: '16px',
                                textAlign: 'center',
                                margin: '0 0 28px',
                                fontWeight: 600,
                                direction: dir,
                              }}
                            >
                              {strings.question}
                            </Text>

                            {/* ═══ ZONE 3: CTA ═══ */}

                            {/* CTA Button */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td align="center" style={{ paddingBottom: '20px' }}>
                                  <Button
                                    href={playUrl}
                                    className="cta-link box-border"
                                    style={{
                                      display: 'inline-block',
                                      backgroundColor: C.lime,
                                      color: C.black,
                                      fontSize: '20px',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      padding: '18px 52px',
                                      border: `3px solid ${C.black}`,
                                      borderRadius: '14px',
                                      boxShadow: `${shadowDir}5px 5px 0px ${C.black}`,
                                      fontFamily: "'Fredoka', Arial, sans-serif",
                                      letterSpacing: '0.5px',
                                      minWidth: '220px',
                                      textAlign: 'center',
                                    }}
                                  >
                                    {playArrow}&nbsp;&nbsp;{strings.cta}
                                  </Button>
                                </td>
                              </tr>
                            </table>

                            {/* Urgency badge */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td align="center" dir={dir} style={{ paddingBottom: '12px' }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0}>
                                    <tr>
                                      <td
                                        style={{
                                          backgroundColor: C.urgencyBg,
                                          border: `1px solid ${C.urgencyBorder}`,
                                          borderRadius: '20px',
                                          padding: '8px 18px',
                                          fontSize: '13px',
                                          color: C.pinkLight,
                                          fontWeight: 600,
                                          textAlign: 'center',
                                          direction: dir,
                                        }}
                                      >
                                        {'\u23F0'} {strings.urgency}
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            {/* Social proof */}
                            <Text
                              style={{
                                color: C.textSubtle,
                                fontSize: '13px',
                                margin: 0,
                                fontWeight: 400,
                                textAlign: 'center',
                                direction: dir,
                                fontStyle: 'italic',
                              }}
                            >
                              {strings.comeBack}
                            </Text>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* Footer */}
                  <tr>
                    <td align="center" dir={dir} style={{ padding: '24px 0 8px' }}>
                      <Text
                        style={{
                          color: C.textFooter,
                          fontSize: '11px',
                          margin: '0 0 8px',
                          lineHeight: 1.6,
                          direction: dir,
                        }}
                      >
                        {strings.footerReason}
                      </Text>
                      <Text style={{ color: C.textFooter, fontSize: '11px', margin: 0, lineHeight: 1.6 }}>
                        <Link href={unsubscribeUrl} target="_blank" style={{ color: C.textMuted, textDecoration: 'underline' }}>
                          {strings.unsubscribe}
                        </Link>
                        <span style={{ color: '#404060' }}>&nbsp;&middot;&nbsp;</span>
                        <Link href={playUrl} target="_blank" style={{ color: C.textMuted, textDecoration: 'underline' }}>
                          LexiClash
                        </Link>
                        <span style={{ color: '#404060' }}>&nbsp;&middot;&nbsp;</span>
                        <Link href={privacyUrl} target="_blank" style={{ color: C.textMuted, textDecoration: 'underline' }}>
                          {strings.privacy}
                        </Link>
                      </Text>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style={{ padding: '4px 0 0' }}>
                      <span style={{ color: '#505070', fontSize: '10px' }}>
                        &copy; {currentYear} LexiClash
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

// Preview props for dev server
ReengagementEmail.PreviewProps = {
  recipientName: 'Word Hunter',
  firstLetter: 'S',
  language: 'en',
  unsubscribeUrl: 'https://lexiclash.live/api/email/unsubscribe?token=test123',
  playUrl: 'https://lexiclash.live/en/daily',
  baseUrl: 'https://lexiclash.live',
} satisfies ReengagementEmailProps;
