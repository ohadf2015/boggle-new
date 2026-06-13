import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import WelcomeEmail, { getWelcomeSubject } from '@/emails/welcome';
import { getWelcomeEmailModes } from '@/lib/email/welcomeModes';

/**
 * GET /api/admin/welcome-email-preview?language=en
 * Returns rendered HTML preview of the welcome (onboarding) email template.
 */
const SUPPORTED_LOCALES = ['he', 'sv', 'ja', 'es', 'en'];
const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function GET(request: NextRequest) {
  // Clamp to the supported-locale allowlist at the source: this value is reflected
  // into the preview HTML below, so an unclamped query param would be reflected XSS.
  const rawLanguage = request.nextUrl.searchParams.get('language') || 'en';
  const language = SUPPORTED_LOCALES.includes(rawLanguage) ? rawLanguage : 'en';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lexiclash.live';
  const locale = language;

  const previewNames: Record<string, string> = {
    he: 'מאיה', sv: 'Erik', ja: 'Yuki', es: 'Carlos',
  };
  const recipientName = previewNames[language] || 'Alex';

  const html = await render(
    WelcomeEmail({
      recipientName,
      language,
      unsubscribeUrl: `${baseUrl}/${locale}/unsubscribe`,
      playUrl: `${baseUrl}/${locale}`,
      videoUrl: `${baseUrl}/${locale}`,
      baseUrl,
      modes: getWelcomeEmailModes(language, baseUrl),
    }),
  );

  // Surface the subject + a preview banner for the admin.
  const subject = getWelcomeSubject(language, recipientName);
  const previewHtml = html.replace(
    '<body>',
    `<body>
  <div style="background: #A8E600; color: #000; text-align: center; padding: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
    WELCOME EMAIL PREVIEW — ${language.toUpperCase()} — Subject: ${escapeHtml(subject)}
  </div>`,
  );

  return new NextResponse(previewHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
