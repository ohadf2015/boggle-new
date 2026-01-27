import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Daily Buzz OG Image Generator
 * Generates Open Graph images for Daily Buzz challenge results
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse parameters
    const topic = searchParams.get('topic') || 'Daily Buzz';
    const score = searchParams.get('score') || '0';
    const language = searchParams.get('language') || 'en';
    const displayName = searchParams.get('displayName') || 'Player';
    const avatarEmoji = searchParams.get('avatarEmoji') || '📰';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Icon for RTL languages
    const icon = language === 'he' ? '🔥📰' : '📰🔥';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a2e',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 20% 50%, rgba(255, 225, 53, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255, 107, 53, 0.1) 0%, transparent 50%)',
            }}
          />

          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              zIndex: 1,
            }}
          >
            {/* Icon */}
            <div
              style={{
                fontSize: '96px',
                marginBottom: '8px',
              }}
            >
              {icon}
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#FFE135',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '4px',
                textShadow: '4px 4px 0px black',
              }}
            >
              DAILY BUZZ
            </div>

            {/* Topic */}
            <div
              style={{
                fontSize: '28px',
                color: '#ffffff',
                textAlign: 'center',
                maxWidth: '800px',
                padding: '0 32px',
                fontWeight: 600,
              }}
            >
              {topic}
            </div>

            {/* Score Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#FFE135',
                padding: '32px 64px',
                borderRadius: '16px',
                border: '6px solid black',
                boxShadow: '8px 8px 0px black',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: 900,
                  color: '#1a1a2e',
                  lineHeight: 1,
                }}
              >
                {score}
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#1a1a2e',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginTop: '8px',
                }}
              >
                POINTS
              </div>
            </div>

            {/* Player Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                }}
              >
                {avatarEmoji}
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#00D9FF',
                }}
              >
                {displayName}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                fontSize: '20px',
                color: '#94a3b8',
                marginTop: '8px',
              }}
            >
              {date} • LexiClash
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating Daily Buzz OG image:', errorMessage);
    return new Response('Error generating image', { status: 500 });
  }
}
