import { NextRequest, NextResponse } from 'next/server';
import {
  generateAndroidReleaseLaunchHtml,
  PLAY_STORE_URL,
} from '@/lib/androidReleaseLaunchEmail';

const ALLOWED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

/**
 * GET /api/admin/android-release-launch-preview?language=en
 * Returns rendered HTML preview of the Android release announcement email.
 */
export async function GET(request: NextRequest) {
  const languageParam = request.nextUrl.searchParams.get('language') || 'en';
  const language = ALLOWED_LANGUAGES.includes(languageParam) ? languageParam : 'en';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';

  const previewNames: Record<string, string> = {
    he: 'Fish',
    sv: 'Erik',
    ja: 'Yuki',
    es: 'Carlos',
  };

  const { html } = await generateAndroidReleaseLaunchHtml({
    recipientName: previewNames[language] || 'Alex',
    language,
    unsubscribeUrl: `${baseUrl}/${locale}/unsubscribe`,
    playUrl: PLAY_STORE_URL,
  });

  // Inject a preview banner right after the opening <body ...> tag (which
  // carries attributes, so match the whole opening tag rather than a bare "<body>").
  const previewHtml = html.replace(
    /(<body[^>]*>)/,
    `$1
  <div style="background: linear-gradient(90deg, #BFFF00, #00FFFF, #FF1493); color: #000; text-align: center; padding: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
    ANDROID RELEASE PREVIEW — ${language.toUpperCase()}
  </div>`
  );

  return new NextResponse(previewHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
