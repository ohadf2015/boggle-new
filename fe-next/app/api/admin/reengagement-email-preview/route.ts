import { NextRequest, NextResponse } from 'next/server';
import { generateReengagementEmailHtml } from '@/lib/reengagementEmail';

/**
 * GET /api/admin/reengagement-email-preview?language=en
 * Returns rendered HTML preview of the re-engagement email template
 */
export async function GET(request: NextRequest) {
  const language = request.nextUrl.searchParams.get('language') || 'en';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.com';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';

  const { html } = generateReengagementEmailHtml({
    recipientName: 'Preview User',
    firstLetter: language === 'he' ? 'ש' : language === 'ja' ? 'あ' : 'W',
    language,
    unsubscribeUrl: '#preview-unsubscribe',
    playUrl: `${baseUrl}/${locale}/daily`,
    baseUrl,
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
