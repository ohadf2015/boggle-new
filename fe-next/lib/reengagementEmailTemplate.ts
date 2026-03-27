/**
 * Re-engagement Email HTML Template
 * Neo-brutalist design with RTL support and localized content
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
  urgency: string;
  streakLost: string;
  unsubscribe: string;
  privacy: string;
}> = {
  en: {
    greeting: (name) => `We miss you, ${name}!`,
    teaser: "Today's word starts with...",
    question: 'Can you figure it out?',
    cta: 'Play Now',
    footerReason: 'You subscribed to daily challenges.',
    socialProof: '2,847 players already solved it today',
    urgency: 'Expires at midnight',
    streakLost: 'Your streak is fading...',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    greeting: (name) => `!${name} ,התגעגענו אליך`,
    teaser: '...המילה של היום מתחילה ב',
    question: '?תצליח/י לגלות',
    cta: 'שחקו עכשיו',
    footerReason: '.נרשמת לאתגר היומי',
    socialProof: '2,847 שחקנים כבר פתרו את זה היום',
    urgency: 'נגמר בחצות',
    streakLost: '...הרצף שלך נעלם',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
  },
  sv: {
    greeting: (name) => `Vi saknar dig, ${name}!`,
    teaser: 'Dagens ord börjar med...',
    question: 'Kan du lista ut det?',
    cta: 'Spela nu',
    footerReason: 'Du prenumererar på dagliga utmaningar.',
    socialProof: '2 847 spelare har redan klarat det idag',
    urgency: 'Slutar vid midnatt',
    streakLost: 'Din streak bleknar...',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
  },
  ja: {
    greeting: (name) => `${name}さん、お待ちしています！`,
    teaser: '今日の単語の最初の文字は...',
    question: 'わかりますか？',
    cta: '今すぐプレイ',
    footerReason: 'デイリーチャレンジに登録しています。',
    socialProof: '今日すでに2,847人がクリア',
    urgency: '深夜0時に終了',
    streakLost: '連続記録が消えかけています...',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  es: {
    greeting: (name) => `¡Te extrañamos, ${name}!`,
    teaser: 'La palabra de hoy empieza con...',
    question: '¿Puedes adivinarla?',
    cta: 'Jugar ahora',
    footerReason: 'Te suscribiste al desafío diario.',
    socialProof: '2.847 jugadores ya lo resolvieron hoy',
    urgency: 'Expira a medianoche',
    streakLost: 'Tu racha se desvanece...',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
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
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';
  const privacyUrl = `${baseUrl}/${locale}/privacy`;
  // Flip gradient direction for RTL so colors flow naturally
  const gradDeg = isRTL ? '270deg' : '90deg';
  // Flip play arrow for RTL
  const playArrow = isRTL ? '&#9664;' : '&#9654;';
  // Mystery tile opacities — fade from bright to dim for intrigue
  const mysteryOpacities = ['0.85', '0.65', '0.45', '0.3'];

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
      background-color: #0a0a1a;
      font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    a.cta-link:hover { transform: translate(2px, 2px) !important; box-shadow: ${shadowDir}3px 3px 0px ${colors.black} !important; }
    @media only screen and (max-width: 600px) {
      .container { padding: 12px !important; }
      .main-card { padding: 28px 16px 32px !important; }
      .word-tile { width: 50px !important; height: 50px !important; font-size: 24px !important; line-height: 44px !important; }
      .mascot-img { width: 72px !important; height: 72px !important; }
      .greeting-text { font-size: 22px !important; }
      .teaser-text { font-size: 13px !important; }
      .cta-link { padding: 16px 36px !important; font-size: 18px !important; }
      .streak-badge { font-size: 11px !important; padding: 6px 14px !important; }
      .urgency-text { font-size: 11px !important; }
    }
  </style>
</head>
<body>
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #0a0a1a;">
    ${strings.teaser} ${firstLetter} — ${strings.question} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" dir="${dir}" style="background-color: #0a0a1a;">
    <tr>
      <td align="center" class="container" style="padding: 32px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" dir="${dir}" style="max-width: 520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${playUrl}" target="_blank" style="text-decoration: none;">
                <img src="${logoUrl}" alt="LexiClash" width="120" style="display: block; max-width: 120px; height: auto;" />
              </a>
            </td>
          </tr>

          <!-- Streak Lost Badge -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="streak-badge" style="background: rgba(255, 20, 147, 0.15); border: 2px solid rgba(255, 20, 147, 0.4); border-radius: 24px; padding: 8px 20px; font-size: 13px; color: ${colors.pink}; font-weight: 600; letter-spacing: 0.5px;">
                    &#x1F525; ${strings.streakLost}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" dir="${dir}" style="background: linear-gradient(180deg, #151530 0%, #1a1a3a 50%, #1e1e42 100%); border: 3px solid #2a2a50; border-radius: 20px; box-shadow: ${shadowDir}6px 6px 0px ${colors.black}; overflow: hidden;">

                <!-- Top gradient bar (flips for RTL) -->
                <tr>
                  <td style="background: linear-gradient(${gradDeg}, ${colors.lime} 0%, ${colors.cyan} 50%, ${colors.pink} 100%); height: 5px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>

                <tr>
                  <td class="main-card" style="padding: 36px 32px 40px;">

                    <!-- Mascot -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding-bottom: 16px;">
                          <img src="${mascotUrl}" alt="Lexi" width="88" height="88" class="mascot-img" style="display: block; width: 88px; height: 88px;" />
                        </td>
                      </tr>
                    </table>

                    <!-- Greeting -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" dir="${dir}" style="padding-bottom: 4px;">
                          <h1 class="greeting-text" style="color: ${colors.white}; font-size: 26px; margin: 0; font-weight: 700; text-align: center; line-height: 1.3; direction: ${dir};">
                            ${strings.greeting(recipientName)}
                          </h1>
                        </td>
                      </tr>
                    </table>

                    <!-- Teaser -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" dir="${dir}" style="padding-bottom: 28px;">
                          <p class="teaser-text" style="color: #8888aa; font-size: 15px; line-height: 1.5; margin: 0; text-align: center; font-weight: 500; direction: ${dir};">
                            ${strings.teaser}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Tile Row -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding-bottom: 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" dir="${dir}">
                            <tr>
                              ${Array.from({ length: WORD_TILE_COUNT }, (_, i) => {
                                const isFirst = isRTL ? i === WORD_TILE_COUNT - 1 : i === 0;
                                if (isFirst) {
                                  return `<td style="padding: 0 5px;">
                                    <div class="word-tile" style="width: 58px; height: 58px; background: linear-gradient(180deg, ${colors.lime} 0%, ${colors.limeMuted} 100%); border: 3px solid ${colors.black}; border-radius: 12px; box-shadow: ${shadowDir}4px 4px 0px ${colors.black}, 0 0 20px rgba(191, 255, 0, 0.3); text-align: center; line-height: 52px; font-size: 30px; font-weight: 700; color: ${colors.black}; font-family: 'Fredoka', Arial, sans-serif;">
                                      ${firstLetter}
                                    </div>
                                  </td>`;
                                }
                                const idx = isRTL ? WORD_TILE_COUNT - 1 - i : i;
                                const opacity = mysteryOpacities[idx - 1] || '0.25';
                                return `<td style="padding: 0 5px;">
                                  <div class="word-tile" style="width: 58px; height: 58px; background: linear-gradient(180deg, #1e1e40 0%, #252550 100%); border: 2px solid rgba(100, 100, 170, ${opacity}); border-radius: 12px; text-align: center; line-height: 52px; font-size: 24px; font-weight: 600; color: rgba(140, 140, 200, ${opacity}); font-family: 'Fredoka', Arial, sans-serif;">
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
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" dir="${dir}" style="padding-bottom: 28px;">
                          <p style="color: ${colors.cyan}; font-size: 15px; text-align: center; margin: 0; font-weight: 600; direction: ${dir};">
                            ${strings.question}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding-bottom: 20px;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${playUrl}" style="height:56px;v-text-anchor:middle;width:280px;" arcsize="18%" stroke="t" strokecolor="${colors.black}" strokeweight="3px" fillcolor="#BFFF00">
                            <w:anchorlock/>
                            <center style="color:#000;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;">${playArrow} ${strings.cta}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${playUrl}" target="_blank" class="cta-link" dir="${dir}" style="display: inline-block; background: linear-gradient(180deg, ${colors.lime} 0%, ${colors.limeMuted} 100%); color: ${colors.black}; font-size: 20px; font-weight: 700; text-decoration: none; padding: 16px 56px; border: 3px solid ${colors.black}; border-radius: 14px; box-shadow: ${shadowDir}5px 5px 0px ${colors.black}; font-family: 'Fredoka', Arial, sans-serif; direction: ${dir}; letter-spacing: 0.5px;">
                            ${playArrow}&nbsp;&nbsp;${strings.cta}
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Urgency -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" dir="${dir}">
                          <p class="urgency-text" style="color: #666688; font-size: 12px; text-align: center; margin: 0; font-weight: 500; direction: ${dir};">
                            &#x23F0; ${strings.urgency}
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Bottom gradient bar (flips for RTL) -->
                <tr>
                  <td style="background: linear-gradient(${gradDeg}, ${colors.pink} 0%, ${colors.cyan} 50%, ${colors.lime} 100%); height: 5px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Social Proof -->
          <tr>
            <td align="center" dir="${dir}" style="padding: 24px 0 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: rgba(0, 255, 255, 0.08); border: 1px solid rgba(0, 255, 255, 0.15); border-radius: 20px; padding: 10px 24px;">
                    <span style="color: #8888aa; font-size: 13px; font-weight: 500; direction: ${dir};">&#x2705; ${strings.socialProof}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="border-top: 1px solid #1a1a35;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" dir="${dir}" style="padding: 16px 0 8px;">
              <p style="color: #404060; font-size: 12px; margin: 0 0 10px 0; line-height: 1.6; direction: ${dir};">
                ${strings.footerReason}
              </p>
              <p style="color: #404060; font-size: 12px; margin: 0; line-height: 1.6;">
                <a href="${unsubscribeUrl}" target="_blank" style="color: #606080; text-decoration: underline;">${strings.unsubscribe}</a>
                <span style="color: #2a2a45;">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                <a href="${playUrl}" target="_blank" style="color: #606080; text-decoration: underline;">LexiClash</a>
                <span style="color: #2a2a45;">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                <a href="${privacyUrl}" target="_blank" style="color: #606080; text-decoration: underline;">${strings.privacy}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 12px 0 0;">
              <span style="color: #2a2a45; font-size: 11px;">&copy; ${currentYear} LexiClash</span>
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
\u{1F525} ${strings.streakLost}

${strings.greeting(recipientName)} \u{1F44B}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${strings.teaser}

    ${firstLetter} _ _ _ _

${strings.question}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

\u25B6 ${strings.cta}: ${playUrl}

\u23F0 ${strings.urgency}

---

\u2705 ${strings.socialProof}

${strings.footerReason}
${strings.unsubscribe}: ${unsubscribeUrl}
LexiClash: ${baseUrl}

\u00A9 ${currentYear} LexiClash
`;

  return { subject, html, text };
}
