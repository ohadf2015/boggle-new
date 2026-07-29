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
  he: { wizard: '!םילימ ףשא', crushed: '!הז תא יתחציפ', nice: '!הפי', made: '!יתחלצה', phew: '!ואופ', failed: '!יתוא ספת הז' },
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
    const avatarImage = searchParams.get('avatarImage'); // Custom avatar image filename
    const avatarUrl = searchParams.get('avatarUrl'); // Direct avatar URL (e.g., social login)
    const puzzleNumber = searchParams.get('puzzleNumber') || '';
    const locale = searchParams.get('locale') || 'en';

    // Construct avatar image URL - prioritize direct URL, then local avatar.
    // Use a fixed public origin — request.url resolves to container origin (localhost:$PORT)
    // behind Railway's proxy, and forwarded headers are user-controllable (SSRF risk).
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';
    const avatarImageUrl = avatarUrl || (avatarImage ? `${origin}/avatars/${avatarImage}` : null);

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
            padding: '60px',
          }}
        >
          {/* Top: Brand + Puzzle Number - BIGGER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            <span style={{ fontSize: '56px' }}>🎮</span>
            <span style={{ fontSize: '52px', fontWeight: 900, color: '#fff', letterSpacing: '4px' }}>
              LEXICLASH
            </span>
            {puzzleNumber && (
              <span style={{ fontSize: '44px', fontWeight: 700, color: '#6b7280' }}>
                #{puzzleNumber}
              </span>
            )}
          </div>

          {/* Player info - MUCH larger and prominent */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '32px',
              marginBottom: '40px',
            }}
          >
            {avatarImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarImageUrl}
                alt="Avatar"
                width={120}
                height={120}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '6px solid #fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              />
            ) : (
              <span style={{ fontSize: '100px' }}>{avatarEmoji}</span>
            )}
            <span style={{
              fontSize: '72px',
              fontWeight: 900,
              color: '#fff',
              maxWidth: '800px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {reverseIfHebrew(displayName)}
            </span>
          </div>

          {/* Main result - MASSIVE and prominent */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)`,
              borderRadius: '32px',
              padding: '48px 100px',
              marginBottom: '40px',
              border: `4px solid ${accent}33`,
            }}
          >
            {solved ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* HUGE attempt number */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                  <span
                    style={{
                      fontSize: '280px',
                      fontWeight: 900,
                      color: accent,
                      lineHeight: 0.85,
                      letterSpacing: '-16px',
                      textShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    {attempts}
                  </span>
                  <span style={{ fontSize: '100px', fontWeight: 900, color: '#4b5563' }}>/10</span>
                </div>
                {/* Performance message with emoji - BIGGER */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px' }}>
                  <span style={{ fontSize: '72px' }}>{performanceEmoji}</span>
                  <span style={{ fontSize: '64px', fontWeight: 800, color: accent }}>
                    {performanceMsg}
                  </span>
                  <span style={{ fontSize: '72px' }}>{performanceEmoji}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '180px' }}>💪</span>
                <span
                  style={{
                    fontSize: '72px',
                    fontWeight: 900,
                    color: accent,
                    marginTop: '24px',
                  }}
                >
                  {performanceMsg}
                </span>
              </div>
            )}
          </div>

          {/* Bottom CTA - BIGGER bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              padding: '28px 80px',
              background: accent,
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{ fontSize: '64px' }}>🎯</span>
            <span style={{
              fontSize: '52px',
              fontWeight: 900,
              color: '#000',
              letterSpacing: isRTL ? '0' : '2px',
              direction: isRTL ? 'rtl' : 'ltr'
            }}>
              {challenge}
            </span>
            <span style={{ fontSize: '64px' }}>🎯</span>
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
    console.error('Error generating Word Hunt OG image:', errorMessage);
    return new Response('Failed to generate image', { status: 500 });
  }
}
