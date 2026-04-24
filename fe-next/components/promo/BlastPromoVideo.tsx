/**
 * BlastPromoVideo — Instagram Reel (1080×1920, 9:16, 30fps, ~17s)
 *
 * Showcases Blast Mode gameplay feel for Instagram promotion.
 * Scene flow:
 *   1. Hook — "Bored of easy word games?" with boring tiles
 *   2. Blast Intro — bomb drops, board explodes to life
 *   3. Gameplay — words swiped on grid, combos building, bombs ticking
 *   4. Wave Clear — screen shake, tiles explode, wave counter advances
 *   5. CTA — mascot + "Blast your way in"
 */

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  staticFile,
} from 'remotion';
import {
  TransitionSeries,
  linearTiming,
} from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { Audio } from '@remotion/media';
import { loadFont as loadBangers } from '@remotion/google-fonts/Bangers';
import { loadFont as loadFredoka } from '@remotion/google-fonts/Fredoka';
import { loadFont as loadSora } from '@remotion/google-fonts/Sora';
import { createSeededRandom } from '../../lib/remotion/utils/seededRandom';

const { fontFamily: bangers } = loadBangers('normal', {
  weights: ['400'],
  subsets: ['latin'],
});
const { fontFamily: fredoka } = loadFredoka('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
});
const { fontFamily: sora } = loadSora('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
});

/* ─── Colors (matching neo-brutalist theme) ─── */
const C = {
  bg: '#0a0a1a',
  bgWarm: '#1a0a0a',
  navy: '#1a1a2e',
  lime: '#BFFF00',
  pink: '#FF1493',
  cyan: '#00FFFF',
  purple: '#8B5CF6',
  orange: '#FF6B35',
  orangeLight: '#FF8C5A',
  amber: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  red: '#FF3366',
  cream: '#FFFEF0',
} as const;

const center: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

/* ─── Seeded particles ─── */
const rng = createSeededRandom(42);
const SPARK_PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: (rng() - 0.5) * 800,
  y: (rng() - 0.5) * 600,
  size: 4 + rng() * 8,
  angle: rng() * 360,
  speed: 2 + rng() * 4,
}));

const EXPLOSION_PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  angle: (i / 16) * 360 + rng() * 22,
  distance: 80 + rng() * 200,
  size: 6 + rng() * 14,
  color: [C.orange, C.amber, C.red, C.lime][Math.floor(rng() * 4)],
}));

/* ─── Letter tile for the grid ─── */
const GridTile: React.FC<{
  letter: string;
  size: number;
  isBomb?: boolean;
  isSelected?: boolean;
  isExploding?: boolean;
  explodeProgress?: number;
  opacity?: number;
  scale?: number;
}> = ({
  letter,
  size,
  isBomb = false,
  isSelected = false,
  isExploding = false,
  explodeProgress = 0,
  opacity = 1,
  scale = 1,
}) => {
  const bg = isExploding
    ? C.red
    : isBomb
      ? C.orange
      : isSelected
        ? C.lime
        : C.navy;
  const borderColor = isSelected ? C.lime : isBomb ? C.orange : `${C.white}30`;
  const textColor = isSelected || isBomb ? C.black : C.cream;
  const explodeScale = isExploding ? 1 + explodeProgress * 0.5 : 1;

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        border: `3px solid ${borderColor}`,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isBomb
          ? `0 0 20px ${C.orange}66, 4px 4px 0 ${C.black}`
          : isSelected
            ? `0 0 16px ${C.lime}44, 4px 4px 0 ${C.black}`
            : `4px 4px 0 ${C.black}`,
        opacity: opacity * (isExploding ? 1 - explodeProgress : 1),
        transform: `scale(${scale * explodeScale})`,
        position: 'relative',
      }}
    >
      {isBomb && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.red} 30%, ${C.orange} 100%)`,
            boxShadow: `0 0 8px ${C.red}88`,
          }}
        />
      )}
      <span
        style={{
          fontFamily: fredoka,
          fontSize: size * 0.5,
          fontWeight: 700,
          color: textColor,
          textShadow: isSelected ? 'none' : `1px 1px 0 ${C.black}44`,
        }}
      >
        {letter}
      </span>
    </div>
  );
};

/* ─── Combo badge ─── */
const ComboBadge: React.FC<{
  combo: number;
  scale: number;
  opacity: number;
}> = ({ combo, scale, opacity }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 20px',
      backgroundColor: C.orange,
      border: `3px solid ${C.black}`,
      borderRadius: 12,
      boxShadow: `4px 4px 0 ${C.black}`,
      transform: `scale(${scale})`,
      opacity,
    }}
  >
    <span style={{ fontSize: 20 }}>🔥</span>
    <span
      style={{
        fontFamily: bangers,
        fontSize: 32,
        color: C.black,
        letterSpacing: '0.05em',
      }}
    >
      {combo}x COMBO
    </span>
  </div>
);

/* ─── Score fly-up ─── */
const ScoreFly: React.FC<{
  points: number;
  y: number;
  opacity: number;
}> = ({ points, y, opacity }) => (
  <div
    style={{
      fontFamily: bangers,
      fontSize: 48,
      color: C.lime,
      textShadow: `3px 3px 0 ${C.black}, 0 0 20px ${C.lime}66`,
      transform: `translateY(${y}px)`,
      opacity,
    }}
  >
    +{points}
  </div>
);

// ==============================
// SCENE 1: HOOK — boring word game
// ==============================
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleO = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: 'clamp' });

  // Boring gray tiles appear
  const tileProgress = interpolate(frame, [25, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const boringLetters = ['W', 'O', 'R', 'D', 'S'];
  const visibleTiles = Math.floor(tileProgress * 5);

  // Yawn
  const yawnO = interpolate(frame, [70, 85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const yawnScale = spring({ frame: frame - 70, fps, config: { damping: 8, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div style={center}>
        <div
          style={{
            fontFamily: fredoka,
            fontSize: 52,
            fontWeight: 700,
            color: `${C.white}BB`,
            textAlign: 'center',
            opacity: titleO,
            transform: `translateY(${titleY}px)`,
            marginBottom: 60,
            lineHeight: 1.3,
          }}
        >
          Bored of
          <br />
          <span style={{ color: `${C.white}55` }}>easy</span> word games?
        </div>

        {/* Boring gray tiles */}
        <div style={{ display: 'flex', gap: 10 }}>
          {boringLetters.map((letter, i) => (
            <div
              key={`boring-${i}-${letter}`}
              style={{
                width: 80,
                height: 80,
                backgroundColor: '#3a3a3c',
                border: `3px solid #565758`,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: i < visibleTiles ? 1 : 0,
                transform: `scale(${i < visibleTiles ? 1 : 0.5})`,
                transition: 'all 0.15s',
              }}
            >
              <span
                style={{
                  fontFamily: sora,
                  fontSize: 38,
                  fontWeight: 700,
                  color: C.white,
                }}
              >
                {letter}
              </span>
            </div>
          ))}
        </div>

        {/* Yawn emoji */}
        <div
          style={{
            fontSize: 64,
            marginTop: 40,
            opacity: yawnO,
            transform: `scale(${yawnScale})`,
          }}
        >
          😴
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 2: BLAST INTRO — bomb drops
// ==============================
const BlastIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bomb drops from top
  const bombY = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 60 },
  });

  // Flash on impact
  const impactFrame = 18;
  const flashO = interpolate(frame, [impactFrame, impactFrame + 5, impactFrame + 15], [0, 0.8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Text appears
  const textO = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textScale = spring({
    frame: frame - 25,
    fps,
    config: { damping: 10, stiffness: 150 },
  });

  // Subtitle
  const subO = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Screen shake
  const shakeX = frame > impactFrame && frame < impactFrame + 12
    ? Math.sin(frame * 4) * interpolate(frame, [impactFrame, impactFrame + 12], [12, 0], { extrapolateRight: 'clamp' })
    : 0;
  const shakeY = frame > impactFrame && frame < impactFrame + 12
    ? Math.cos(frame * 5) * interpolate(frame, [impactFrame, impactFrame + 12], [8, 0], { extrapolateRight: 'clamp' })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Orange flash on impact */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 60%, ${C.orange}DD 0%, transparent 60%)`,
          opacity: flashO,
          zIndex: 20,
        }}
      />

      {/* Explosion particles */}
      {frame > impactFrame && EXPLOSION_PARTICLES.map((p) => {
        const progress = interpolate(frame, [impactFrame, impactFrame + 25], [0, 1], {
          extrapolateRight: 'clamp',
        });
        const rad = (p.angle * Math.PI) / 180;
        const px = Math.cos(rad) * p.distance * progress;
        const py = Math.sin(rad) * p.distance * progress - 200;
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '60%',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: p.color,
              transform: `translate(${px}px, ${py}px)`,
              opacity: 1 - progress,
              zIndex: 15,
            }}
          />
        );
      })}

      <div
        style={{
          ...center,
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        }}
      >
        {/* Bomb emoji dropping */}
        <div
          style={{
            fontSize: 120,
            transform: `translateY(${interpolate(bombY, [0, 1], [-600, 0])}px)`,
            filter: `drop-shadow(0 0 30px ${C.orange}88)`,
            marginBottom: 30,
          }}
        >
          💣
        </div>

        {/* BLAST MODE text */}
        <div
          style={{
            fontFamily: bangers,
            fontSize: 84,
            color: C.orange,
            textShadow: `4px 4px 0 ${C.black}, 0 0 40px ${C.orange}66`,
            opacity: textO,
            transform: `scale(${textScale})`,
            letterSpacing: '0.08em',
          }}
        >
          BLAST MODE
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: fredoka,
            fontSize: 36,
            fontWeight: 600,
            color: `${C.white}CC`,
            opacity: subO,
            marginTop: 16,
          }}
        >
          Clear the board before it blows 🔥
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 3: GAMEPLAY — grid with swiping
// ==============================
const GameplayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const GRID = [
    ['B', 'L', 'A', 'S'],
    ['O', 'T', 'R', 'E'],
    ['M', 'W', 'I', 'N'],
    ['D', 'S', 'K', 'P'],
  ];

  const TILE_SIZE = 110;
  const GAP = 10;
  const BOMB_POSITIONS = [[0, 0], [2, 3]]; // B and P are bombs

  // Word 1: "BLAST" — selected tiles highlight sequentially
  const word1Start = 10;
  const word1Tiles = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]]; // B-L-A-S → wait → T
  const word1Progress = interpolate(frame, [word1Start, word1Start + 25], [0, 5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Word 1 score fly
  const score1O = interpolate(frame, [word1Start + 30, word1Start + 35, word1Start + 55], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const score1Y = interpolate(frame, [word1Start + 30, word1Start + 55], [0, -60], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Word 2: "WRIST" at frame 55
  const word2Start = 55;
  const word2Tiles = [[2, 1], [1, 2], [2, 2], [0, 3], [1, 1]]; // W-R-I-S-T
  const word2Progress = interpolate(frame, [word2Start, word2Start + 25], [0, 5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Combo badge
  const comboStart = word2Start + 28;
  const comboScale = spring({
    frame: frame - comboStart,
    fps,
    config: { damping: 10, stiffness: 200 },
  });
  const comboO = interpolate(frame, [comboStart, comboStart + 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Score display
  const scoreValue = frame < word1Start + 30 ? 0 : frame < word2Start + 28 ? 85 : 195;

  // Moves remaining
  const movesLeft = frame < word1Start + 28 ? 10 : frame < word2Start + 26 ? 9 : 8;

  const isWord1Active = frame >= word1Start && frame < word2Start;
  const isWord2Active = frame >= word2Start;

  const isSelected = (r: number, c: number) => {
    if (isWord1Active) {
      const idx = word1Tiles.findIndex(([tr, tc]) => tr === r && tc === c);
      return idx >= 0 && idx < word1Progress;
    }
    if (isWord2Active && frame < word2Start + 28) {
      const idx = word2Tiles.findIndex(([tr, tc]) => tr === r && tc === c);
      return idx >= 0 && idx < word2Progress;
    }
    return false;
  };

  const isBomb = (r: number, c: number) =>
    BOMB_POSITIONS.some(([br, bc]) => br === r && bc === c);

  // Grid entrance
  const gridScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.orange}12 0%, transparent 60%)`,
          filter: 'blur(40px)',
        }}
      />

      <div style={center}>
        {/* HUD — Score + Moves */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: TILE_SIZE * 4 + GAP * 3,
            marginBottom: 24,
            padding: '0 4px',
          }}
        >
          <div
            style={{
              fontFamily: bangers,
              fontSize: 36,
              color: C.lime,
              textShadow: `2px 2px 0 ${C.black}`,
            }}
          >
            {scoreValue}
          </div>
          <div
            style={{
              fontFamily: sora,
              fontSize: 20,
              fontWeight: 700,
              color: C.cream,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            💣 {movesLeft} moves
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: GAP,
            transform: `scale(${gridScale})`,
          }}
        >
          {GRID.map((row, r) => (
            <div key={r} style={{ display: 'flex', gap: GAP }}>
              {row.map((letter, c) => {
                const tileScale = spring({
                  frame: frame - r * 3 - c * 2,
                  fps,
                  config: { damping: 12, stiffness: 200 },
                });
                return (
                  <GridTile
                    key={`${r}-${c}`}
                    letter={letter}
                    size={TILE_SIZE}
                    isBomb={isBomb(r, c)}
                    isSelected={isSelected(r, c)}
                    scale={tileScale}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Score fly-up for word 1 */}
        {score1O > 0 && (
          <div style={{ position: 'absolute', top: '32%' }}>
            <ScoreFly points={85} y={score1Y} opacity={score1O} />
          </div>
        )}

        {/* Combo badge */}
        {comboO > 0 && (
          <div style={{ marginTop: 24 }}>
            <ComboBadge combo={2} scale={comboScale} opacity={comboO} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 4: WAVE CLEAR — explosion
// ==============================
const WaveClearScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big flash
  const flashO = interpolate(frame, [0, 5, 20], [0.9, 0.9, 0], {
    extrapolateRight: 'clamp',
  });

  // Screen shake
  const shakeIntensity = interpolate(frame, [0, 25], [15, 0], { extrapolateRight: 'clamp' });
  const shakeX = Math.sin(frame * 5) * shakeIntensity;
  const shakeY = Math.cos(frame * 7) * shakeIntensity;

  // "WAVE 1 CLEAR!" text
  const textScale = spring({
    frame: frame - 8,
    fps,
    config: { damping: 8, stiffness: 100 },
  });
  const textO = interpolate(frame, [8, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Wave 2 countdown
  const wave2O = interpolate(frame, [45, 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wave2Scale = spring({
    frame: frame - 45,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  // Mascot
  const mascotO = interpolate(frame, [35, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const mascotScale = spring({
    frame: frame - 35,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Flash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle, ${C.orange} 0%, ${C.amber}88 30%, transparent 70%)`,
          opacity: flashO,
          zIndex: 20,
        }}
      />

      {/* Flying particles */}
      {EXPLOSION_PARTICLES.map((p) => {
        const progress = interpolate(frame, [0, 35], [0, 1], {
          extrapolateRight: 'clamp',
        });
        const rad = (p.angle * Math.PI) / 180;
        const px = Math.cos(rad) * p.distance * 1.5 * progress;
        const py = Math.sin(rad) * p.distance * 1.5 * progress;
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: p.size,
              height: p.size,
              borderRadius: p.id % 3 === 0 ? '50%' : 4,
              backgroundColor: p.color,
              border: `2px solid ${C.black}`,
              transform: `translate(${px}px, ${py}px) rotate(${p.angle + frame * 3}deg)`,
              opacity: 1 - progress * 0.8,
              zIndex: 15,
            }}
          />
        );
      })}

      <div
        style={{
          ...center,
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        }}
      >
        {/* WAVE 1 CLEAR */}
        <div
          style={{
            fontFamily: bangers,
            fontSize: 72,
            color: C.lime,
            textShadow: `4px 4px 0 ${C.black}, 0 0 30px ${C.lime}44`,
            opacity: textO,
            transform: `scale(${textScale})`,
            letterSpacing: '0.06em',
          }}
        >
          WAVE 1 CLEAR!
        </div>

        {/* Score summary */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 28,
            fontWeight: 700,
            color: C.orange,
            opacity: textO,
            marginTop: 12,
            textShadow: `2px 2px 0 ${C.black}`,
          }}
        >
          +195 pts • 2x combo
        </div>

        {/* Mascot appears */}
        <div
          style={{
            marginTop: 30,
            opacity: mascotO,
            transform: `scale(${mascotScale})`,
          }}
        >
          {/* Placeholder for mascot image — Remotion uses staticFile */}
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: 24,
              border: `4px solid ${C.orange}`,
              boxShadow: `6px 6px 0 ${C.black}, 0 0 30px ${C.orange}44`,
              overflow: 'hidden',
              background: C.navy,
            }}
          >
{/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={staticFile('mascot-blast.jpg')}
              alt="Blast mascot"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* Wave 2 teaser */}
        <div
          style={{
            fontFamily: fredoka,
            fontSize: 32,
            fontWeight: 600,
            color: `${C.white}CC`,
            opacity: wave2O,
            transform: `scale(${wave2Scale})`,
            marginTop: 30,
          }}
        >
          Wave 2 incoming... 💣
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 5: CTA
// ==============================
const BlastCTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mascotScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const textO = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const btnO = interpolate(frame, [30, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const btnScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  const urlO = interpolate(frame, [42, 52], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Button shimmer
  const shimmerX = interpolate(frame, [35, 60], [-20, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Orange radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.orange}18 0%, transparent 50%)`,
          filter: 'blur(60px)',
        }}
      />

      <div style={center}>
        {/* Mascot */}
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 32,
            border: `4px solid ${C.orange}`,
            boxShadow: `8px 8px 0 ${C.black}, 0 0 40px ${C.orange}33`,
            overflow: 'hidden',
            background: C.navy,
            transform: `scale(${mascotScale})`,
            marginBottom: 30,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={staticFile('mascot-blast.jpg')}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* CTA text */}
        <div
          style={{
            fontFamily: bangers,
            fontSize: 64,
            color: C.orange,
            textShadow: `4px 4px 0 ${C.black}`,
            opacity: textO,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          BLAST YOUR
          <br />
          WAY IN
        </div>

        {/* CTA button */}
        <div
          style={{
            fontFamily: fredoka,
            fontSize: 28,
            fontWeight: 700,
            color: C.black,
            backgroundColor: C.orange,
            padding: '14px 50px',
            borderRadius: 14,
            border: `3px solid ${C.black}`,
            boxShadow: `6px 6px 0 ${C.black}`,
            marginTop: 30,
            opacity: btnO,
            transform: `scale(${btnScale})`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${shimmerX}%`,
              width: 70,
              height: '100%',
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
              transform: 'skewX(-20deg)',
              pointerEvents: 'none',
            }}
          />
          PLAY NOW — FREE
        </div>

        {/* URL */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 28,
            fontWeight: 600,
            color: C.orange,
            opacity: urlO,
            marginTop: 22,
            letterSpacing: '0.05em',
            textShadow: `0 0 12px ${C.orange}33`,
          }}
        >
          lexiclash.live
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// MAIN COMPOSITION
// ==============================
const T = 12;

const SCENE_DURATIONS = {
  hook: 110,         // ~3.7s
  blastIntro: 90,    // ~3s
  gameplay: 100,     // ~3.3s
  waveClear: 80,     // ~2.7s
  cta: 75,           // ~2.5s
};

const TOTAL_FRAMES =
  Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) - T * 4;
// 455 - 48 = 407 frames ≈ 13.6s

export const BlastPromoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Audio
        src={staticFile('music/bossa-arcade.mp3')}
        volume={(f) => {
          const fadeInEnd = 30;
          const fadeOutStart = TOTAL_FRAMES - 45;
          if (f < fadeInEnd) {
            return interpolate(f, [0, fadeInEnd], [0, 0.6], { extrapolateRight: 'clamp' });
          }
          if (f > fadeOutStart) {
            return interpolate(f, [fadeOutStart, TOTAL_FRAMES], [0.6, 0], { extrapolateRight: 'clamp' });
          }
          return 0.6;
        }}
        loop
      />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.hook}>
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.blastIntro}>
          <BlastIntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.gameplay}>
          <GameplayScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.waveClear}>
          <WaveClearScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.cta}>
          <BlastCTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

BlastPromoVideo.displayName = 'BlastPromoVideo';
