/**
 * Re-engagement Email HTML Template
 * Neo-brutalist design with RTL support and localized content
 *
 * Design principles:
 * - Single visual hero: word tiles are the star, placed prominently
 * - Loss-aversion CTA: "Reveal the Word" > "Play Now"
 * - 3-zone layout: emotional hook → curiosity gap → CTA
 * - Mobile-first: 44px+ tap targets, 16px+ body text
 * - Minimal clutter: one card, one CTA, one message
 *
 * Gmail Dark Mode hardening:
 * - Every gradient has a solid background-color fallback
 * - No rgba() — all solid hex
 * - No opacity on text elements
 * - Word tiles use <td> not <div> (Gmail strips divs)
 * - Footer text has sufficient contrast to survive inversion
 * - [data-ogsc] overrides for Gmail's color-shifting
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
  urgency: string;
  streakLost: string;
  unsubscribe: string;
  privacy: string;
  missedDays: string;
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
    missedDays: 'days without playing',
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
    missedDays: 'ימים בלי לשחק',
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
    missedDays: 'dagar utan att spela',
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
    missedDays: '日間プレイなし',
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
    missedDays: 'días sin jugar',
    comeBack: 'Tus amigos siguen subiendo en la tabla',
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
 *
 * Layout (3-zone):
 *   Zone 1 — Emotional hook: mascot + greeting + streak warning
 *   Zone 2 — Curiosity gap: word tiles (the hero element)
 *   Zone 3 — CTA: single prominent button + urgency
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
  const playArrow = isRTL ? '&#9664;' : '&#9654;';

  // Gmail dark mode-safe colors (no rgba, all solid hex)
  const bgOuter = '#0d0d1f';
  const bgCard = '#1a1a35';
  const bgTileEmpty = '#252548';
  const borderCard = '#2e2e55';
  const borderTileEmpty = '#3a3a65';
  const textMuted = '#8888aa';
  const textSubtle = '#6a6a90';
  const textFooter = '#707090';
  const urgencyBg = '#2a1028';
  const urgencyBorder = '#5a2048';

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
      background-color: ${bgOuter};
      font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    /* Gmail dark mode: prevent color inversion on key elements */
    u + .body { background-color: ${bgOuter} !important; }
    [data-ogsc] h1,
    [data-ogsc] .greeting-text { color: ${colors.white} !important; }
    [data-ogsc] .cta-link { background-color: ${colors.lime} !important; color: ${colors.black} !important; }
    [data-ogsc] .streak-text { color: ${colors.pinkLight} !important; }
    [data-ogsc] .question-text { color: ${colors.cyan} !important; }
    [data-ogsc] .tile-letter { background-color: ${colors.lime} !important; color: ${colors.black} !important; }
    [data-ogsc] .tile-empty { background-color: ${bgTileEmpty} !important; color: #55558a !important; }
    a.cta-link:hover {
      transform: translate(2px, 2px) !important;
      box-shadow: ${shadowDir}3px 3px 0px ${colors.black} !important;
    }
    @media only screen and (max-width: 600px) {
      .container { padding: 12px !important; }
      .main-card { padding: 24px 16px 28px !important; }
      .word-tile { width: 48px !important; height: 48px !important; font-size: 20px !important; }
      .word-tile-first { width: 52px !important; height: 52px !important; font-size: 24px !important; }
      .mascot-img { width: 64px !important; height: 64px !important; }
      .greeting-text { font-size: 22px !important; }
      .teaser-text { font-size: 14px !important; }
      .cta-link { padding: 16px 36px !important; font-size: 17px !important; }
      .urgency-badge { font-size: 12px !important; padding: 6px 14px !important; }
      .social-proof { font-size: 11px !important; }
    }
  </style>
</head>
<body class="body" style="margin: 0; padding: 0; background-color: ${bgOuter};">
  <!-- Preheader — acts as a second subject line -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${bgOuter};">
    ${strings.teaser} ${firstLetter} — ${strings.question} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Outer wrapper — solid bg, no gradient -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" dir="${dir}" style="background-color: ${bgOuter};">
    <tr>
      <td align="center" class="container" style="padding: 28px 20px; background-color: ${bgOuter};">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" dir="${dir}" style="max-width: 440px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${playUrl}" target="_blank" style="text-decoration: none;">
                <img src="${logoUrl}" alt="LexiClash" width="100" style="display: block; max-width: 100px; height: auto;" />
              </a>
            </td>
          </tr>

          <!-- Main Card — solid bg-color fallback before gradient -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" dir="${dir}" style="background-color: ${bgCard}; border: 2px solid ${borderCard}; border-radius: 20px; box-shadow: ${shadowDir}6px 6px 0px ${colors.black}; overflow: hidden;">

                <!-- Top accent bar — solid fallback -->
                <tr>
                  <td style="background-color: ${colors.lime}; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>

                <tr>
                  <td class="main-card" style="padding: 32px 28px 36px; background-color: ${bgCard};">

                    <!-- ═══ ZONE 1: Emotional Hook ═══ -->

                    <!-- Mascot -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding-bottom: 12px;">
                          <img src="${mascotUrl}" alt="Lexi" width="72" height="72" class="mascot-img" style="display: block; width: 72px; height: 72px;" />
                        </td>
                      </tr>
                    </table>

                    <!-- Greeting -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" dir="${dir}" style="padding-bottom: 6px;">
                          <h1 class="greeting-text" style="color: ${colors.white}; font-size: 26px; margin: 0; font-weight: 700; text-align: center; line-height: 1.3; direction: ${dir};">
                            ${strings.greeting(recipientName)}
                          </h1>
                        </td>
                      </tr>
                    </table>

                    <!-- Streak fading -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" dir="${dir}" style="padding-bottom: 28px;">
                          <p class="streak-text" style="color: ${colors.pinkLight}; font-size: 14px; margin: 0; font-weight: 500; text-align: center; direction: ${dir};">
                            &#x1F525; ${strings.streakLost}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- ═══ ZONE 2: Curiosity Gap (Hero) ═══ -->

                    <!-- Teaser -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" dir="${dir}" style="padding-bottom: 16px;">
                          <p class="teaser-text" style="color: ${textMuted}; font-size: 15px; line-height: 1.5; margin: 0; text-align: center; font-weight: 500; direction: ${dir}; letter-spacing: 0.3px;">
                            ${strings.teaser}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Word Tiles — using <td> elements, not <div> (Gmail-safe) -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="8" dir="${dir}" style="border-collapse: separate;">
                            <tr>
                              ${Array.from({ length: WORD_TILE_COUNT }, (_, i) => {
                                const isFirst = isRTL ? i === WORD_TILE_COUNT - 1 : i === 0;
                                if (isFirst) {
                                  return `<td class="word-tile word-tile-first tile-letter" width="56" height="56" align="center" valign="middle" style="width: 56px; height: 56px; background-color: ${colors.lime}; border: 3px solid ${colors.black}; border-radius: 12px; box-shadow: ${shadowDir}3px 3px 0px ${colors.black}; font-size: 28px; font-weight: 700; color: ${colors.black}; font-family: 'Fredoka', Arial, sans-serif; text-align: center;">
                                      ${firstLetter}
                                  </td>`;
                                }
                                return `<td class="word-tile tile-empty" width="56" height="56" align="center" valign="middle" style="width: 56px; height: 56px; background-color: ${bgTileEmpty}; border: 2px solid ${borderTileEmpty}; border-radius: 12px; box-shadow: ${shadowDir}2px 2px 0px #0a0a18; font-size: 22px; font-weight: 600; color: #55558a; font-family: 'Fredoka', Arial, sans-serif; text-align: center;">
                                    ?
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
                          <p class="question-text" style="color: ${colors.cyan}; font-size: 16px; text-align: center; margin: 0; font-weight: 600; direction: ${dir};">
                            ${strings.question}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- ═══ ZONE 3: CTA ═══ -->

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
                          <a href="${playUrl}" target="_blank" class="cta-link" dir="${dir}" style="display: inline-block; background-color: ${colors.lime}; color: ${colors.black}; font-size: 20px; font-weight: 700; text-decoration: none; padding: 18px 52px; border: 3px solid ${colors.black}; border-radius: 14px; box-shadow: ${shadowDir}5px 5px 0px ${colors.black}; font-family: 'Fredoka', Arial, sans-serif; direction: ${dir}; letter-spacing: 0.5px; min-width: 220px; text-align: center;">
                            ${playArrow}&nbsp;&nbsp;${strings.cta}
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Urgency badge — solid colors, no rgba -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" dir="${dir}" style="padding-bottom: 12px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td class="urgency-badge" style="background-color: ${urgencyBg}; border: 1px solid ${urgencyBorder}; border-radius: 20px; padding: 8px 18px; font-size: 13px; color: ${colors.pinkLight}; font-weight: 600; text-align: center; direction: ${dir};">
                                &#x23F0; ${strings.urgency}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Social proof -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" dir="${dir}">
                          <p class="social-proof" style="color: ${textSubtle}; font-size: 13px; margin: 0; font-weight: 400; text-align: center; direction: ${dir}; font-style: italic;">
                            ${strings.comeBack}
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer — bumped contrast for dark mode survival -->
          <tr>
            <td align="center" dir="${dir}" style="padding: 24px 0 8px;">
              <p style="color: ${textFooter}; font-size: 11px; margin: 0 0 8px 0; line-height: 1.6; direction: ${dir};">
                ${strings.footerReason}
              </p>
              <p style="color: ${textFooter}; font-size: 11px; margin: 0; line-height: 1.6;">
                <a href="${unsubscribeUrl}" target="_blank" style="color: ${textMuted}; text-decoration: underline;">${strings.unsubscribe}</a>
                <span style="color: #404060;">&nbsp;&middot;&nbsp;</span>
                <a href="${playUrl}" target="_blank" style="color: ${textMuted}; text-decoration: underline;">LexiClash</a>
                <span style="color: #404060;">&nbsp;&middot;&nbsp;</span>
                <a href="${privacyUrl}" target="_blank" style="color: ${textMuted}; text-decoration: underline;">${strings.privacy}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 4px 0 0;">
              <span style="color: #505070; font-size: 10px;">&copy; ${currentYear} LexiClash</span>
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

${strings.comeBack}

---

${strings.footerReason}
${strings.unsubscribe}: ${unsubscribeUrl}
LexiClash: ${baseUrl}

\u00A9 ${currentYear} LexiClash
`;

  return { subject, html, text };
}
