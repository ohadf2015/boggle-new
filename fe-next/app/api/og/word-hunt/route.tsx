import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Dynamic OG Image for Word Hunt Daily Challenge
 *
 * Generates a compelling, shareable image for Word Hunt results.
 * Uses neo-brutalist design with playful teasing messages.
 *
 * Query params:
 * - solved: 'true' or 'false'
 * - attempts: Number of attempts used (1-10)
 * - streak: Current streak days
 * - puzzleNumber: Daily puzzle number
 * - displayName: Player's display name
 * - avatarEmoji: Player's avatar emoji
 * - emojiGrid: Encoded emoji grid (optional)
 * - locale: Language code (en, he, sv, ja, es)
 */

// Neo-brutalist color palette (matching app style)
const COLORS = {
  yellow: '#FFE135',
  orange: '#FF6B35',
  pink: '#FF1493',
  cyan: '#00D9FF',
  lime: '#BFFF00',
  red: '#FF3366',
  green: '#10B981',
  purple: '#6366F1',
  navy: '#1a1a2e',
  cream: '#FFFEF0',
  black: '#000000',
  white: '#FFFFFF',
};

// Localized playful teasing messages based on performance
const MESSAGES: Record<string, {
  perfect: string;
  great: string;
  good: string;
  close: string;
  barely: string;
  failed: string;
  challenge: string;
}> = {
  en: {
    perfect: 'Word Wizard!',
    great: 'Crushed it!',
    good: 'I survived!',
    close: 'That was close!',
    barely: 'Phew! Made it!',
    failed: 'This one got me...',
    challenge: 'Can you beat this?',
  },
  he: {
    perfect: '!אלוף המילים',
    great: '!מחצתי את זה',
    good: '!שרדתי',
    close: '!זה היה צמוד',
    barely: '!פיו! הצלחתי',
    failed: '...הפעם נכשלתי',
    challenge: '?יכול/ה לעשות יותר טוב',
  },
  sv: {
    perfect: 'Ordmästare!',
    great: 'Krossade det!',
    good: 'Jag överlevde!',
    close: 'Det var nära!',
    barely: 'Puh! Klarade det!',
    failed: 'Den fick mig...',
    challenge: 'Kan du slå mig?',
  },
  ja: {
    perfect: '言葉の達人!',
    great: '完璧!',
    good: '生き残った!',
    close: 'ギリギリ!',
    barely: 'ふぅ!セーフ!',
    failed: 'やられた...',
    challenge: '君も挑戦してみる?',
  },
  es: {
    perfect: '!Mago de palabras',
    great: '!Lo aplasté',
    good: '!Sobreviví',
    close: '!Estuvo cerca',
    barely: '!Uf! Lo logré',
    failed: 'Esta me ganó...',
    challenge: '?Puedes superarme',
  },
};

// Get performance message based on attempts
function getPerformanceMessage(solved: boolean, attempts: number, locale: string): string {
  const msgs = MESSAGES[locale] || MESSAGES.en;

  if (!solved) return msgs.failed;
  if (attempts <= 2) return msgs.perfect;
  if (attempts <= 4) return msgs.great;
  if (attempts <= 6) return msgs.good;
  if (attempts <= 8) return msgs.close;
  return msgs.barely;
}

// Get background gradient based on performance
function getBgGradient(solved: boolean, attempts: number): string {
  if (!solved) return 'linear-gradient(135deg, #374151 0%, #1f2937 100%)'; // Gray for failed
  if (attempts <= 2) return 'linear-gradient(135deg, #FFE135 0%, #FFA500 100%)'; // Gold for perfect
  if (attempts <= 4) return 'linear-gradient(135deg, #10B981 0%, #059669 100%)'; // Green for great
  if (attempts <= 6) return 'linear-gradient(135deg, #00D9FF 0%, #6366f1 100%)'; // Cyan-purple for good
  if (attempts <= 8) return 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'; // Amber for close
  return 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'; // Red for barely
}

// Get accent color based on performance
function getAccentColor(solved: boolean, attempts: number): string {
  if (!solved) return COLORS.red;
  if (attempts <= 2) return COLORS.yellow;
  if (attempts <= 4) return COLORS.green;
  if (attempts <= 6) return COLORS.cyan;
  if (attempts <= 8) return COLORS.orange;
  return COLORS.pink;
}

// Decode emoji grid from URL parameter
function decodeEmojiGrid(encoded: string | null): string[] {
  if (!encoded) return [];
  try {
    return decodeURIComponent(encoded).split('|');
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const solved = searchParams.get('solved') === 'true';
    const attempts = parseInt(searchParams.get('attempts') || '0');
    const streak = parseInt(searchParams.get('streak') || '0');
    const puzzleNumber = parseInt(searchParams.get('puzzleNumber') || '0');
    const displayName = searchParams.get('displayName') || 'Player';
    const avatarEmoji = searchParams.get('avatarEmoji') || '🎯';
    const emojiGrid = decodeEmojiGrid(searchParams.get('emojiGrid'));
    const locale = searchParams.get('locale') || 'en';

    // Check if RTL language
    const isRTL = locale === 'he';

    // Get messages for locale
    const messages = MESSAGES[locale] || MESSAGES.en;
    const performanceMsg = getPerformanceMessage(solved, attempts, locale);
    const bgGradient = getBgGradient(solved, attempts);
    const accentColor = getAccentColor(solved, attempts);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: bgGradient,
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Header with logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '36px',
                fontWeight: 900,
                color: '#000',
                background: '#fff',
                padding: '10px 20px',
                borderRadius: '12px',
                border: '4px solid #000',
                boxShadow: '4px 4px 0px #000',
              }}
            >
              🎯 LexiClash Word Hunt
            </div>
          </div>

          {/* Puzzle Number */}
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#000',
              marginBottom: '20px',
              opacity: 0.8,
            }}
          >
            #{puzzleNumber}
          </div>

          {/* Main Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#fff',
              padding: '32px 48px',
              borderRadius: '24px',
              border: '6px solid #000',
              boxShadow: '10px 10px 0px #000',
              marginBottom: '20px',
              maxWidth: '800px',
            }}
          >
            {/* Performance Title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            >
              <span
                style={{
                  fontSize: '40px',
                  fontWeight: 900,
                  color: accentColor,
                  textShadow: '2px 2px 0px rgba(0,0,0,0.2)',
                }}
              >
                {solved ? '✨' : '😅'} {performanceMsg} {solved ? '✨' : ''}
              </span>
            </div>

            {/* Player info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <span style={{ fontSize: '48px' }}>{avatarEmoji}</span>
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#000',
                }}
              >
                {displayName}
              </span>
            </div>

            {/* Attempts Display */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  fontSize: '96px',
                  fontWeight: 900,
                  color: solved ? COLORS.green : COLORS.red,
                  lineHeight: 1,
                }}
              >
                {solved ? attempts : 'X'}
              </span>
              <span
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: '#666',
                  marginLeft: '8px',
                }}
              >
                /10
              </span>
            </div>

            {/* Emoji Grid (if available) */}
            {emojiGrid.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '16px',
                  padding: '12px 20px',
                  background: '#f5f5f5',
                  borderRadius: '12px',
                  border: '3px solid #e5e5e5',
                }}
              >
                {emojiGrid.slice(0, 6).map((row, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '24px',
                      letterSpacing: '2px',
                      display: 'flex',
                    }}
                  >
                    {row}
                  </div>
                ))}
                {emojiGrid.length > 6 && (
                  <div style={{ fontSize: '14px', color: '#999', marginTop: '4px' }}>
                    +{emojiGrid.length - 6} more
                  </div>
                )}
              </div>
            )}

            {/* Streak badge (if > 1) */}
            {streak > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF1493 100%)',
                  padding: '10px 24px',
                  borderRadius: '50px',
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #000',
                  marginBottom: '16px',
                }}
              >
                <span style={{ fontSize: '28px' }}>🔥</span>
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#fff',
                  }}
                >
                  {streak} {locale === 'he' ? 'ימים ברצף' : locale === 'sv' ? 'dagars streak' : locale === 'ja' ? '日連続' : locale === 'es' ? 'días seguidos' : 'Day Streak'}
                </span>
                <span style={{ fontSize: '28px' }}>🔥</span>
              </div>
            )}
          </div>

          {/* Challenge CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: COLORS.yellow,
              padding: '14px 32px',
              borderRadius: '12px',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000',
              direction: isRTL ? 'rtl' : 'ltr',
            }}
          >
            <span
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: '#000',
              }}
            >
              {messages.challenge} 👀
            </span>
          </div>

          {/* URL watermark */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              bottom: '20px',
              right: '30px',
            }}
          >
            <span
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'rgba(0,0,0,0.5)',
              }}
            >
              lexiclash.live
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating Word Hunt OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
