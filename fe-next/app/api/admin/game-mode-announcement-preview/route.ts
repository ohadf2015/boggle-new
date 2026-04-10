import { NextRequest, NextResponse } from 'next/server';
import {
  generateGameModeAnnouncementHtml,
  type GameModeKey,
} from '@/lib/gameModeAnnouncementEmail';

const ALLOWED_MODES: GameModeKey[] = ['blast', 'wordhunt', 'adventure'];
const ALLOWED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

/**
 * GET /api/admin/game-mode-announcement-preview?language=en&mode=blast
 * Returns rendered HTML preview of the game-mode announcement email.
 */
export async function GET(request: NextRequest) {
  const languageParam = request.nextUrl.searchParams.get('language') || 'en';
  const modeParam = request.nextUrl.searchParams.get('mode') || 'blast';

  const language = ALLOWED_LANGUAGES.includes(languageParam) ? languageParam : 'en';
  const mode: GameModeKey = ALLOWED_MODES.includes(modeParam as GameModeKey)
    ? (modeParam as GameModeKey)
    : 'blast';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';

  const previewNames: Record<string, string> = {
    he: 'Fish',
    sv: 'Erik',
    ja: 'Yuki',
    es: 'Carlos',
  };

  const playPaths: Record<GameModeKey, string> = {
    blast: `/${locale}/blast`,
    wordhunt: `/${locale}/wordhunt`,
    adventure: `/${locale}/adventure`,
  };

  const { html } = await generateGameModeAnnouncementHtml({
    recipientName: previewNames[language] || 'Alex',
    language,
    mode,
    unsubscribeUrl: `${baseUrl}/${locale}/unsubscribe`,
    playUrl: `${baseUrl}${playPaths[mode]}`,
  });

  const previewHtml = html.replace(
    '<body>',
    `<body>
  <div style="background: linear-gradient(90deg, #BFFF00, #00FFFF, #FF1493); color: #000; text-align: center; padding: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
    GAME MODE ANNOUNCEMENT PREVIEW — ${mode.toUpperCase()} — ${language.toUpperCase()}
  </div>`
  );

  return new NextResponse(previewHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
