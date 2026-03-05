/**
 * Re-engagement Email Module
 *
 * Sends localized "first letter hint" emails to inactive daily challenge players.
 * Players who haven't played for 5+ days receive a teaser showing the first letter
 * of today's daily word, with 14-day anti-spam intervals.
 */

import { Resend } from 'resend';
import {
  getSupabaseAdmin,
  withTimeout,
  getTodayDate,
  getLocalHour,
  generateUnsubscribeToken,
  isEmailServiceConfigured,
  EMAIL_COLORS,
} from '@/lib/email';

// ==========================================
// Constants
// ==========================================

const INACTIVITY_DAYS = 5;
const MIN_INTERVAL_DAYS = 14;

/** Country code → supported language mapping */
export const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  IL: 'he',
  SE: 'sv',
  JP: 'ja',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
};

/** Localized strings for re-engagement emails (embedded, not in translation files) */
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
    socialProof: '🌍 הצטרפו לאלפי שחקנים שמשחקים כל יום',
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
    (l) => `The word starts with ${l}... 🤔`,
    (_l, name) => `We saved you a puzzle, ${name}`,
    (l) => `${l}____. Can you crack it?`,
  ],
  he: [
    (l) => `...${l} המילה מתחילה ב 🤔`,
    (_l, name) => `${name} ,שמרנו לך חידה`,
    (l) => `?${l}____. תצליח/י לפצח`,
  ],
  sv: [
    (l) => `Ordet börjar med ${l}... 🤔`,
    (_l, name) => `Vi sparade ett pussel åt dig, ${name}`,
    (l) => `${l}____. Kan du knäcka det?`,
  ],
  ja: [
    (l) => `今日の単語は${l}で始まります... 🤔`,
    (_l, name) => `${name}さん、パズルが待っています`,
    (l) => `${l}____。解けますか？`,
  ],
  es: [
    (l) => `La palabra empieza con ${l}... 🤔`,
    (_l, name) => `Guardamos un puzzle para ti, ${name}`,
    (l) => `${l}____. ¿Puedes descifrarlo?`,
  ],
};

// ==========================================
// Types
// ==========================================

export interface ReengagementRecipient {
  id: string;
  email: string;
  display_name: string | null;
  username: string;
  timezone: string | null;
  country_code: string | null;
  email_unsubscribe_token: string | null;
}

interface EmailTemplateParams {
  recipientName: string;
  firstLetter: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
  baseUrl: string;
}

/** Get the mascot image URL — waving mascot for re-engagement */
function getMascotUrl(baseUrl: string): string {
  return `${baseUrl}/mascot/waving-nobg.gif`;
}

// ==========================================
// Language Resolution
// ==========================================

/**
 * Resolve the best language for a user based on:
 * 1. Most recent game language from daily_puzzle_attempts
 * 2. Country code mapping
 * 3. Default 'en'
 */
export async function resolveUserLanguage(
  userId: string,
  countryCode: string | null
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 'en';

  // Priority 1: Most recent game language
  const { data } = await supabase
    .from('daily_puzzle_attempts')
    .select('language')
    .eq('player_id', userId)
    .order('puzzle_date', { ascending: false })
    .limit(1)
    .single();

  if (data?.language) return data.language;

  // Priority 2: Country code mapping
  if (countryCode && COUNTRY_TO_LANGUAGE[countryCode]) {
    return COUNTRY_TO_LANGUAGE[countryCode];
  }

  // Priority 3: Default
  return 'en';
}

// ==========================================
// First Letter Fetch
// ==========================================

/**
 * Get the first letter of today's daily word for a given language
 */
export async function getFirstLetterForLanguage(
  language: string
): Promise<{ letter: string; word: string } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const today = getTodayDate();

  const { data, error } = await supabase
    .from('daily_target_words')
    .select('target_word, override_word')
    .eq('puzzle_date', today)
    .eq('language', language)
    .single();

  if (error || !data) return null;

  const word = data.override_word || data.target_word;
  if (!word) return null;

  return {
    letter: word.charAt(0).toUpperCase(),
    word,
  };
}

// ==========================================
// Recipient Fetching
// ==========================================

/**
 * Get users eligible for re-engagement emails:
 * - daily_email_subscribed = true
 * - No daily_puzzle_attempts in last 5 days
 * - last_reengagement_email_sent_at is null or > 14 days ago
 * - Local time is 7-9 AM
 */
export async function getReengagementRecipients(): Promise<ReengagementRecipient[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MIN_INTERVAL_DAYS);
  const antiSpamCutoff = cutoffDate.toISOString();

  // Get all subscribed users
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      username,
      timezone,
      country_code,
      email_unsubscribe_token,
      last_reengagement_email_sent_at
    `)
    .eq('daily_email_subscribed', true);

  if (error || !profiles?.length) return [];

  // Get auth emails
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) return [];

  const emailMap = new Map<string, string>();
  authUsers.users.forEach((user: { id: string; email?: string }) => {
    if (user.email) emailMap.set(user.id, user.email);
  });

  // Calculate inactivity cutoff (5 days ago)
  const inactivityDate = new Date();
  inactivityDate.setDate(inactivityDate.getDate() - INACTIVITY_DAYS);
  const inactivityCutoff = inactivityDate.toISOString().split('T')[0];

  const recipients: ReengagementRecipient[] = [];

  for (const profile of profiles) {
    const email = emailMap.get(profile.id);
    if (!email) continue;

    // Anti-spam: skip if sent within 14 days
    if (profile.last_reengagement_email_sent_at) {
      const lastSent = new Date(profile.last_reengagement_email_sent_at);
      if (lastSent.toISOString() > antiSpamCutoff) continue;
    }

    // Timezone check: send at 7-9 AM local
    const userTimezone = profile.timezone || 'UTC';
    const localHour = getLocalHour(userTimezone);
    if (localHour < 7 || localHour > 9) continue;

    // Inactivity check: no attempts in last 5 days
    const { data: recentAttempt } = await supabase
      .from('daily_puzzle_attempts')
      .select('id')
      .eq('player_id', profile.id)
      .gte('puzzle_date', inactivityCutoff)
      .limit(1)
      .single();

    // If they have a recent attempt, they're active — skip
    if (recentAttempt) continue;

    recipients.push({
      id: profile.id,
      email,
      display_name: profile.display_name,
      username: profile.username,
      timezone: profile.timezone,
      country_code: profile.country_code ?? null,
      email_unsubscribe_token: profile.email_unsubscribe_token,
    });
  }

  return recipients;
}

// ==========================================
// Subject Line
// ==========================================

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

// ==========================================
// Email Template
// ==========================================

/**
 * Generate the HTML email for re-engagement
 * Neo-brutalist design with a large first-letter tile as the hero element
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
  const subject = getReengagementSubject(language, firstLetter, recipientName);
  const currentYear = new Date().getFullYear();
  // RTL-aware shadow direction
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
      0%, 100% { box-shadow: 0 0 20px rgba(191,255,0,0.3), 0 0 40px rgba(191,255,0,0.1); }
      50% { box-shadow: 0 0 30px rgba(191,255,0,0.5), 0 0 60px rgba(191,255,0,0.2); }
    }
    .cta-glow { animation: glow-pulse 2s ease-in-out infinite; }
    @media only screen and (max-width: 600px) {
      .container { padding: 16px !important; }
      .main-card { padding: 24px 16px 28px !important; }
      .letter-tile { width: 72px !important; height: 72px !important; font-size: 40px !important; line-height: 64px !important; }
      .mascot-img { width: 90px !important; height: 90px !important; }
      .mascot-glow { width: 110px !important; height: 110px !important; }
      .greeting-text { font-size: 22px !important; }
      .speech-bubble { padding: 12px 16px !important; }
      .mini-tile { width: 36px !important; height: 36px !important; font-size: 18px !important; line-height: 28px !important; }
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
              <a href="${baseUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                <span style="font-family: 'Fredoka', Arial, sans-serif; font-size: 28px; font-weight: 700; color: ${colors.white}; letter-spacing: 1px;">Lexi<span style="color: ${colors.lime};">Clash</span></span>
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(180deg, ${colors.navyCard} 0%, ${colors.navyLight} 100%); border: 4px solid ${colors.black}; border-radius: 20px; box-shadow: ${shadowDir}8px 8px 0px ${colors.black}; overflow: hidden;">

                <!-- Decorative Header Bar -->
                <tr>
                  <td style="background: linear-gradient(90deg, ${colors.pink} 0%, ${colors.purple} 50%, ${colors.cyan} 100%); height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>

                <!-- Card Content -->
                <tr>
                  <td class="main-card" style="padding: 36px 28px 40px;">

                    <!-- Mascot with glow backdrop -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 8px;">
                      <tr>
                        <td align="center">
                          <div class="mascot-glow" style="width: 130px; height: 130px; border-radius: 50%; background: radial-gradient(circle, rgba(0,255,255,0.15) 0%, rgba(139,92,246,0.08) 50%, transparent 70%); display: inline-block; text-align: center; line-height: 0; padding-top: 5px;">
                            <img src="${mascotUrl}" alt="Lexi" width="120" height="120" class="mascot-img" style="display: inline-block; width: 120px; height: 120px;" />
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Speech bubble greeting -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <!-- Bubble arrow -->
                          <div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 10px solid rgba(255,255,255,0.08); margin-bottom: 0;">&nbsp;</div>
                          <!-- Bubble body -->
                          <div class="speech-bubble" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 16px 24px; display: inline-block; max-width: 420px;">
                            <h1 class="greeting-text" style="color: ${colors.white}; font-size: 26px; margin: 0 0 4px 0; font-weight: 700; text-align: center; line-height: 1.3;">
                              ${strings.greeting(recipientName)}
                            </h1>
                            <p style="color: ${colors.grayLight}; font-size: 15px; line-height: 1.5; margin: 0; text-align: center; font-weight: 500;">
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

                    <!-- Letter Tile Hero with depth tiles -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 10px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <!-- Mini mystery tile left -->
                              <td style="vertical-align: middle; padding: 0 6px;">
                                <div class="mini-tile" style="width: 44px; height: 44px; background: linear-gradient(180deg, ${colors.pink} 0%, ${colors.pinkLight} 100%); border: 3px solid ${colors.black}; border-radius: 10px; box-shadow: ${shadowDir}3px 3px 0px ${colors.black}; text-align: center; line-height: 38px; font-size: 22px; font-weight: 700; color: ${colors.white}; font-family: 'Fredoka', Arial, sans-serif; opacity: 0.85;">
                                  ?
                                </div>
                              </td>
                              <!-- The main Letter Tile -->
                              <td>
                                <div class="letter-tile" style="width: 96px; height: 96px; background: linear-gradient(180deg, ${colors.lime} 0%, ${colors.limeMuted} 100%); border: 4px solid ${colors.black}; border-radius: 16px; box-shadow: ${shadowDir}6px 6px 0px ${colors.black}, 0 0 24px rgba(191,255,0,0.2); display: inline-block; text-align: center; line-height: 88px; font-size: 52px; font-weight: 700; color: ${colors.black}; font-family: 'Fredoka', Arial, sans-serif;">
                                  ${firstLetter}
                                </div>
                              </td>
                              <!-- Mini mystery tile right -->
                              <td style="vertical-align: middle; padding: 0 6px;">
                                <div class="mini-tile" style="width: 44px; height: 44px; background: linear-gradient(180deg, ${colors.cyan} 0%, ${colors.cyanMuted} 100%); border: 3px solid ${colors.black}; border-radius: 10px; box-shadow: ${shadowDir}3px 3px 0px ${colors.black}; text-align: center; line-height: 38px; font-size: 22px; font-weight: 700; color: ${colors.black}; font-family: 'Fredoka', Arial, sans-serif; opacity: 0.85;">
                                  ?
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Mystery word blanks -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 6px;" dir="${dir}">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" dir="${dir}">
                            <tr>
                              <td style="padding: 0 3px;"><span style="display: inline-block; width: 28px; height: 4px; background: ${colors.lime}; border-radius: 2px;">&nbsp;</span></td>
                              <td style="padding: 0 3px;"><span style="display: inline-block; width: 28px; height: 4px; background: ${colors.lime}; border-radius: 2px; opacity: 0.7;">&nbsp;</span></td>
                              <td style="padding: 0 3px;"><span style="display: inline-block; width: 28px; height: 4px; background: ${colors.lime}; border-radius: 2px; opacity: 0.5;">&nbsp;</span></td>
                              <td style="padding: 0 3px;"><span style="display: inline-block; width: 28px; height: 4px; background: ${colors.lime}; border-radius: 2px; opacity: 0.3;">&nbsp;</span></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Question -->
                    <p style="color: ${colors.cyan}; font-size: 17px; text-align: center; margin: 0 0 28px 0; font-weight: 600;">
                      ${strings.question}
                    </p>

                    <!-- CTA Button with glow -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${playUrl}" style="height:62px;v-text-anchor:middle;width:320px;" arcsize="14%" stroke="t" strokecolor="${colors.black}" strokeweight="4px" fillcolor="${colors.lime}">
                            <w:anchorlock/>
                            <center style="color:${colors.black};font-family:Arial,sans-serif;font-size:20px;font-weight:bold;">&#9654; ${strings.cta}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <div style="display: inline-block; background: linear-gradient(135deg, ${colors.pink}, ${colors.purple}, ${colors.cyan}, ${colors.lime}); padding: 4px; border-radius: 20px; box-shadow: ${shadowDir}6px 6px 0px ${colors.black}, 0 0 32px rgba(191,255,0,0.3), 0 0 64px rgba(139,92,246,0.15);">
                            <a href="${playUrl}" target="_blank" class="cta-button button-cta cta-glow" style="display: block; background: linear-gradient(180deg, ${colors.lime} 0%, #a3e635 50%, ${colors.limeMuted} 100%); color: ${colors.black}; font-size: 22px; font-weight: 700; text-decoration: none; padding: 20px 60px; border: 3px solid ${colors.black}; border-radius: 16px; letter-spacing: 2px; font-family: 'Fredoka', Arial, sans-serif; transition: transform 0.15s ease, box-shadow 0.15s ease; text-transform: uppercase;">
                              &#9654;&nbsp;&nbsp;${strings.cta}
                            </a>
                          </div>
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
${strings.greeting(recipientName)} 👋

════════════════════════════════
${strings.teaser}

    ${firstLetter} _ _ _ _

${strings.question}
════════════════════════════════

▶ ${strings.cta}: ${playUrl}

---

${strings.socialProof} 🌍

${strings.footerReason}
Unsubscribe: ${unsubscribeUrl}
LexiClash: ${baseUrl}

© ${currentYear} LexiClash
`;

  return { subject, html, text };
}

// ==========================================
// Send Function
// ==========================================

/**
 * Send a re-engagement email to a single recipient
 */
export async function sendReengagementEmail(
  recipient: ReengagementRecipient,
  language: string,
  firstLetter: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailServiceConfigured()) {
    return { success: false, error: 'Email service not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    return { success: false, error: 'RESEND_FROM_EMAIL not configured' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  // Generate unsubscribe token if not exists
  let unsubscribeToken = recipient.email_unsubscribe_token;
  if (!unsubscribeToken) {
    unsubscribeToken = generateUnsubscribeToken();
    await supabase
      .from('profiles')
      .update({ email_unsubscribe_token: unsubscribeToken })
      .eq('id', recipient.id);
  }

  const locale = language === 'he' ? 'he' : language === 'sv' ? 'sv' : language === 'ja' ? 'ja' : language === 'es' ? 'es' : 'en';
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}`;
  const playUrl = `${baseUrl}/${locale}/daily`;
  const recipientName = recipient.display_name || recipient.username || 'Word Hunter';

  const { subject, html, text } = generateReengagementEmailHtml({
    recipientName,
    firstLetter,
    language,
    unsubscribeUrl,
    playUrl,
    baseUrl,
  });

  try {
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: recipient.email,
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      10000,
      'Resend API timed out after 10 seconds'
    );

    if (result.error) {
      console.error(`[Reengagement] Failed to send to ${recipient.email}:`, result.error);
      return { success: false, error: result.error.message };
    }

    // Update last_reengagement_email_sent_at
    await supabase
      .from('profiles')
      .update({ last_reengagement_email_sent_at: new Date().toISOString() })
      .eq('id', recipient.id);

    console.log(`[Reengagement] Sent to ${recipient.email}`);
    return { success: true };
  } catch (err) {
    const error = err as Error;
    console.error(`[Reengagement] Error sending to ${recipient.email}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a test re-engagement email (for admin testing)
 */
export async function sendTestReengagementEmail(
  toEmail: string,
  recipientName: string = 'Test User',
  language: string = 'en',
  firstLetter: string = 'T'
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailServiceConfigured()) {
    return { success: false, error: 'Email service not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    return { success: false, error: 'RESEND_FROM_EMAIL not configured' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
  const locale = language === 'he' ? 'he' : language === 'sv' ? 'sv' : language === 'ja' ? 'ja' : language === 'es' ? 'es' : 'en';

  const { subject, html, text } = generateReengagementEmailHtml({
    recipientName,
    firstLetter,
    language,
    unsubscribeUrl: `${baseUrl}/api/email/unsubscribe?token=${'0'.repeat(64)}`,
    playUrl: `${baseUrl}/${locale}/daily`,
    baseUrl,
  });

  try {
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `[TEST] ${subject}`,
        html,
        text,
      }),
      10000,
      'Resend API timed out after 10 seconds'
    );

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}
