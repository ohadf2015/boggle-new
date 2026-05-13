import { NextRequest, NextResponse } from 'next/server';
import { generateReengagementEmailHtml } from '@/lib/reengagementEmail';

/**
 * GET /api/admin/reengagement-email-preview?language=en
 * Returns rendered HTML preview of the re-engagement email template
 */
export async function GET(request: NextRequest) {
  const language = request.nextUrl.searchParams.get('language') || 'en';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';

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
    RE-ENGAGEMENT EMAIL PREVIEW — Language: ${language.toUpperCase()}
  </div>`
  );

  return new NextResponse(previewHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
