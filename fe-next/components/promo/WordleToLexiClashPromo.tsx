/**
 * WordleToLexiClashPromo — Instagram Reel (1080×1920, 9:16, 30fps, ~18s)
 *
 * Conversion video targeting Wordle players.
 * Scene flow: Wordle grid → shatter → LexiClash grid → gameplay → 1v1 → CTA
 *
 * Creative hook: Start with something familiar (Wordle), break it apart,
 * reveal something bigger and more exciting.
 */

import React from 'react';
import {
  AbsoluteFill,
  AnimatedImage,

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
import { wipe } from '@remotion/transitions/wipe';
import { Audio } from '@remotion/media';
import { loadFont as loadBangers } from '@remotion/google-fonts/Bangers';
import { loadFont as loadSora } from '@remotion/google-fonts/Sora';
import { createSeededRandom } from '../../lib/remotion/utils/seededRandom';

const { fontFamily: bangers } = loadBangers('normal', {
  weights: ['400'],
  subsets: ['latin'],
});
const { fontFamily: sora } = loadSora('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
});

/* ─── Colors ─── */
const C = {
  bg: '#0f0f23',
  lime: '#BFFF00',
  pink: '#FF1493',
  cyan: '#00FFFF',
  purple: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
  // Wordle palette
  wordleGreen: '#6aaa64',
  wordleYellow: '#c9b458',
  wordleDark: '#3a3a3c',
  wordleBg: '#121213',
  wordleBorder: '#565758',
} as const;

const center: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

/* ─── Wordle tile data ─── */
const WORDLE_ROWS = [
  // Row 1: guessed wrong
  [
    { letter: 'S', state: 'absent' },
    { letter: 'T', state: 'absent' },
    { letter: 'A', state: 'present' },
    { letter: 'R', state: 'absent' },
    { letter: 'E', state: 'absent' },
  ],
  // Row 2: getting warmer
  [
    { letter: 'C', state: 'correct' },
    { letter: 'H', state: 'absent' },
    { letter: 'A', state: 'correct' },
    { letter: 'I', state: 'absent' },
    { letter: 'N', state: 'absent' },
  ],
  // Row 3: solved — CLASH
  [
    { letter: 'C', state: 'correct' },
    { letter: 'L', state: 'correct' },
    { letter: 'A', state: 'correct' },
    { letter: 'S', state: 'correct' },
    { letter: 'H', state: 'correct' },
  ],
];

const TILE_SIZE = 108;
const TILE_GAP = 10;

const tileColor = (state: string) => {
  if (state === 'correct') return C.wordleGreen;
  if (state === 'present') return C.wordleYellow;
  return C.wordleDark;
};

/* ─── Shatter fragment precomputation ─── */
const rng = createSeededRandom(42);
const SHATTER_FRAGMENTS = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  x: (rng() - 0.5) * 1200,
  y: (rng() - 0.5) * 1600,
  rotation: (rng() - 0.5) * 720,
  startX: (rng() - 0.5) * 500,
  startY: (rng() - 0.5) * 400,
  size: 30 + rng() * 80,
  color: [C.wordleGreen, C.wordleYellow, C.wordleDark, C.lime][
    Math.floor(rng() * 4)
  ],
}));

// ==============================
// SCENE 1: WORDLE — familiar comfort zone
// ==============================

const WordleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "Daily Puzzle" header fade
  const headerO = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // "Wordle" title
  const titleIn = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.wordleBg }}>
      <div style={center}>
        {/* Header */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 28,
            fontWeight: 500,
            color: `${C.white}88`,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: headerO,
            marginBottom: 16,
          }}
        >
          Daily Puzzle #1,247
        </div>

        {/* Wordle-style title */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 64,
            fontWeight: 800,
            color: C.white,
            letterSpacing: '0.04em',
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [20, 0])}px)`,
            marginBottom: 50,
          }}
        >
          Wordle
        </div>

        {/* Wordle Grid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: TILE_GAP,
            alignItems: 'center',
          }}
        >
          {WORDLE_ROWS.map((row, rowIdx) => {
            const rowDelay = 15 + rowIdx * 25;

            return (
              <div
                key={rowIdx}
                style={{ display: 'flex', gap: TILE_GAP }}
              >
                {row.map((tile, colIdx) => {
                  const tileDelay = rowDelay + colIdx * 5;
                  // Flip animation: tile appears face down then flips to reveal color
                  const flipProgress = interpolate(
                    frame,
                    [tileDelay, tileDelay + 10],
                    [0, 1],
                    {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                      easing: Easing.out(Easing.quad),
                    }
                  );
                  const scaleY = interpolate(
                    flipProgress,
                    [0, 0.5, 1],
                    [1, 0, 1]
                  );
                  const showColor = flipProgress > 0.5;
                  const bgColor = showColor
                    ? tileColor(tile.state)
                    : 'transparent';
                  const borderColor = showColor
                    ? tileColor(tile.state)
                    : C.wordleBorder;
                  const letterO = flipProgress > 0.5 ? 1 : flipProgress > 0 ? 0.6 : 0;

                  // Row 3 (CLASH) gets a celebratory bounce
                  const bounceScale =
                    rowIdx === 2 && flipProgress >= 1
                      ? 1 +
                        Math.sin(
                          Math.max(0, frame - (tileDelay + 12)) * 0.4
                        ) *
                          0.03 *
                          Math.max(
                            0,
                            1 - (frame - (tileDelay + 12)) / 30
                          )
                      : 1;

                  return (
                    <div
                      key={colIdx}
                      style={{
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        backgroundColor: bgColor,
                        border: `3px solid ${borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `scaleY(${scaleY}) scale(${bounceScale})`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: sora,
                          fontSize: 52,
                          fontWeight: 700,
                          color: C.white,
                          opacity: letterO,
                        }}
                      >
                        {tile.letter}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* "Nice!" text after CLASH is revealed */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 36,
            fontWeight: 700,
            color: C.wordleGreen,
            marginTop: 40,
            opacity: interpolate(frame, [95, 108], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `scale(${spring({ frame: frame - 95, fps, config: { damping: 8, stiffness: 100 } })})`,
          }}
        >
          Genius! 3/6 🎉
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 2: SHATTER — "Is that ALL?"
// ==============================

const ShatterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Text slam entrance
  const textSlam = spring({
    frame: frame - 5,
    fps,
    config: { damping: 6, stiffness: 60 },
  });
  const textScale = interpolate(textSlam, [0, 1], [3, 1]);

  // Flash on impact
  const flashO = interpolate(frame, [8, 12, 22], [0, 0.8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Crack lines spreading
  const crackProgress = interpolate(frame, [10, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.exp),
  });

  // Fragments exploding outward
  const explodeProgress = interpolate(frame, [30, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  // Subtitle
  const subO = interpolate(frame, [40, 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Screen shake
  const shakeX =
    frame > 8 && frame < 30
      ? Math.sin(frame * 3.7) * (6 - (frame - 8) * 0.25)
      : 0;
  const shakeY =
    frame > 8 && frame < 30
      ? Math.cos(frame * 4.3) * (4 - (frame - 8) * 0.15)
      : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.bg,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.pink}20 0%, transparent 55%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* Flash burst */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 45%, ${C.white}FF 0%, transparent 40%)`,
          opacity: flashO,
          zIndex: 20,
        }}
      />

      {/* Wordle tiles shattering — the familiar grid breaking apart */}
      {crackProgress > 0 &&
        WORDLE_ROWS[2].map((tile, i) => {
          const fragRng = createSeededRandom(100 + i);
          const dx = (fragRng() - 0.5) * 800 * crackProgress;
          const dy = (fragRng() - 0.5) * 1200 * crackProgress;
          const rot = (fragRng() - 0.5) * 540 * crackProgress;
          const fragO = interpolate(crackProgress, [0, 0.2, 0.8], [0, 1, 0], {
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={`wordle-frag-${i}`}
              style={{
                position: 'absolute',
                left: '50%',
                top: '45%',
                width: 90,
                height: 90,
                backgroundColor: C.wordleGreen,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `translate(${-225 + i * 100 + dx}px, ${dy}px) rotate(${rot}deg)`,
                opacity: fragO,
                zIndex: 6,
              }}
            >
              <span
                style={{
                  fontFamily: sora,
                  fontSize: 44,
                  fontWeight: 700,
                  color: C.white,
                }}
              >
                {tile.letter}
              </span>
            </div>
          );
        })}

      {/* Shatter fragments */}
      {SHATTER_FRAGMENTS.map((f) => {
        const fragO = interpolate(
          explodeProgress,
          [0, 0.3, 1],
          [0, 1, 0]
        );
        return (
          <div
            key={f.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: f.size,
              height: f.size,
              backgroundColor: f.color,
              border: `2px solid ${C.white}33`,
              transform: `translate(${f.startX + f.x * explodeProgress}px, ${f.startY + f.y * explodeProgress}px) rotate(${f.rotation * explodeProgress}deg)`,
              opacity: fragO,
              zIndex: 3,
            }}
          />
        );
      })}

      <div style={center}>
        {/* Main text */}
        <div
          style={{
            transform: `scale(${textScale})`,
            opacity: textSlam,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: bangers,
              fontSize: 100,
              color: C.lime,
              textAlign: 'center',
              letterSpacing: '0.06em',
              textShadow: `0 0 40px ${C.lime}66, 0 0 80px ${C.lime}22`,
              lineHeight: 1.1,
            }}
          >
            IS THAT
          </div>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 150,
              color: C.pink,
              textAlign: 'center',
              letterSpacing: '0.08em',
              textShadow: `0 0 50px ${C.pink}66, 0 0 100px ${C.pink}22`,
              lineHeight: 1,
            }}
          >
            ALL?
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 32,
            fontWeight: 600,
            color: `${C.white}CC`,
            marginTop: 40,
            opacity: subO,
            letterSpacing: '0.04em',
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          One word. One guess. That&apos;s it?
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 3: GRID REVEAL — LexiClash grid materializes
// ==============================

const LEXI_GRID = [
  ['C', 'R', 'A', 'S', 'H'],
  ['L', 'E', 'X', 'I', 'T'],
  ['U', 'N', 'B', 'O', 'W'],
  ['S', 'H', 'A', 'R', 'K'],
  ['T', 'O', 'P', 'A', 'Z'],
];

const FOUND_WORDS = [
  { word: 'CLASH', pts: 250, color: C.pink, delay: 30 },
  { word: 'LEXICON', pts: 480, color: C.lime, delay: 44 },
  { word: 'SHARK', pts: 320, color: C.cyan, delay: 58 },
  { word: 'TOPAZ', pts: 280, color: C.purple, delay: 70 },
];

const GridRevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title entrance
  const titleIn = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Grid entrance — tiles cascade in
  const gridIn = spring({
    frame: frame - 8,
    fps,
    config: { damping: 10, stiffness: 70 },
  });
  const gridO = interpolate(frame, [8, 22], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Floating animation
  const floatY = Math.sin(frame * 0.06) * 6;

  // Running score counter
  const totalScore = interpolate(frame, [35, 90], [0, 1330], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.lime}12 0%, transparent 55%)`,
          filter: 'blur(50px)',
        }}
      />

      <div style={center}>
        {/* Title */}
        <div
          style={{
            transform: `scale(${titleIn})`,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: bangers,
              fontSize: 72,
              color: C.lime,
              letterSpacing: '0.14em',
              textShadow: `0 0 25px ${C.lime}44`,
              textAlign: 'center',
            }}
          >
            WORD HUNT
          </div>
        </div>

        <div
          style={{
            fontFamily: sora,
            fontSize: 26,
            fontWeight: 600,
            color: `${C.white}AA`,
            letterSpacing: '0.15em',
            marginBottom: 28,
            opacity: titleIn,
          }}
        >
          FIND THEM ALL
        </div>

        {/* 5×5 Grid */}
        <div
          style={{
            transform: `translateY(${floatY}px) scale(${gridIn})`,
            opacity: gridO,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: TILE_GAP,
            }}
          >
            {LEXI_GRID.map((row, ri) =>
              (
                <div key={ri} style={{ display: 'flex', gap: TILE_GAP }}>
                  {row.map((letter, ci) => {
                    const tileDelay = 12 + ri * 4 + ci * 2;
                    const tileIn = spring({
                      frame: frame - tileDelay,
                      fps,
                      config: { damping: 12, stiffness: 120 },
                    });
                    // Highlight tiles that are part of found words
                    const isHighlighted =
                      (ri === 0 && frame > 30) || // CLASH row
                      (ri === 3 && frame > 58); // SHARK row
                    const tileBg = isHighlighted
                      ? C.wordleGreen
                      : C.wordleDark;

                    return (
                      <div
                        key={ci}
                        style={{
                          width: 90,
                          height: 90,
                          backgroundColor: tileBg,
                          border: `2px solid ${C.wordleBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: `scale(${tileIn})`,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: sora,
                            fontSize: 44,
                            fontWeight: 700,
                            color: C.white,
                            opacity: tileIn,
                          }}
                        >
                          {letter}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Found words sliding in */}
        <div
          style={{
            width: 700,
            marginTop: 20,
            padding: '0 16px',
          }}
        >
          {FOUND_WORDS.map((w) => {
            const s = spring({
              frame: frame - w.delay,
              fps,
              config: { damping: 14, stiffness: 160 },
            });
            const x = interpolate(s, [0, 1], [600, 0]);
            const o = interpolate(frame - w.delay, [0, 8], [0, 1], {
              extrapolateRight: 'clamp',
            });
            const scorePop = spring({
              frame: frame - w.delay - 5,
              fps,
              config: { damping: 6, stiffness: 100 },
            });

            return (
              <div
                key={w.word}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 22px',
                  marginBottom: 7,
                  background: `${w.color}10`,
                  border: `2px solid ${w.color}55`,
                  borderRadius: 10,
                  transform: `translateX(${x}px)`,
                  opacity: o,
                }}
              >
                <span
                  style={{
                    fontFamily: bangers,
                    fontSize: 34,
                    color: w.color,
                    letterSpacing: '0.08em',
                  }}
                >
                  {w.word}
                </span>
                <span
                  style={{
                    fontFamily: sora,
                    fontSize: 26,
                    fontWeight: 700,
                    color: C.white,
                    transform: `scale(${scorePop})`,
                    display: 'inline-block',
                  }}
                >
                  +{w.pts}
                </span>
              </div>
            );
          })}
        </div>

        {/* Running total */}
        <div
          style={{
            fontFamily: bangers,
            fontSize: 48,
            color: C.lime,
            marginTop: 16,
            textShadow: `0 0 20px ${C.lime}44`,
            opacity: interpolate(frame, [35, 45], [0, 1], {
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {Math.round(totalScore).toLocaleString()} pts
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 4: BORED MASCOT — "Wordle gives you ONE word"
// ==============================

const BoredScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mascotIn = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 70 },
  });

  const line1O = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const xO = interpolate(frame, [30, 36], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const line3In = spring({
    frame: frame - 50,
    fps,
    config: { damping: 6, stiffness: 60 },
  });

  // Pulsing "UNLIMITED" glow
  const glowSize = 20 + Math.sin(frame * 0.2) * 10;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.purple}15 0%, transparent 55%)`,
          filter: 'blur(60px)',
        }}
      />

      <div style={center}>
        {/* Bored mascot */}
        <div
          style={{
            transform: `scale(${mascotIn})`,
            opacity: mascotIn,
            marginBottom: 40,
          }}
        >
          <AnimatedImage
            src={staticFile('mascot/bored-nobg.gif')}
            width={260}
            height={260}
            fit="contain"
            loopBehavior="loop"
          />
        </div>

        {/* "Wordle gives you" */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 38,
            fontWeight: 600,
            color: `${C.white}CC`,
            opacity: line1O,
            textAlign: 'center',
          }}
        >
          Wordle gives you
        </div>

        {/* "ONE word per day" with strikethrough */}
        <div
          style={{
            fontFamily: bangers,
            fontSize: 90,
            color: C.wordleGreen,
            textAlign: 'center',
            lineHeight: 1.1,
            marginTop: 8,
            opacity: line1O,
            position: 'relative',
          }}
        >
          ONE word
          {/* Red X strikethrough */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${xO})`,
              fontFamily: bangers,
              fontSize: 180,
              color: '#FF3366',
              opacity: xO * 0.7,
              lineHeight: 1,
              textShadow: '0 0 30px #FF336644',
            }}
          >
            ✕
          </div>
        </div>

        <div
          style={{
            fontFamily: sora,
            fontSize: 30,
            fontWeight: 500,
            color: `${C.white}88`,
            opacity: line1O,
            marginTop: 4,
          }}
        >
          per day.
        </div>

        {/* "We give you UNLIMITED" */}
        <div
          style={{
            marginTop: 50,
            transform: `scale(${line3In})`,
            opacity: line3In,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: sora,
              fontSize: 38,
              fontWeight: 600,
              color: `${C.white}CC`,
            }}
          >
            We give you
          </div>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 110,
              color: C.lime,
              letterSpacing: '0.06em',
              textShadow: `0 0 ${glowSize}px ${C.lime}66, 0 0 ${glowSize * 2}px ${C.lime}22`,
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            UNLIMITED
          </div>
          <div
            style={{
              fontFamily: sora,
              fontSize: 30,
              fontWeight: 500,
              color: `${C.white}88`,
              marginTop: 4,
            }}
          >
            words. Right now.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 5: MULTIPLAYER — "This is WAR"
// ==============================

/* Mini Wordle-style grid for battle scene */
const MINI_GRID_P1 = [
  [{ l: 'W', s: 'correct' }, { l: 'O', s: 'correct' }, { l: 'R', s: 'correct' }, { l: 'D', s: 'correct' }],
  [{ l: 'G', s: 'absent' }, { l: 'A', s: 'present' }, { l: 'M', s: 'absent' }, { l: 'E', s: 'absent' }],
  [{ l: 'S', s: 'absent' }, { l: 'P', s: 'absent' }, { l: 'A', s: 'correct' }, { l: 'C', s: 'absent' }],
  [{ l: 'E', s: 'absent' }, { l: 'T', s: 'absent' }, { l: 'I', s: 'absent' }, { l: 'L', s: 'present' }],
];
const MINI_GRID_P2 = [
  [{ l: 'H', s: 'absent' }, { l: 'U', s: 'present' }, { l: 'N', s: 'absent' }, { l: 'T', s: 'correct' }],
  [{ l: 'C', s: 'correct' }, { l: 'L', s: 'absent' }, { l: 'A', s: 'correct' }, { l: 'S', s: 'absent' }],
  [{ l: 'B', s: 'absent' }, { l: 'O', s: 'absent' }, { l: 'N', s: 'present' }, { l: 'D', s: 'absent' }],
  [{ l: 'F', s: 'absent' }, { l: 'I', s: 'absent' }, { l: 'R', s: 'absent' }, { l: 'E', s: 'present' }],
];

const miniTileColor = (s: string) => {
  if (s === 'correct') return C.wordleGreen;
  if (s === 'present') return C.wordleYellow;
  return C.wordleDark;
};

const MiniWordleGrid: React.FC<{
  grid: { l: string; s: string }[][];
  opacity: number;
}> = ({ grid, opacity }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      marginTop: 10,
      opacity,
    }}
  >
    {grid.map((row, ri) => (
      <div key={ri} style={{ display: 'flex', gap: 3 }}>
        {row.map((tile, ci) => (
          <div
            key={ci}
            style={{
              width: 46,
              height: 46,
              backgroundColor: miniTileColor(tile.s),
              border: `1px solid ${C.wordleBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: sora,
                fontSize: 22,
                fontWeight: 700,
                color: C.white,
              }}
            >
              {tile.l}
            </span>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const BattleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s1 = Math.min(Math.floor(frame * 24), 1580);
  const s2 = Math.min(Math.floor(frame * 18), 1120);

  // Header
  const headerIn = spring({ frame, fps, config: { damping: 14 } });

  // VS badge
  const vsIn = spring({
    frame: frame - 10,
    fps,
    config: { damping: 6, stiffness: 55 },
  });
  const vsPulse = 1 + Math.sin(frame * 0.15) * 0.025;

  // Bottom text
  const bottomO = interpolate(frame, [55, 70], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const p1SlideIn = spring({ frame, fps, config: { damping: 14 } });
  const p2SlideIn = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          background: `radial-gradient(circle, ${C.pink}15 0%, transparent 55%)`,
          filter: 'blur(50px)',
        }}
      />

      <div style={center}>
        {/* "Wordle is solo" crossed out */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 34,
            fontWeight: 500,
            color: `${C.white}66`,
            textDecoration: 'line-through',
            opacity: headerIn,
            marginBottom: 8,
          }}
        >
          Wordle is solo
        </div>

        <div
          style={{
            fontFamily: bangers,
            fontSize: 80,
            color: C.pink,
            letterSpacing: '0.1em',
            textShadow: `0 0 25px ${C.pink}44`,
            opacity: headerIn,
            marginBottom: 30,
          }}
        >
          THIS IS WAR
        </div>

        {/* Players */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0 30px',
          }}
        >
          {/* Player 1 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: `translateX(${interpolate(p1SlideIn, [0, 1], [-300, 0])}px)`,
            }}
          >
            <AnimatedImage
              src={staticFile('mascot/flexing.gif')}
              width={130}
              height={130}
              fit="contain"
              loopBehavior="loop"
            />
            <div
              style={{
                marginTop: 10,
                padding: '6px 20px',
                background: `${C.lime}12`,
                border: `2px solid ${C.lime}44`,
                borderRadius: 999,
                fontFamily: sora,
                fontSize: 20,
                fontWeight: 600,
                color: C.lime,
              }}
            >
              WordNinja99
            </div>
            <div
              style={{
                fontFamily: bangers,
                fontSize: 72,
                color: C.white,
                textShadow: `0 0 20px ${C.lime}44`,
                lineHeight: 1,
                marginTop: 8,
              }}
            >
              {s1}
            </div>
            <MiniWordleGrid grid={MINI_GRID_P1} opacity={0.85} />
          </div>

          {/* VS Badge */}
          <div
            style={{
              transform: `scale(${vsIn * vsPulse})`,
              padding: '16px 28px',
              background: `linear-gradient(135deg, ${C.pink}, ${C.purple})`,
              border: `3px solid ${C.black}`,
              borderRadius: 14,
              boxShadow: `4px 4px 0px ${C.black}`,
              margin: '0 6px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontFamily: bangers,
                fontSize: 56,
                color: C.white,
                lineHeight: 1,
              }}
            >
              VS
            </div>
          </div>

          {/* Player 2 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: `translateX(${interpolate(p2SlideIn, [0, 1], [300, 0])}px)`,
            }}
          >
            <AnimatedImage
              src={staticFile('mascot/onfire-nobg.gif')}
              width={130}
              height={130}
              fit="contain"
              loopBehavior="loop"
            />
            <div
              style={{
                marginTop: 10,
                padding: '6px 20px',
                background: `${C.cyan}12`,
                border: `2px solid ${C.cyan}44`,
                borderRadius: 999,
                fontFamily: sora,
                fontSize: 20,
                fontWeight: 600,
                color: C.cyan,
              }}
            >
              VocabQueen
            </div>
            <div
              style={{
                fontFamily: bangers,
                fontSize: 72,
                color: C.white,
                textShadow: `0 0 20px ${C.cyan}44`,
                lineHeight: 1,
                marginTop: 8,
              }}
            >
              {s2}
            </div>
            <MiniWordleGrid grid={MINI_GRID_P2} opacity={0.85} />
          </div>
        </div>

        {/* Bottom hook */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 30,
            fontWeight: 700,
            color: C.white,
            marginTop: 35,
            opacity: bottomO,
            letterSpacing: '0.04em',
            textShadow: `0 0 15px ${C.pink}33`,
            textAlign: 'center',
          }}
        >
          Real-time. Real opponents.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 6: CTA — mascot + lexiclash.live
// ==============================

const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({
    frame,
    fps,
    config: { damping: 5, stiffness: 40 },
  });
  const tagIn = spring({
    frame: frame - 10,
    fps,
    config: { damping: 8, stiffness: 60 },
  });
  const btnIn = spring({
    frame: frame - 18,
    fps,
    config: { damping: 7, stiffness: 55 },
  });
  const btnPulse = 1 + Math.sin(frame * 0.35) * 0.02;
  const shimmerX = interpolate(frame, [25, 60], [-130, 230], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  const urlO = interpolate(frame, [24, 38], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const glowSize = 35 + Math.sin(frame * 0.2) * 12;
  const mIn = spring({
    frame: frame - 8,
    fps,
    config: { damping: 10, stiffness: 65 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 500,
          background: `radial-gradient(ellipse, ${C.lime}10 0%, transparent 55%)`,
          filter: 'blur(60px)',
        }}
      />

      <div style={center}>
        {/* Mascot — celebration */}
        <div
          style={{
            transform: `scale(${mIn})`,
            opacity: mIn,
            marginBottom: 20,
          }}
        >
          <AnimatedImage
            src={staticFile('mascot/celebration.gif')}
            width={280}
            height={280}
            fit="contain"
            loopBehavior="loop"
          />
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: sora,
            fontSize: 32,
            fontWeight: 600,
            color: `${C.white}CC`,
            textAlign: 'center',
            opacity: tagIn,
            transform: `translateY(${interpolate(tagIn, [0, 1], [15, 0])}px)`,
            marginBottom: 24,
            maxWidth: 700,
            lineHeight: 1.3,
          }}
        >
          Your vocabulary is wasted
          <br />
          on 5 letters.
        </div>

        {/* Logo */}
        <div style={{ transform: `scale(${logoIn})` }}>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 110,
              color: C.lime,
              letterSpacing: '0.16em',
              textShadow: `0 0 ${glowSize}px ${C.lime}66, 0 0 ${glowSize * 2}px ${C.lime}22`,
              textAlign: 'center',
              lineHeight: 1,
            }}
          >
            LEXICLASH
          </div>
        </div>

        <div style={{ height: 35 }} />

        {/* CTA Button */}
        <div
          style={{
            transform: `scale(${btnIn * btnPulse})`,
            padding: '26px 75px',
            background: `linear-gradient(135deg, ${C.pink}, ${C.purple})`,
            border: `3px solid ${C.black}`,
            borderRadius: 12,
            boxShadow: `5px 5px 0px ${C.black}`,
            fontFamily: bangers,
            fontSize: 48,
            color: C.white,
            letterSpacing: '0.08em',
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
            fontSize: 30,
            fontWeight: 600,
            color: C.lime,
            opacity: urlO,
            marginTop: 24,
            letterSpacing: '0.05em',
            textShadow: `0 0 12px ${C.lime}33`,
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

const T = 12; // transition duration in frames

// Scene durations (total with overlap: ~540 frames = 18s at 30fps)
const SCENE_DURATIONS = {
  wordle: 130,    // ~4.3s — let the Wordle play out
  shatter: 85,    // ~2.8s — destruction moment
  gridReveal: 120, // ~4s — showcase gameplay
  bored: 105,     // ~3.5s — comparison hook
  battle: 95,     // ~3.2s — multiplayer tease
  cta: 75,        // ~2.5s — call to action
};

const TOTAL_FRAMES = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) - T * 5;
// 610 - 60 = 550 frames ≈ 18.3s

export const WordleToLexiClashPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Background music */}
      <Audio
        src={staticFile('music/bossa-arcade.mp3')}
        volume={(f) => {
          const fadeInEnd = 30;
          const fadeOutStart = TOTAL_FRAMES - 45;
          if (f < fadeInEnd) {
            return interpolate(f, [0, fadeInEnd], [0, 0.65], {
              extrapolateRight: 'clamp',
            });
          }
          if (f > fadeOutStart) {
            return interpolate(f, [fadeOutStart, TOTAL_FRAMES], [0.65, 0], {
              extrapolateRight: 'clamp',
            });
          }
          return 0.65;
        }}
        loop
      />

      <TransitionSeries>
        {/* Scene 1: Wordle — comfort zone */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.wordle}
        >
          <WordleScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 2: Shatter — break the comfort */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.shatter}
        >
          <ShatterScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-left' })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 3: Grid Reveal — the upgrade */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.gridReveal}
        >
          <GridRevealScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 4: Bored mascot — ONE vs UNLIMITED */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.bored}
        >
          <BoredScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 5: Multiplayer battle */}
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.battle}
        >
          <BattleScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* Scene 6: CTA */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.cta}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

WordleToLexiClashPromo.displayName = 'WordleToLexiClashPromo';
