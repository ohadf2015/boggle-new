import {
  getReengagementSubject,
  playerReengagement,
  SUBJECT_LINES,
} from '@/lib/email/templates/playerReengagement';
import { getWelcomeEmailModes } from '@/lib/email/welcomeModes';

const EMAIL_ASSET_BASE = 'https://www.lexiclash.live';

export { getReengagementSubject, SUBJECT_LINES };

interface EmailTemplateParams {
  recipientName: string;
  firstLetter: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
  /** @deprecated Links and art always use the production origin. */
  baseUrl?: string;
  /** Total letters in today's target word: drives tile-row width. */
  wordLength?: number;
  /** Days since user last played any daily puzzle. ≥7 to render. */
  daysSinceLastPlay?: number;
  /** Players who already solved today's word in this language. ≥50 to render. */
  playersToday?: number;
  /** Hours until daily reset in user's tz. <12 to render. */
  hoursUntilReset?: number;
}

export async function generateReengagementEmailHtml(params: EmailTemplateParams): Promise<{
  subject: string;
  html: string;
}> {
  return playerReengagement({ ...params, modes: getWelcomeEmailModes(params.language, EMAIL_ASSET_BASE) });
}
