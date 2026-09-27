import { NextRequest, NextResponse } from 'next/server';
import { generateReengagementEmailHtml } from '@/lib/reengagementEmail';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';

/**
 * GET /api/admin/reengagement-email-preview?language=en
 * Returns rendered HTML preview of the re-engagement email template
 */
const SUPPORTED_LOCALES = ['he', 'sv', 'ja', 'es', 'en'];
const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  // Clamp to the supported-locale allowlist at the source: this value is reflected
  // into the preview HTML below, so an unclamped query param would be reflected XSS.
  const rawLanguage = request.nextUrl.searchParams.get('language') || 'en';
  const language = SUPPORTED_LOCALES.includes(rawLanguage) ? rawLanguage : 'en';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
  const locale = language;

  const previewNames: Record<string, string> = {
    he: 'Fish', sv: 'Erik', ja: 'Yuki', es: 'Carlos',
  };
  const previewLetters: Record<string, string> = {
    he: 'צ', ja: 'あ', sv: 'S', es: 'P',
  };

  // Override sample personalization data via query string so the preview
  // can demo each chip state independently (e.g. ?days=14&players=1847&hours=6).
  const sp = request.nextUrl.searchParams;
  const num = (key: string) => {
    const raw = sp.get(key);
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const { html } = await generateReengagementEmailHtml({
    recipientName: previewNames[language] || 'Alex',
    firstLetter: previewLetters[language] || 'S',
    language,
    unsubscribeUrl: `${baseUrl}/${locale}/unsubscribe`,
    playUrl: `${baseUrl}/${locale}/daily`,
    baseUrl,
    wordLength: num('wordLength') ?? 5,
    daysSinceLastPlay: num('days') ?? 14,
    playersToday: num('players') ?? 1847,
    hoursUntilReset: num('hours') ?? 6,
  });

  // Wrap with preview banner
  const previewHtml = html.replace(
    '<body>',
    `<body>
  <div style="background: linear-gradient(90deg, #FF1493, #00FFFF); color: #000; text-align: center; padding: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
    RE-ENGAGEMENT EMAIL PREVIEW — Language: ${escapeHtml(language.toUpperCase())}
  </div>`
  );

  return new NextResponse(previewHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
