import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Dynamic OG Image Generation API
 *
 * Generates personalized Open Graph images for social sharing.
 *
 * Usage:
 * - /api/og?player=John&score=150 - Player score card
 * - /api/og?room=ABC123 - Room invite card
 * - /api/og?achievement=COMBO_KING - Achievement unlock card
 * - /api/og?streak=7 - Streak milestone card
 * - /api/og - Default LexiClash card
 */

// Neo-brutalist color palette
const COLORS = {
  yellow: '#FFE135',
  orange: '#FF6B35',
  pink: '#FF1493',
  cyan: '#00FFFF',
  lime: '#BFFF00',
  red: '#FF3366',
  navy: '#1a1a2e',
  cream: '#FFFEF0',
  black: '#000000',
  white: '#FFFFFF',
};

// Score tier colors and messages
const SCORE_TIERS = [
  { min: 200, color: COLORS.pink, label: 'LEGENDARY', emoji: '👑' },
  { min: 150, color: COLORS.orange, label: 'AMAZING', emoji: '🔥' },
  { min: 100, color: COLORS.yellow, label: 'GREAT', emoji: '⭐' },
  { min: 50, color: COLORS.lime, label: 'GOOD', emoji: '👍' },
  { min: 0, color: COLORS.cyan, label: 'NICE', emoji: '✓' },
];

const MODE_LABELS: Record<string, string> = {
  singleplayer: 'Solo',
  multiplayer: 'Multiplayer',
  blast: 'Blast',
  adventure: 'Adventure',
  daily: 'Daily Challenge',
  'word-hunt': 'Word Hunt',
};

const CTA: Record<string, string> = {
  en: 'Can you beat this score?',
  he: 'תצליחו לנצח?',
  sv: 'Kan du slå detta?',
  ja: 'このスコアに勝てる？',
  es: '¿Puedes superar esto?',
};

function getScoreTier(score: number) {
  return SCORE_TIERS.find(tier => score >= tier.min) || SCORE_TIERS[SCORE_TIERS.length - 1];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const player = searchParams.get('player');
  const score = searchParams.get('score');
  const room = searchParams.get('room');
  const achievement = searchParams.get('achievement');
  const streak = searchParams.get('streak');
  const words = searchParams.get('words');
  const mode = searchParams.get('mode');
  const locale = searchParams.get('locale') || 'en';

  // Determine card type
  const cardType = player && score ? 'score'
    : room ? 'room'
    : achievement ? 'achievement'
    : streak ? 'streak'
    : 'default';

  try {
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
            backgroundColor: COLORS.navy,
            backgroundImage: 'radial-gradient(circle at 25% 25%, #2d2d44 0%, transparent 50%), radial-gradient(circle at 75% 75%, #16213e 0%, transparent 50%)',
            padding: '40px',
          }}
        >
          {/* Neo-brutalist card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.cream,
              border: `6px solid ${COLORS.black}`,
              borderRadius: '16px',
              boxShadow: `12px 12px 0px ${COLORS.black}`,
              padding: '48px 64px',
              transform: 'rotate(-1deg)',
              maxWidth: '1000px',
            }}
          >
            {/* LexiClash Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <span
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: COLORS.black,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textShadow: `3px 3px 0px ${COLORS.yellow}`,
                }}
              >
                LexiClash
              </span>
            </div>

            {/* Card Content based on type */}
            {cardType === 'score' && player && score && (
              <>
                {/* Player name */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '36px',
                      fontWeight: 700,
                      color: COLORS.black,
                    }}
                  >
                    {player}
                  </span>
                </div>

                {/* Score badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: getScoreTier(parseInt(score)).color,
                    border: `4px solid ${COLORS.black}`,
                    borderRadius: '12px',
                    padding: '16px 32px',
                    boxShadow: `6px 6px 0px ${COLORS.black}`,
                    marginBottom: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '64px',
                      fontWeight: 900,
                      color: COLORS.black,
                    }}
                  >
                    {score} pts
                  </span>
                </div>

                {/* Tier label */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '32px' }}>
                    {getScoreTier(parseInt(score)).emoji}
                  </span>
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      color: COLORS.black,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {getScoreTier(parseInt(score)).label}
                  </span>
                </div>

                {/* Stats row: mode + words */}
                {(mode || words) && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '12px',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                    }}
                  >
                    {mode && MODE_LABELS[mode] && (
                      <div
                        style={{
                          display: 'flex',
                          backgroundColor: COLORS.cyan,
                          border: `3px solid ${COLORS.black}`,
                          borderRadius: '8px',
                          padding: '6px 16px',
                          boxShadow: `3px 3px 0px ${COLORS.black}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: COLORS.black,
                          }}
                        >
                          {MODE_LABELS[mode]}
                        </span>
                      </div>
                    )}
                    {words && (
                      <div
                        style={{
                          display: 'flex',
                          backgroundColor: COLORS.pink,
                          border: `3px solid ${COLORS.black}`,
                          borderRadius: '8px',
                          padding: '6px 16px',
                          boxShadow: `3px 3px 0px ${COLORS.black}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: COLORS.black,
                          }}
                        >
                          {words} words
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Call to action */}
                <div
                  style={{
                    display: 'flex',
                    marginTop: '24px',
                    backgroundColor: COLORS.yellow,
                    border: `3px solid ${COLORS.black}`,
                    borderRadius: '8px',
                    padding: '12px 24px',
                    boxShadow: `4px 4px 0px ${COLORS.black}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: COLORS.black,
                      textTransform: 'uppercase',
                    }}
                  >
                    {CTA[locale] || CTA.en}
                  </span>
                </div>
              </>
            )}

            {cardType === 'room' && room && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '24px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: COLORS.black,
                    }}
                  >
                    Join the game!
                  </span>
                </div>

                {/* Room code */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: COLORS.cyan,
                    border: `4px solid ${COLORS.black}`,
                    borderRadius: '12px',
                    padding: '20px 40px',
                    boxShadow: `6px 6px 0px ${COLORS.black}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: '56px',
                      fontWeight: 900,
                      color: COLORS.black,
                      letterSpacing: '0.2em',
                      fontFamily: 'monospace',
                    }}
                  >
                    {room.toUpperCase()}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    marginTop: '24px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '22px',
                      fontWeight: 600,
                      color: COLORS.black,
                    }}
                  >
                    Real-time multiplayer word battle
                  </span>
                </div>
              </>
            )}

            {cardType === 'streak' && streak && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '48px' }}>🔥</span>
                  <span
                    style={{
                      fontSize: '72px',
                      fontWeight: 900,
                      color: COLORS.orange,
                      textShadow: `3px 3px 0px ${COLORS.black}`,
                    }}
                  >
                    {streak} Day Streak!
                  </span>
                  <span style={{ fontSize: '48px' }}>🔥</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    marginTop: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '24px',
                      fontWeight: 600,
                      color: COLORS.black,
                    }}
                  >
                    Playing daily and getting better!
                  </span>
                </div>
              </>
            )}

            {cardType === 'achievement' && achievement && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '64px' }}>🏆</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: COLORS.yellow,
                    border: `4px solid ${COLORS.black}`,
                    borderRadius: '12px',
                    padding: '16px 32px',
                    boxShadow: `6px 6px 0px ${COLORS.black}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: '36px',
                      fontWeight: 900,
                      color: COLORS.black,
                      textTransform: 'uppercase',
                    }}
                  >
                    {achievement.replace(/_/g, ' ')}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    marginTop: '20px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '22px',
                      fontWeight: 600,
                      color: COLORS.black,
                    }}
                  >
                    Achievement Unlocked!
                  </span>
                </div>
              </>
            )}

            {cardType === 'default' && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '32px',
                      fontWeight: 700,
                      color: COLORS.black,
                      textAlign: 'center',
                    }}
                  >
                    Real-Time Multiplayer Word Strategy Game
                  </span>
                </div>

                {/* Feature badges */}
                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  {['🎮 Multiplayer', '⚡ Real-time', '🌍 5 Languages'].map((feature, i) => (
                    <div
                      key={feature}
                      style={{
                        display: 'flex',
                        backgroundColor: [COLORS.yellow, COLORS.cyan, COLORS.pink][i],
                        border: `3px solid ${COLORS.black}`,
                        borderRadius: '8px',
                        padding: '8px 16px',
                        boxShadow: `3px 3px 0px ${COLORS.black}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: COLORS.black,
                        }}
                      >
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    marginTop: '28px',
                    backgroundColor: COLORS.lime,
                    border: `3px solid ${COLORS.black}`,
                    borderRadius: '8px',
                    padding: '12px 24px',
                    boxShadow: `4px 4px 0px ${COLORS.black}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: COLORS.black,
                      textTransform: 'uppercase',
                    }}
                  >
                    Play Free Now!
                  </span>
                </div>
              </>
            )}
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
                color: COLORS.cream,
                opacity: 0.7,
              }}
            >
              lexiclash.live
            </span>
          </div>
        </div>
      ),
      {
        width: 2400,
        height: 1260,
      },
    );
  } catch (e) {
    console.error('OG Image generation error:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
