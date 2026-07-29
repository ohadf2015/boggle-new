import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') || '???';

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
          backgroundColor: '#1a1a2e',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFDF0',
            border: '4px solid #000000',
            borderRadius: '8px',
            boxShadow: '8px 8px 0px #000000',
            padding: '48px 64px',
            maxWidth: '900px',
          }}
        >
          {/* Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 28,
              fontWeight: 900,
              color: '#1a1a2e',
              letterSpacing: '-0.02em',
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            LexiClash
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: 52,
              fontWeight: 900,
              color: '#1a1a2e',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            Join the Game!
          </div>

          {/* Room code badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#00FFFF',
              border: '3px solid #000000',
              borderRadius: '8px',
              boxShadow: '4px 4px 0px #000000',
              padding: '16px 48px',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 64,
                fontWeight: 900,
                fontFamily: 'monospace',
                color: '#1a1a2e',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              {code}
            </div>
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 700,
              color: '#666666',
            }}
          >
            Real-time word battle
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
