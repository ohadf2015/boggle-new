import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Dynamic OG Image for Daily Challenge Leaderboard Position
 * Full-bleed dark design with large, visible text
 *
 * Generates a shareable image showing:
 * - Player's rank (with medal emoji for top 3)
 * - Player name and avatar
 * - Score and word count
 * - Puzzle number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const rank = parseInt(searchParams.get('rank') || '0');
    const displayName = searchParams.get('displayName') || 'Player';
    const avatarEmoji = searchParams.get('avatarEmoji') || '🎯';
    const avatarImage = searchParams.get('avatarImage'); // Custom avatar image filename
    const score = parseInt(searchParams.get('score') || '0');
    const wordCount = parseInt(searchParams.get('wordCount') || '0');
    const puzzleNumber = parseInt(searchParams.get('puzzleNumber') || '0');

    // Construct avatar image URL if provided.
    // Use a fixed public origin — request.url resolves to container origin (localhost:$PORT)
    // behind Railway's proxy, and forwarded headers are user-controllable (SSRF risk).
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
    const avatarImageUrl = avatarImage ? `${origin}/avatars/${avatarImage}` : null;

    // Get rank display (medal for top 3, number otherwise)
    const getRankDisplay = (r: number): { emoji: string; text: string } => {
      if (r === 1) return { emoji: '🥇', text: '1st' };
      if (r === 2) return { emoji: '🥈', text: '2nd' };
      if (r === 3) return { emoji: '🥉', text: '3rd' };
      return { emoji: '🏆', text: `#${r}` };
    };

    // Get accent color based on rank
    const getAccentColor = (r: number): string => {
      if (r === 1) return '#fbbf24'; // Gold
      if (r === 2) return '#9ca3af'; // Silver
      if (r === 3) return '#d97706'; // Bronze
      return '#06b6d4'; // Cyan for others
    };

    const rankInfo = getRankDisplay(rank);
    const accent = getAccentColor(rank);

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
            background: `linear-gradient(135deg, #0f0f14 0%, #1a1a2e 50%, #0f0f14 100%)`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '32px',
          }}
        >
          {/* Top: Brand + Puzzle Number */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '32px' }}>🎯</span>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}>
              LEXICLASH DAILY
            </span>
            {puzzleNumber > 0 && (
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#6b7280' }}>
                #{puzzleNumber}
              </span>
            )}
          </div>

          {/* Player info - large and prominent */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '16px',
            }}
          >
            {avatarImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarImageUrl}
                alt="Avatar"
                width={80}
                height={80}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid #fff',
                }}
              />
            ) : (
              <span style={{ fontSize: '72px' }}>{avatarEmoji}</span>
            )}
            <span style={{
              fontSize: '56px',
              fontWeight: 900,
              color: '#fff',
              maxWidth: '600px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {displayName}
            </span>
          </div>

          {/* Main result - HUGE rank display */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)`,
              borderRadius: '24px',
              padding: '16px 80px',
              marginBottom: '16px',
            }}
          >
            {/* Big rank display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '140px' }}>{rankInfo.emoji}</span>
              <span
                style={{
                  fontSize: '140px',
                  fontWeight: 900,
                  color: accent,
                  lineHeight: 0.9,
                  letterSpacing: '-5px',
                }}
              >
                {rankInfo.text}
              </span>
            </div>
          </div>

          {/* Stats row - score and words side by side */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '60px',
              marginBottom: '20px',
            }}
          >
            {/* Score */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '80px',
                  fontWeight: 900,
                  color: '#a78bfa',
                  lineHeight: 1,
                }}
              >
                {score}
              </span>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                Points
              </span>
            </div>

            {/* Divider */}
            <div
              style={{
                width: '4px',
                height: '100px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
              }}
            />

            {/* Word Count */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '80px',
                  fontWeight: 900,
                  color: '#34d399',
                  lineHeight: 1,
                }}
              >
                {wordCount}
              </span>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                Words
              </span>
            </div>
          </div>

          {/* Bottom CTA - full width bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px 48px',
              background: accent,
              borderRadius: '14px',
            }}
          >
            <span style={{ fontSize: '40px' }}>🎮</span>
            <span style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#000',
              letterSpacing: '1px',
            }}>
              Can you beat this score?
            </span>
            <span style={{ fontSize: '40px' }}>🎮</span>
          </div>
        </div>
      ),
      {
        width: 2400,
        height: 1260,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating OG image:', errorMessage);
    return new Response('Failed to generate image', { status: 500 });
  }
}
