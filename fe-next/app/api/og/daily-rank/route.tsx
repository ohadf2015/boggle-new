import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Dynamic OG Image for Daily Challenge Leaderboard Position
 *
 * Generates a shareable image showing:
 * - Player's rank (with medal emoji for top 3)
 * - Player name and avatar
 * - Score and word count
 * - Puzzle number
 *
 * Query params:
 * - rank: Player's rank (1, 2, 3, etc.)
 * - displayName: Player's display name
 * - avatarEmoji: Player's avatar emoji
 * - score: Player's score
 * - wordCount: Number of words found
 * - puzzleNumber: Daily puzzle number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const rank = parseInt(searchParams.get('rank') || '0');
    const displayName = searchParams.get('displayName') || 'Player';
    const avatarEmoji = searchParams.get('avatarEmoji') || '🎯';
    const score = parseInt(searchParams.get('score') || '0');
    const wordCount = parseInt(searchParams.get('wordCount') || '0');
    const puzzleNumber = parseInt(searchParams.get('puzzleNumber') || '0');

    // Get rank display (medal for top 3, number otherwise)
    const getRankDisplay = (r: number): string => {
      if (r === 1) return '🥇';
      if (r === 2) return '🥈';
      if (r === 3) return '🥉';
      return `#${r}`;
    };

    // Get background gradient based on rank
    const getBgGradient = (r: number): string => {
      if (r === 1) return 'linear-gradient(135deg, #FFE135 0%, #FFA500 100%)'; // Gold
      if (r === 2) return 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%)'; // Silver
      if (r === 3) return 'linear-gradient(135deg, #CD7F32 0%, #E59866 100%)'; // Bronze
      return 'linear-gradient(135deg, #00D9FF 0%, #6366f1 100%)'; // Cyan-Purple
    };

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
            background: getBgGradient(rank),
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#000',
                background: '#fff',
                padding: '12px 24px',
                borderRadius: '12px',
                border: '4px solid #000',
                boxShadow: '4px 4px 0px #000',
              }}
            >
              🎯 LexiClash Daily
            </div>
          </div>

          {/* Puzzle Number */}
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#000',
              marginBottom: '32px',
              opacity: 0.8,
            }}
          >
            Puzzle #{puzzleNumber}
          </div>

          {/* Rank Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '120px',
              marginBottom: '24px',
              textShadow: '4px 4px 0px rgba(0,0,0,0.2)',
            }}
          >
            {getRankDisplay(rank)}
          </div>

          {/* Player Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#fff',
              padding: '32px 48px',
              borderRadius: '24px',
              border: '6px solid #000',
              boxShadow: '8px 8px 0px #000',
              marginBottom: '32px',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                fontSize: '80px',
                marginBottom: '16px',
              }}
            >
              {avatarEmoji}
            </div>

            {/* Display Name */}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#000',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              {displayName}
            </div>

            {/* Stats */}
            <div
              style={{
                display: 'flex',
                gap: '48px',
                alignItems: 'center',
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
                <div
                  style={{
                    fontSize: '64px',
                    fontWeight: 900,
                    color: '#6366f1',
                  }}
                >
                  {score}
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#666',
                    textTransform: 'uppercase',
                  }}
                >
                  Points
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: '4px',
                  height: '80px',
                  background: '#e5e5e5',
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
                <div
                  style={{
                    fontSize: '64px',
                    fontWeight: 900,
                    color: '#10b981',
                  }}
                >
                  {wordCount}
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#666',
                    textTransform: 'uppercase',
                  }}
                >
                  Words
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#000',
              opacity: 0.7,
            }}
          >
            Can you beat this score? 🎮
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
