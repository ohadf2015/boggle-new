import { NextRequest, NextResponse } from 'next/server';
import {
  generateAndroidBetaLaunchHtml,
  PLAY_STORE_URL,
} from '@/lib/androidBetaLaunchEmail';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';

const ALLOWED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

/**
 * GET /api/admin/android-beta-launch-preview?language=en
 * Returns rendered HTML preview of the Android beta launch email.
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const languageParam = request.nextUrl.searchParams.get('language') || 'en';
  const language = ALLOWED_LANGUAGES.includes(languageParam)
    ? languageParam
    : 'en';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';

  const previewNames: Record<string, string> = {
    he: 'Fish',
    sv: 'Erik',
    ja: 'Yuki',
    es: 'Carlos',
  };

  const { html } = await generateAndroidBetaLaunchHtml({
    recipientName: previewNames[language] || 'Alex',
    language,
    unsubscribeUrl: `${baseUrl}/${locale}/unsubscribe`,
    playUrl: PLAY_STORE_URL,
  });

  const previewHtml = html.replace(
    '<body>',
    `<body>
  <div style="background: linear-gradient(90deg, #A8E600, #5CE0D6, #FF1493); color: #000; text-align: center; padding: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
    ANDROID BETA LAUNCH PREVIEW — ${language.toUpperCase()}
  </div>`
  );

  return new NextResponse(previewHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
