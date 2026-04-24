/**
 * Boss Defeat Share Card — OG Image Generation
 *
 * Generates a shareable image when a player defeats a boss.
 * Shows: world art, boss name, killing word, player name, stars earned.
 *
 * Usage: /api/og/boss-defeat?world=3&boss=professorThesaurus&word=KNOWLEDGE&player=Ohad&stars=3
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Neo-brutalist palette
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

// Boss display names (English fallback for OG images)
const BOSS_NAMES: Record<string, string> = {
  msGrammar: 'Ms. Grammar',
  spellingBee: 'Spelling Bee',
  professorThesaurus: 'Professor Thesaurus',
  captainMetaphor: 'Captain Metaphor',
  baronBuildaword: 'Baron Buildaword',
  puzzleMaster: 'Puzzle Master',
  reflectionKing: 'Reflection King',
  cosmicWordsmith: 'Cosmic Wordsmith',
  linguistSage: 'Linguist Sage',
  lexiconDragon: 'Lexicon Dragon',
};

// World names (English fallback)
const WORLD_NAMES: Record<number, string> = {
  1: 'Alphabet Meadows',
  2: 'Synonym Springs',
  3: 'Root Caverns',
  4: 'Idiom Archipelago',
  5: 'Compound Canyon',
  6: 'Anagram Labyrinth',
  7: 'Mirror Palace',
  8: 'Neologism Nebula',
  9: 'Polyglot Peaks',
  10: 'Lexicon Throne',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const worldNum = parseInt(searchParams.get('world') || '1', 10);
  const world = Math.max(1, Math.min(10, worldNum));
  const bossId = searchParams.get('boss') || '';
  const killingWord = (searchParams.get('word') || 'VICTORY').toUpperCase();
  const playerName = searchParams.get('player') || 'Adventurer';
  const stars = Math.max(0, Math.min(3, parseInt(searchParams.get('stars') || '3', 10)));

  const colors = WORLD_COLORS[world] || WORLD_COLORS[1];
  const bossName = BOSS_NAMES[bossId] || 'Unknown Boss';
  const worldName = WORLD_NAMES[world] || 'Unknown World';

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
          backgroundColor: C.navy,
          backgroundImage: `radial-gradient(circle at 30% 20%, ${colors.bg} 0%, transparent 60%), radial-gradient(circle at 70% 80%, ${colors.bg} 0%, transparent 60%)`,
          padding: '40px',
        }}
      >
        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0d0d1a',
            border: `6px solid ${colors.primary}`,
            borderRadius: '16px',
            boxShadow: `10px 10px 0px ${C.black}, 12px 12px 0px ${colors.primary}`,
            padding: '40px 56px',
            maxWidth: '1000px',
            width: '100%',
          }}
        >
          {/* Header: BOSS DEFEATED */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '20px', fontWeight: 900, color: colors.primary, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              ⚔️ BOSS DEFEATED ⚔️
            </span>
          </div>

          {/* Boss Name */}
          <div style={{ display: 'flex', marginBottom: '16px' }}>
            <span style={{ fontSize: '52px', fontWeight: 900, color: C.white, textShadow: `3px 3px 0px ${colors.primary}` }}>
              {bossName}
            </span>
          </div>

          {/* World Name */}
          <div style={{ display: 'flex', marginBottom: '24px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: colors.secondary, opacity: 0.8 }}>
              {worldName} — World {world}
            </span>
          </div>

          {/* Killing Word — the word that dealt the final blow */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '24px',
              padding: '16px 40px',
              backgroundColor: `${colors.primary}22`,
              border: `3px solid ${colors.primary}`,
              borderRadius: '12px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 700, color: colors.primary, letterSpacing: '0.1em', marginBottom: '4px' }}>
              KILLING WORD
            </span>
            <span style={{ fontSize: '48px', fontWeight: 900, color: C.white, letterSpacing: '0.08em' }}>
              {killingWord}
            </span>
          </div>

          {/* Stars */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[0, 1, 2].map((i) => (
              <span
                key={`star-${i}`}
                style={{
                  fontSize: '36px',
                  filter: i < stars ? 'none' : 'grayscale(1) opacity(0.3)',
                }}
              >
                ⭐
              </span>
            ))}
          </div>

          {/* Player & CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: `${C.white}aa` }}>
              {playerName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, color: C.yellow, textShadow: `2px 2px 0px ${C.black}` }}>
                LexiClash
              </span>
            </div>
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
