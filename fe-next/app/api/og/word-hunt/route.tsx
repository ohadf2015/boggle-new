import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Dynamic OG Image for Word Hunt Daily Challenge
 * Full-bleed dark design with large, visible text
 */

const CHALLENGE: Record<string, string> = {
  en: 'Can you beat me?',
  he: '?יתוא חצנל לוכי', // "יכול לנצח אותי?" reversed for Satori
  sv: 'Kan du slå mig?',
  ja: '勝てる？',
  es: '¿Puedes ganarme?',
};

const PERFORMANCE_MSG: Record<string, Record<string, string>> = {
  en: { wizard: 'Word Wizard!', crushed: 'Crushed it!', nice: 'Nice one!', made: 'Made it!', phew: 'Phew!', failed: 'This one got me!' },
  he: { wizard: '!םילימ ףשא', crushed: '!הז תא יתצרמ', nice: '!הפי', made: '!יתחלצה', phew: '!ואופ', failed: '!יתוא ספת הז' },
  sv: { wizard: 'Ordmästare!', crushed: 'Krossade det!', nice: 'Snyggt!', made: 'Klarade det!', phew: 'Puh!', failed: 'Den tog mig!' },
  ja: { wizard: '言葉の達人!', crushed: '完璧!', nice: 'いいね!', made: 'セーフ!', phew: 'ふぅ!', failed: 'やられた!' },
  es: { wizard: '¡Mago de palabras!', crushed: '¡Lo aplasté!', nice: '¡Bien hecho!', made: '¡Lo logré!', phew: '¡Uf!', failed: '¡Esta me ganó!' },
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

function getPerformanceKey(solved: boolean, attempts: number): string {
  if (!solved) return 'failed';
  if (attempts <= 2) return 'wizard';
  if (attempts <= 4) return 'crushed';
  if (attempts <= 6) return 'nice';
  if (attempts <= 8) return 'made';
  return 'phew';
}

function getPerformanceEmoji(solved: boolean, attempts: number): string {
  if (!solved) return '💪';
  if (attempts <= 2) return '🔥';
  if (attempts <= 4) return '⚡';
  if (attempts <= 6) return '✨';
  if (attempts <= 8) return '💫';
  return '🎉';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const solved = searchParams.get('solved') === 'true';
    const attempts = parseInt(searchParams.get('attempts') || '0');
    const displayName = searchParams.get('displayName') || 'Player';
    const avatarEmoji = searchParams.get('avatarEmoji') || '🎯';
    const puzzleNumber = searchParams.get('puzzleNumber') || '';
    const locale = searchParams.get('locale') || 'en';

    const challenge = CHALLENGE[locale] || CHALLENGE.en;
    const performanceKey = getPerformanceKey(solved, attempts);
    const performanceMsg = (PERFORMANCE_MSG[locale] || PERFORMANCE_MSG.en)[performanceKey];
    const performanceEmoji = getPerformanceEmoji(solved, attempts);
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
            background: `linear-gradient(135deg, #0f0f14 0%, #1a1a2e 50%, #0f0f14 100%)`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '40px',
          }}
        >
          {/* Top: Brand + Puzzle Number */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '40px' }}>🎮</span>
            <span style={{ fontSize: '36px', fontWeight: 900, color: '#fff', letterSpacing: '3px' }}>
              LEXICLASH
            </span>
            {puzzleNumber && (
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#6b7280' }}>
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
              gap: '24px',
              marginBottom: '24px',
            }}
          >
            <span style={{ fontSize: '80px' }}>{avatarEmoji}</span>
            <span style={{
              fontSize: '64px',
              fontWeight: 900,
              color: '#fff',
              maxWidth: '600px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {reverseIfHebrew(displayName)}
            </span>
          </div>

          {/* Main result - HUGE and prominent */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)`,
              borderRadius: '24px',
              padding: '32px 80px',
              marginBottom: '24px',
            }}
          >
            {solved ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Big attempt number */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                  <span
                    style={{
                      fontSize: '220px',
                      fontWeight: 900,
                      color: accent,
                      lineHeight: 0.9,
                      letterSpacing: '-12px',
                    }}
                  >
                    {attempts}
                  </span>
                  <span style={{ fontSize: '80px', fontWeight: 900, color: '#4b5563' }}>/10</span>
                </div>
                {/* Performance message with emoji */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                  <span style={{ fontSize: '56px' }}>{performanceEmoji}</span>
                  <span style={{ fontSize: '48px', fontWeight: 800, color: accent }}>
                    {performanceMsg}
                  </span>
                  <span style={{ fontSize: '56px' }}>{performanceEmoji}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '160px' }}>💪</span>
                <span
                  style={{
                    fontSize: '56px',
                    fontWeight: 900,
                    color: accent,
                    marginTop: '16px',
                  }}
                >
                  {performanceMsg}
                </span>
              </div>
            )}
          </div>

          {/* Bottom CTA - full width bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              padding: '20px 60px',
              background: accent,
              borderRadius: '16px',
            }}
          >
            <span style={{ fontSize: '48px' }}>🎯</span>
            <span style={{
              fontSize: '40px',
              fontWeight: 900,
              color: '#000',
              letterSpacing: isRTL ? '0' : '2px',
              direction: isRTL ? 'rtl' : 'ltr'
            }}>
              {challenge}
            </span>
            <span style={{ fontSize: '48px' }}>🎯</span>
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
