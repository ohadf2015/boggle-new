import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Dynamic OG Image for Word Hunt Daily Challenge
 * Dark neo-brutalist style
 */

const CHALLENGE: Record<string, string> = {
  en: 'Beat my score?',
  he: '?יתוא חצנת', // Reversed for Satori RTL rendering
  sv: 'Slå mitt resultat?',
  ja: '挑戦する？',
  es: '¿Puedes superarlo?',
};

const SOLVED_IN: Record<string, string> = {
  en: 'Solved in',
  he: '!תונויסינ', // "נסיונות!" reversed
  sv: 'Löst på',
  ja: '回で解決',
  es: 'Resuelto en',
};

const FAILED: Record<string, string> = {
  en: 'This one got me!',
  he: '!יתוא ספת הז', // "זה תפס אותי!" reversed
  sv: 'Den tog mig!',
  ja: 'やられた！',
  es: '¡Me atrapó!',
};

// Check if string contains Hebrew characters and reverse it for Satori
function reverseIfHebrew(text: string): string {
  const hebrewRegex = /[\u0590-\u05FF]/;
  if (hebrewRegex.test(text)) {
    return text.split('').reverse().join('');
  }
  return text;
}

function getAccentColor(solved: boolean, attempts: number): string {
  if (!solved) return '#ef4444';
  if (attempts <= 2) return '#fbbf24';
  if (attempts <= 4) return '#22c55e';
  if (attempts <= 6) return '#06b6d4';
  if (attempts <= 8) return '#f97316';
  return '#ec4899';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const solved = searchParams.get('solved') === 'true';
    const attempts = parseInt(searchParams.get('attempts') || '0');
    const displayName = searchParams.get('displayName') || 'Player';
    const avatarEmoji = searchParams.get('avatarEmoji') || '🎯';
    const locale = searchParams.get('locale') || 'en';

    const challenge = CHALLENGE[locale] || CHALLENGE.en;
    const solvedInText = SOLVED_IN[locale] || SOLVED_IN.en;
    const failedText = FAILED[locale] || FAILED.en;
    const accent = getAccentColor(solved, attempts);
    const isRTL = locale === 'he';

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
            background: '#0f0f14',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Main card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#1a1a24',
              padding: '48px 80px',
              border: `6px solid ${accent}`,
              boxShadow: `12px 12px 0px ${accent}`,
            }}
          >
            {/* Brand */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '32px',
              }}
            >
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}>LEXICLASH</span>
            </div>

            {/* Player */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '32px',
              }}
            >
              <span style={{ fontSize: '56px' }}>{avatarEmoji}</span>
              <span style={{ fontSize: '48px', fontWeight: 900, color: '#fff' }}>{reverseIfHebrew(displayName)}</span>
            </div>

            {/* Score */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {solved ? (
                <>
                  <span style={{ fontSize: '36px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
                    {solvedInText}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '180px',
                        fontWeight: 900,
                        color: accent,
                        lineHeight: 1,
                        letterSpacing: '-10px',
                      }}
                    >
                      {attempts}
                    </span>
                    <span style={{ fontSize: '48px', fontWeight: 900, color: '#9ca3af' }}>
                      {attempts === 1 ? '🎯' : '✨'}
                    </span>
                  </div>
                </>
              ) : (
                <span
                  style={{
                    fontSize: '72px',
                    fontWeight: 900,
                    color: accent,
                    textTransform: 'uppercase',
                  }}
                >
                  {failedText}
                </span>
              )}
            </div>
          </div>

          {/* Bottom CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '32px',
              padding: '16px 40px',
              background: accent,
            }}
          >
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#000', letterSpacing: isRTL ? '0' : '2px', direction: isRTL ? 'rtl' : 'ltr' }}>{challenge}</span>
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
