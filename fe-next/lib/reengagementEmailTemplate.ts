/**
 * Re-engagement Email Template
 *
 * Wraps the React Email component (emails/reengagement.tsx) and renders
 * it to HTML + plain text. Exports the same interface as before so
 * callers (reengagementEmail.ts, send-reengagement route) are unchanged.
 */

import { render } from '@react-email/components';
import ReengagementEmailV2, {
  getReengagementSubjectV2 as getReengagementSubject,
  SUBJECT_LINES,
} from '@/emails/reengagement-v2';
import { getWelcomeEmailModes } from '@/lib/email/welcomeModes';

// Cube images + the hero are served from the production origin (same base the
// component's HERO_SRC uses), independent of the deprecated `baseUrl` param.
const EMAIL_ASSET_BASE = 'https://www.lexiclash.live';

export { getReengagementSubject, SUBJECT_LINES };

interface EmailTemplateParams {
  recipientName: string;
  firstLetter: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
  /** @deprecated No longer used — image base is derived from NODE_ENV */
  baseUrl?: string;
  /** Total letters in today's target word — drives tile-row width. */
  wordLength?: number;
  /** Days since user last played any daily puzzle. ≥7 to render. */
  daysSinceLastPlay?: number;
  /** Players who already solved today's word in this language. ≥50 to render. */
  playersToday?: number;
  /** Hours until daily reset in user's tz. <12 to render. */
  hoursUntilReset?: number;
}

/**
 * Generate the HTML + plain-text email for re-engagement
 */
export async function generateReengagementEmailHtml(params: EmailTemplateParams): Promise<{
  subject: string;
  html: string;
}> {
  const {
    recipientName,
    firstLetter,
    language,
    unsubscribeUrl,
    playUrl,
    wordLength,
    daysSinceLastPlay,
    playersToday,
    hoursUntilReset,
  } = params;

  const subject = getReengagementSubject(language, firstLetter, recipientName);

  const props = {
    recipientName,
    firstLetter,
    language,
    unsubscribeUrl,
    playUrl,
    wordLength,
    daysSinceLastPlay,
    playersToday,
    hoursUntilReset,
    // Secondary "more ways to play" grid — every public mode with its cube art.
    modes: getWelcomeEmailModes(language, EMAIL_ASSET_BASE),
  };

  const html = await render(ReengagementEmailV2(props));

  return { subject, html };
}
