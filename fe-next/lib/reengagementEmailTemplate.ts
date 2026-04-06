/**
 * Re-engagement Email Template
 *
 * Wraps the React Email component (emails/reengagement.tsx) and renders
 * it to HTML + plain text. Exports the same interface as before so
 * callers (reengagementEmail.ts, send-reengagement route) are unchanged.
 */

import { render } from '@react-email/components';
import ReengagementEmail, {
  getReengagementSubject,
  SUBJECT_LINES,
} from '@/emails/reengagement';

export { getReengagementSubject, SUBJECT_LINES };

interface EmailTemplateParams {
  recipientName: string;
  firstLetter: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
  /** @deprecated No longer used — image base is derived from NODE_ENV */
  baseUrl?: string;
}

/**
 * Generate the HTML + plain-text email for re-engagement
 */
export async function generateReengagementEmailHtml(params: EmailTemplateParams): Promise<{
  subject: string;
  html: string;
  text: string;
}> {
  const { recipientName, firstLetter, language, unsubscribeUrl, playUrl } = params;

  const subject = getReengagementSubject(language, firstLetter, recipientName);

  const props = { recipientName, firstLetter, language, unsubscribeUrl, playUrl };

  const [html, text] = await Promise.all([
    render(ReengagementEmail(props)),
    render(ReengagementEmail(props), { plainText: true }),
  ]);

  return { subject, html, text };
}
