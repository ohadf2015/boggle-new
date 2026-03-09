/**
 * Re-engagement Email HTML Template
 * Neo-brutalist design with a large first-letter tile as the hero element
 */

import { EMAIL_COLORS } from '@/lib/email';

interface EmailTemplateParams {
  recipientName: string;
  firstLetter: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
  baseUrl: string;
}

/** Localized strings for re-engagement emails */
const LOCALIZED_STRINGS: Record<string, {
  greeting: (name: string) => string;
  teaser: string;
  question: string;
  cta: string;
  footerReason: string;
  socialProof: string;
}> = {
  en: {
    greeting: (name) => `We miss you, ${name}!`,
    teaser: "Today's word starts with...",
    question: 'Can you figure it out?',
    cta: 'REVEAL THE WORD',
    footerReason: 'You subscribed to daily challenges.',
    socialProof: 'Join thousands of word hunters playing daily',
  },
  he: {
    greeting: (name) => `!${name} ,התגעגענו אליך`,
    teaser: '...המילה של היום מתחילה ב',
    question: '?תצליח/י לגלות',
    cta: 'גלו את המילה',
    footerReason: '.נרשמת לאתגר היומי',
    socialProof: '\u{1F30D} הצטרפו לאלפי שחקנים שמשחקים כל יום',
  },
  sv: {
    greeting: (name) => `Vi saknar dig, ${name}!`,
    teaser: 'Dagens ord börjar med...',
    question: 'Kan du lista ut det?',
    cta: 'AVSLÖJA ORDET',
    footerReason: 'Du prenumererar på dagliga utmaningar.',
    socialProof: 'Tusentals ordspelare spelar varje dag',
  },
  ja: {
    greeting: (name) => `${name}さん、お待ちしています！`,
    teaser: '今日の単語の最初の文字は...',
    question: 'わかりますか？',
    cta: '単語を確認する',
    footerReason: 'デイリーチャレンジに登録しています。',
    socialProof: '毎日何千人ものワードハンターがプレイ中',
  },
  es: {
    greeting: (name) => `¡Te extrañamos, ${name}!`,
    teaser: 'La palabra de hoy empieza con...',
    question: '¿Puedes adivinarla?',
    cta: 'DESCUBRE LA PALABRA',
    footerReason: 'Te suscribiste al desafío diario.',
    socialProof: 'Miles de cazadores de palabras juegan a diario',
  },
};

/** Subject line variations per language (rotate by day) */
const SUBJECT_LINES: Record<string, ((letter: string, name: string) => string)[]> = {
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

function getMascotUrl(baseUrl: string): string {
  return `${baseUrl}/mascot/waving-nobg.gif`;
}

function getLogoUrl(baseUrl: string, language: string): string {
  if (language === 'he') return `${baseUrl}/logos/lexiclash_logo_hebrew-min.webp`;
  return `${baseUrl}/logos/lexiclash_logo_english-min.webp`;
}

const WORD_TILE_COUNT = 5;

/**
 * Get a localized subject line, rotating by day
 */
export function getReengagementSubject(
  language: string,
  firstLetter: string,
  recipientName: string
): string {
  const lines = SUBJECT_LINES[language] || SUBJECT_LINES['en'];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % lines.length;
  return lines[index](firstLetter, recipientName);
}

/**
 * Generate the HTML email for re-engagement
 */
export function generateReengagementEmailHtml(params: EmailTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { recipientName, firstLetter, language, unsubscribeUrl, playUrl, baseUrl } = params;
  const colors = EMAIL_COLORS;
  const strings = LOCALIZED_STRINGS[language] || LOCALIZED_STRINGS['en'];
  const isRTL = language === 'he';
  const dir = isRTL ? 'rtl' : 'ltr';
  const mascotUrl = getMascotUrl(baseUrl);
  const logoUrl = getLogoUrl(baseUrl, language);
  const subject = getReengagementSubject(language, firstLetter, recipientName);
  const currentYear = new Date().getFullYear();
  const shadowDir = isRTL ? '-' : '';

  const html = `
<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      background-color: ${colors.navy};
      font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .button-cta:hover {
      transform: translate(2px, 2px);
      box-shadow: 3px 3px 0px ${colors.black} !important;
    }
    @keyframes glow-pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(255,20,147,0.3), 0 0 40px rgba(255,107,53,0.1); }
      50% { box-shadow: 0 0 30px rgba(255,20,147,0.5), 0 0 60px rgba(255,107,53,0.2); }
    }
    .cta-glow { animation: glow-pulse 2s ease-in-out infinite; }
    @media only screen and (max-width: 600px) {
      .container { padding: 16px !important; }
      .main-card { padding: 24px 16px 28px !important; }
      .word-tile { width: 48px !important; height: 48px !important; font-size: 24px !important; line-height: 42px !important; }
      .mascot-img { width: 90px !important; height: 90px !important; }
      .mascot-glow { width: 110px !important; height: 110px !important; }
      .greeting-text { font-size: 22px !important; }
      .speech-bubble { padding: 12px 16px !important; }
    }
  </style>
</head>
<body>
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${colors.navy};">
    ${strings.teaser} ${firstLetter} — ${strings.question} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Email Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${colors.navy};">
    <tr>
      <td align="center" class="container" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${baseUrl}" target="_blank" style="text-decoration: none;">
                <img src="${logoUrl}" alt="LexiClash" width="160" style="display: block; max-width: 160px; height: auto;" />
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #252545; border: 4px solid ${colors.black}; border-radius: 20px; box-shadow: ${shadowDir}8px 8px 0px ${colors.black}; overflow: hidden;">

                <!-- Decorative Header Bar -->
                <tr>
                  <td style="background: linear-gradient(90deg, ${colors.pink} 0%, ${colors.purple} 50%, ${colors.cyan} 100%); height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>

                <!-- Card Content -->
                <tr>
                  <td class="main-card" style="padding: 32px 28px 36px;">

                    <!-- Mascot with glow backdrop -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 8px;">
                      <tr>
                        <td align="center">
                          <div class="mascot-glow" style="width: 130px; height: 130px; border-radius: 50%; display: inline-block; text-align: center; line-height: 0; padding-top: 5px;">
                            <img src="${mascotUrl}" alt="Lexi the mascot waving hello" width="120" height="120" class="mascot-img" style="display: inline-block; width: 120px; height: 120px;" />
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Speech bubble greeting -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 10px solid #333355; margin-bottom: 0;">&nbsp;</div>
                          <div class="speech-bubble" style="background-color: #333355; border: 2px solid #444470; border-radius: 16px; padding: 16px 24px; display: inline-block; max-width: 420px;">
                            <h1 class="greeting-text" style="color: ${colors.white}; font-size: 26px; margin: 0 0 4px 0; font-weight: 700; text-align: center; line-height: 1.3;">
                              ${strings.greeting(recipientName)}
                            </h1>
                            <p style="color: #D1D5DB; font-size: 15px; line-height: 1.5; margin: 0; text-align: center; font-weight: 500;">
                              ${strings.teaser}
                            </p>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Decorative sparkle divider -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <span style="color: ${colors.grayDark}; font-size: 11px; letter-spacing: 6px;">&#10022; &#10022; &#10022;</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Word Hunt Tile Row -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" dir="${dir}">
                            <tr>
                              ${Array.from({ length: WORD_TILE_COUNT }, (_, i) => {
                                const isFirst = isRTL ? i === WORD_TILE_COUNT - 1 : i === 0;
                                if (isFirst) {
                                  return `<td style="padding: 0 4px;">
                                    <div class="word-tile" style="width: 64px; height: 64px; background: linear-gradient(180deg, ${colors.lime} 0%, ${colors.limeMuted} 100%); border: 3px solid ${colors.black}; border-radius: 12px; box-shadow: ${shadowDir}4px 4px 0px ${colors.black}; text-align: center; line-height: 58px; font-size: 36px; font-weight: 700; color: ${colors.black}; font-family: 'Fredoka', Arial, sans-serif;">
                                      ${firstLetter}
                                    </div>
                                  </td>`;
                                }
                                const accentColors = [
                                  { bg: '#333355', border: '#444470' },
                                  { bg: '#2d2d50', border: '#3d3d65' },
                                  { bg: '#333355', border: '#444470' },
                                  { bg: '#2d2d50', border: '#3d3d65' },
                                ];
                                const accent = accentColors[(isRTL ? WORD_TILE_COUNT - 1 - i : i) - 1] || accentColors[0];
                                return `<td style="padding: 0 4px;">
                                  <div class="word-tile" style="width: 64px; height: 64px; background: ${accent.bg}; border: 3px solid ${accent.border}; border-radius: 12px; box-shadow: ${shadowDir}3px 3px 0px ${colors.black}; text-align: center; line-height: 58px; font-size: 28px; font-weight: 700; color: ${colors.grayLight}; font-family: 'Fredoka', Arial, sans-serif;">
                                    ?
                                  </div>
                                </td>`;
                              }).join('')}
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Question -->
                    <p style="color: ${colors.cyan}; font-size: 17px; text-align: center; margin: 0 0 28px 0; font-weight: 600;">
                      ${strings.question}
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${playUrl}" style="height:62px;v-text-anchor:middle;width:320px;" arcsize="14%" stroke="t" strokecolor="${colors.black}" strokeweight="4px" fillcolor="${colors.pink}">
                            <w:anchorlock/>
                            <center style="color:${colors.white};font-family:Arial,sans-serif;font-size:20px;font-weight:bold;">&#9654; ${strings.cta}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${playUrl}" target="_blank" class="cta-button button-cta cta-glow" style="display: inline-block; background: linear-gradient(135deg, ${colors.pink} 0%, ${colors.orange} 100%); color: ${colors.white}; font-size: 20px; font-weight: 700; text-decoration: none; padding: 18px 52px; border: 4px solid ${colors.black}; border-radius: 14px; box-shadow: ${shadowDir}6px 6px 0px ${colors.black}; letter-spacing: 2px; font-family: 'Fredoka', Arial, sans-serif; text-transform: uppercase;">
                            &#9654;&nbsp;&nbsp;${strings.cta}
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Social Proof -->
          <tr>
            <td style="padding-top: 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <span style="color: ${colors.grayLight}; font-size: 13px; font-weight: 500;">
                      ${strings.socialProof}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="border-top: 1px solid ${colors.grayDark};">&nbsp;</td>
                </tr>
              </table>

              <!-- Footer Links -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="color: ${colors.gray}; font-size: 12px; margin: 0 0 12px 0; line-height: 1.6;">
                      ${strings.footerReason}
                    </p>
                    <p style="color: ${colors.gray}; font-size: 12px; margin: 0; line-height: 1.6;">
                      <a href="${unsubscribeUrl}" target="_blank" style="color: ${colors.grayLight}; text-decoration: underline;">Unsubscribe</a>
                      <span style="color: ${colors.grayDark};">&nbsp;&nbsp;•&nbsp;&nbsp;</span>
                      <a href="${baseUrl}" target="_blank" style="color: ${colors.grayLight}; text-decoration: underline;">LexiClash</a>
                      <span style="color: ${colors.grayDark};">&nbsp;&nbsp;•&nbsp;&nbsp;</span>
                      <a href="${baseUrl}/${language === 'he' ? 'he' : language === 'sv' ? 'sv' : language === 'ja' ? 'ja' : language === 'es' ? 'es' : 'en'}/privacy" target="_blank" style="color: ${colors.grayLight}; text-decoration: underline;">Privacy</a>
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <span style="color: ${colors.grayDark}; font-size: 11px;">&copy; ${currentYear} LexiClash</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
${strings.greeting(recipientName)} \u{1F44B}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${strings.teaser}

    ${firstLetter} _ _ _ _

${strings.question}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

\u25B6 ${strings.cta}: ${playUrl}

---

${strings.socialProof} \u{1F30D}

${strings.footerReason}
Unsubscribe: ${unsubscribeUrl}
LexiClash: ${baseUrl}

\u00A9 ${currentYear} LexiClash
`;

  return { subject, html, text };
}
