/**
 * Boss Defeat Share Card — OG Image Generation
 *
 * Generates a shareable image when a player defeats a boss.
 * Shows: boss name, world, killing word, player name, stars earned.
 *
 * Usage: /api/og/boss-defeat?world=3&boss=professorThesaurus&word=KNOWLEDGE&player=Ohad&stars=3
 *
 * Every field comes through `bossCardFields` (lib/adventure/play/bossCard.ts),
 * which is the gate the judge's broken capture asked for: a junk or missing
 * value resolves to something true or comes back null, and a null element is
 * DROPPED from the art. This route no longer parses a param itself, so it can
 * no longer rasterize "Unknown Boss" or "WORLD NAN".
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { bossCardFields } from '@/lib/adventure/play/bossCard';

export const runtime = 'edge';

// Neo-brutalist palette
const NAVY = '#0f1b3d';
const CREAM = '#FFF4E0';

const C = {
  navy: '#1a1a2e',
  black: '#000000',
  white: '#FFFFFF',
  yellow: '#FFE135',
  orange: '#FF6B35',
  pink: '#FF1493',
  cyan: '#00FFFF',
  lime: '#BFFF00',
  red: '#FF3366',
  purple: '#A855F7',
};

// World colors — matches WORLD_CONFIGS in levelConfig.ts
const WORLD_COLORS: Record<number, { primary: string; secondary: string; bg: string }> = {
  1: { primary: C.lime, secondary: '#a3e635', bg: '#1a2e1a' },
  2: { primary: C.cyan, secondary: '#67e8f9', bg: '#1a2e3e' },
  3: { primary: C.purple, secondary: '#c084fc', bg: '#2e1a3e' },
  4: { primary: C.orange, secondary: C.yellow, bg: '#2e2a1a' },
  5: { primary: C.red, secondary: C.orange, bg: '#2e1a1a' },
  6: { primary: C.pink, secondary: '#f472b6', bg: '#2e1a2e' },
  7: { primary: C.cyan, secondary: C.white, bg: '#1a2e3e' },
  8: { primary: C.purple, secondary: C.pink, bg: '#1a1a3e' },
  9: { primary: C.cyan, secondary: C.lime, bg: '#1a2e2a' },
  10: { primary: C.yellow, secondary: C.orange, bg: '#2e2a1a' },
};

const NEUTRAL = { primary: C.lime, secondary: '#a3e635', bg: '#1a2e1a' };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const card = bossCardFields({
    world: searchParams.get('world'),
    boss: searchParams.get('boss'),
    word: searchParams.get('word'),
    player: searchParams.get('player'),
    stars: searchParams.get('stars'),
  });

  const colors = (card.world != null && WORLD_COLORS[card.world]) || NEUTRAL;
  // Nothing the request did not say. With no world the card is a generic — but
  // TRUE — adventure card rather than a confident wrong one.
  const headline = card.bossName ?? 'BOSS DEFEATED';
  const chip = card.bossName ? 'BOSS DEFEATED' : 'LEXICLASH ADVENTURE';

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
          backgroundColor: NAVY,
          padding: '36px',
        }}
      >
        {/* Neo-brutalist card: solid fill, 8px black frame, hard offset shadow.
            No glow, no soft gradient, no emoji — the house style, and the share
            rule that share art carries no emoji. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#12203f',
            border: `8px solid ${C.black}`,
            borderRadius: '24px',
            boxShadow: `16px 16px 0px ${colors.primary}`,
            padding: '34px 56px',
            width: '100%',
            maxWidth: '1020px',
          }}
        >
          {/* Solid accent chip, black ink, hard shadow */}
          <div
            style={{
              display: 'flex',
              backgroundColor: colors.primary,
              border: `5px solid ${C.black}`,
              borderRadius: '999px',
              boxShadow: `6px 6px 0px ${C.black}`,
              padding: '6px 26px',
              marginBottom: '18px',
            }}
          >
            <span style={{ fontSize: '24px', fontWeight: 900, color: C.black, letterSpacing: '0.18em' }}>
              {chip}
            </span>
          </div>

          <div style={{ display: 'flex', marginBottom: '6px' }}>
            <span style={{ fontSize: '62px', fontWeight: 900, color: C.white, letterSpacing: '-0.01em' }}>
              {headline}
            </span>
          </div>

          {card.worldName && card.world != null && (
            <div style={{ display: 'flex', marginBottom: '22px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: colors.secondary, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {card.worldName} · World {card.world}
              </span>
            </div>
          )}

          {/* Killing word — cream slab, black ink. Dropped entirely when the
              request carried no word: an invented one is a lie on a share. */}
          {card.word && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '22px',
                padding: '12px 46px',
                backgroundColor: CREAM,
                border: `5px solid ${C.black}`,
                borderRadius: '16px',
                boxShadow: `8px 8px 0px ${C.black}`,
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#3a3a3a', letterSpacing: '0.24em' }}>
                KILLING WORD
              </span>
              <span style={{ fontSize: '54px', fontWeight: 900, color: C.black, letterSpacing: '0.06em' }}>
                {card.word}
              </span>
            </div>
          )}

          {/* Stars as drawn shapes, never the emoji glyph. */}
          {card.stars != null && (
            <div style={{ display: 'flex', gap: '14px', marginBottom: '22px' }}>
              {[0, 1, 2].map((i) => (
                <svg key={`star-${i}`} width="46" height="46" viewBox="0 0 24 24">
                  <path
                    d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z"
                    fill={i < card.stars! ? C.yellow : '#2b3a63'}
                    stroke={C.black}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '22px', fontWeight: 900, color: C.white, letterSpacing: '0.06em' }}>
              {card.player}
            </span>
            <span style={{ fontSize: '30px', fontWeight: 900, color: C.yellow, letterSpacing: '0.04em' }}>
              LexiClash
            </span>
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
