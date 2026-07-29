/**
 * SurvivalPromoVideoHe — Hebrew Instagram Reel (1080×1920, 9:16, 30fps, ~18s)
 *
 * Hebrew RTL version of the Survival promo video.
 * Same structure, Hebrew text, RTL slide directions.
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
import { Audio } from '@remotion/media';
import { loadFont as loadBangers } from '@remotion/google-fonts/Bangers';
import { loadFont as loadHeebo } from '@remotion/google-fonts/Heebo';
import { createSeededRandom } from '../../lib/remotion/utils/seededRandom';

const { fontFamily: bangers } = loadBangers('normal', {
  weights: ['400'],
  subsets: ['latin'],
});
const { fontFamily: heebo } = loadHeebo('normal', {
  weights: ['400', '500', '600', '700', '800', '900'],
  subsets: ['hebrew'],
});

/* ─── Colors ─── */
const C = {
  bg: '#0a0a1a',
  bgWarm: '#0f0a18',
  lime: '#BFFF00',
  pink: '#FF1493',
  cyan: '#00FFFF',
  purple: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
  red: '#FF3366',
  orange: '#FF8C00',
  healthGreen: '#4ADE80',
  healthYellow: '#FACC15',
  healthRed: '#EF4444',
  // Wordle
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

/* ─── Health bar component ─── */
const HealthBar: React.FC<{
  percent: number;
  width: number;
  height: number;
  showPulse?: boolean;
}> = ({ percent, width, height, showPulse }) => {
  const barColor =
    percent > 66
      ? C.healthGreen
      : percent > 33
        ? C.healthYellow
        : C.healthRed;
  const pulseOpacity = showPulse ? 0.6 : 0;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: `${C.white}10`,
        border: `3px solid ${C.black}`,
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: `4px 4px 0px ${C.black}`,
      }}
    >
      {/* Health fill */}
      <div
        style={{
          width: `${percent}%`,
          height: '100%',
          backgroundColor: barColor,
          borderRadius: 3,
          transition: 'none',
        }}
      />
      {/* Danger pulse overlay */}
      {showPulse && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: C.healthRed,
            opacity: pulseOpacity,
            borderRadius: 3,
          }}
        />
      )}
      {/* Segment markers */}
      {[25, 50, 75].map((mark) => (
        <div
          key={mark}
          style={{
            position: 'absolute',
            left: `${mark}%`,
            top: 0,
            width: 2,
            height: '100%',
            backgroundColor: `${C.black}44`,
          }}
        />
      ))}
    </div>
  );
};

/* ─── Wordle-style clue tile ─── */
const ClueTile: React.FC<{
  letter: string;
  state: 'correct' | 'present' | 'absent' | 'empty';
  size: number;
  revealed: boolean;
}> = ({ letter, state, size, revealed }) => {
  const bgColor = !revealed
    ? 'transparent'
    : state === 'correct'
      ? C.wordleGreen
      : state === 'present'
        ? C.wordleYellow
        : state === 'absent'
          ? C.wordleDark
          : 'transparent';
  const borderColor = revealed && state !== 'empty' ? bgColor : C.wordleBorder;

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        border: `3px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: heebo,
          fontSize: size * 0.55,
          fontWeight: 700,
          color: C.white,
          opacity: letter ? 1 : 0,
        }}
      >
        {letter}
      </span>
    </div>
  );
};


/* ─── Pre-computed drip particles ─── */
const rng = createSeededRandom(77);
const DRIP_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: (rng() - 0.5) * 200,
  y: rng() * 300 + 50,
  size: 6 + rng() * 10,
  delay: rng() * 15,
}));

// ==============================
// SCENE 1: WORDLE — boring single row
// ==============================

const WordleBoringScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleO = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Type letters one by one
  const typedLetters = Math.min(
    5,
    Math.floor(interpolate(frame, [20, 55], [0, 5], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }))
  );

  // Reveal colors after all typed
  const revealStart = 62;
  const revealProgress = interpolate(frame, [revealStart, revealStart + 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const guess = 'SHARE';
  const feedback: ('correct' | 'present' | 'absent')[] = [
    'correct', 'correct', 'correct', 'present', 'absent',
  ];

  // Yawn emoji / boring indicator
  const yawnO = interpolate(frame, [92, 105], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const yawnScale = spring({
    frame: frame - 92,
    fps,
    config: { damping: 8, stiffness: 80 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.wordleBg }}>
      <div style={center}>
        {/* Daily puzzle header */}
        <div
          style={{
            fontFamily: heebo,
            fontSize: 26,
            fontWeight: 500,
            color: `${C.white}77`,
            letterSpacing: '0.2em',
            opacity: titleO,
            marginBottom: 12,
            direction: 'rtl',
          }}
        >
          חידה יומית
        </div>

        <div
          style={{
            fontFamily: heebo,
            fontSize: 58,
            fontWeight: 800,
            color: C.white,
            opacity: titleO,
            marginBottom: 50,
          }}
        >
          Wordle
        </div>

        {/* Single row — THE Wordle experience */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const letter = i < typedLetters ? guess[i] : '';
            const revealIdx = i / 5;
            const isRevealed = revealProgress > revealIdx;
            const flipY = isRevealed
              ? 1
              : interpolate(
                  revealProgress,
                  [revealIdx, revealIdx + 0.1],
                  [1, 0],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                );

            return (
              <div
                key={`tile-${i}`}
                style={{
                  transform: `scaleY(${Math.abs(flipY) < 0.01 ? 0.01 : flipY})`,
                }}
              >
                <ClueTile
                  letter={letter}
                  state={isRevealed ? feedback[i] : 'empty'}
                  size={100}
                  revealed={isRevealed}
                />
              </div>
            );
          })}
        </div>

        {/* Empty rows below — showing how Wordle looks */}
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 10,
              opacity: interpolate(frame, [5, 20], [0, 0.3], {
                extrapolateRight: 'clamp',
              }),
            }}
          >
            {[0, 1, 2, 3, 4].map((col) => (
              <div
                key={col}
                style={{
                  width: 100,
                  height: 100,
                  border: `2px solid ${C.wordleBorder}`,
                }}
              />
            ))}
          </div>
        ))}

        {/* "That's it?" + yawn */}
        <div
          style={{
            marginTop: 50,
            opacity: yawnO,
            transform: `scale(${yawnScale})`,
            textAlign: 'center',
            direction: 'rtl',
          }}
        >
          <div
            style={{
              fontFamily: heebo,
              fontSize: 36,
              fontWeight: 700,
              color: `${C.white}AA`,
            }}
          >
            😴 ?ניחוש אחד... ואז מחכים 24 שעות
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 2: TRANSFORM — simple, clean reveal
// ==============================

const TransformScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "What if..." text — let it breathe for 2+ seconds
  const textIn = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, stiffness: 70 },
  });

  // Clue row fades in after text has been read
  const rowIn = spring({
    frame: frame - 50,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  // "SURVIVAL MODE" slams in late
  const survivalIn = spring({
    frame: frame - 80,
    fps,
    config: { damping: 6, stiffness: 50 },
  });
  const survivalScale = interpolate(survivalIn, [0, 1], [2.5, 1]);

  // Flash on survival reveal
  const flashO = interpolate(frame, [80, 83, 92], [0, 0.5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Mascot reacts
  const mascotIn = spring({
    frame: frame - 85,
    fps,
    config: { damping: 10, stiffness: 65 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bgWarm }}>
      {/* Warm glow */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.orange}15 0%, transparent 55%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* Flash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 45%, ${C.orange}CC 0%, transparent 45%)`,
          opacity: flashO,
          zIndex: 20,
        }}
      />

      <div style={center}>
        {/* "What if..." — big, centered, readable */}
        <div
          style={{
            fontFamily: heebo,
            fontSize: 46,
            fontWeight: 600,
            color: `${C.white}DD`,
            textAlign: 'center',
            opacity: textIn,
            transform: `translateY(${interpolate(textIn, [0, 1], [20, 0])}px)`,
            marginBottom: 50,
            lineHeight: 1.4,
            zIndex: 10,
            direction: 'rtl',
          }}
        >
          מה אם הניחוש
          <br />
          הוא רק{' '}
          <span style={{ color: C.orange, fontSize: 54, fontWeight: 700 }}>
            ?ההתחלה
          </span>
        </div>

        {/* Clue row appears — simple, no sliding */}
        <div
          style={{
            opacity: rowIn,
            transform: `scale(${rowIn})`,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: heebo,
              fontSize: 18,
              fontWeight: 600,
              color: `${C.white}66`,
              letterSpacing: '0.15em',
              marginBottom: 10,
              textAlign: 'center',
              direction: 'rtl',
            }}
          >
            מילת המטרה
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['S', 'H', '?', '?', '?'].map((letter, i) => (
              <ClueTile
                key={`tile-${i}-${letter}`}
                letter={letter}
                state={i < 2 ? 'correct' : 'empty'}
                size={90}
                revealed={i < 2}
              />
            ))}
          </div>
          <div
            style={{
              fontFamily: heebo,
              fontSize: 22,
              fontWeight: 500,
              color: `${C.white}88`,
              textAlign: 'center',
              marginTop: 16,
              direction: 'rtl',
            }}
          >
            .מצאו מילים בלוח כדי לקבל רמזים
          </div>
        </div>

        {/* SURVIVAL MODE title — the big reveal */}
        <div
          style={{
            fontFamily: heebo,
            fontSize: 80,
            fontWeight: 900,
            color: C.orange,
            letterSpacing: '0.1em',
            textShadow: `0 0 30px ${C.orange}66, 0 0 60px ${C.orange}22`,
            marginTop: 50,
            opacity: survivalIn,
            transform: `scale(${survivalScale})`,
            zIndex: 15,
            direction: 'rtl',
          }}
        >
          מצב הישרדות
        </div>

        {/* Mascot — mindblown */}
        <div
          style={{
            marginTop: 20,
            transform: `scale(${mascotIn})`,
            opacity: mascotIn,
          }}
        >
          <AnimatedImage
            src={staticFile('mascot/mindblown-nobg.gif')}
            width={200}
            height={200}
            fit="contain"
            loopBehavior="loop"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 3: GAMEPLAY — finding words, health draining
// ==============================

const GAMEPLAY_WORDS = [
  { word: 'STORM', pts: 180, delay: 20, color: C.lime },
  { word: 'SHALE', pts: 250, delay: 40, color: C.cyan },
  { word: 'ARCHER', pts: 380, delay: 60, color: C.pink },
];

const GameplayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Health drains smoothly
  const health = interpolate(frame, [0, 120], [88, 52], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Clue letters reveal as words are found
  const clueCount = frame > 65 ? 4 : frame > 40 ? 3 : 2;
  const clueLetters: { letter: string; state: 'correct' | 'present' | 'empty' }[] = [
    { letter: 'S', state: 'correct' },
    { letter: 'H', state: 'correct' },
    { letter: clueCount >= 3 ? 'A' : '?', state: clueCount >= 3 ? 'correct' : 'empty' },
    { letter: clueCount >= 4 ? 'R' : '?', state: clueCount >= 4 ? 'present' : 'empty' },
    { letter: '?', state: 'empty' },
  ];

  // Grid entrance
  const gridIn = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const GRID = [
    ['S', 'T', 'O', 'R', 'M'],
    ['H', 'A', 'R', 'K', 'S'],
    ['E', 'L', 'I', 'N', 'E'],
    ['A', 'R', 'C', 'H', 'W'],
    ['D', 'O', 'V', 'E', 'S'],
  ];

  // Highlight discovered word rows
  const highlightTiles = new Set<string>();
  if (frame > 25) {
    ['0-0', '0-1', '0-2', '0-3', '0-4'].forEach((k) => highlightTiles.add(k));
  }
  if (frame > 65) {
    ['3-0', '3-1', '3-2', '3-3', '3-4'].forEach((k) => highlightTiles.add(k));
  }

  return (
    <AbsoluteFill style={{ backgroundColor: C.bgWarm }}>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translate(-50%, 30%)',
          width: 1000,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.orange}10 0%, transparent 55%)`,
          filter: 'blur(60px)',
        }}
      />

      <div style={{ ...center, gap: 0 }}>
        {/* Health bar — clean, no avatar clutter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 28 }}>❤️</span>
          <HealthBar percent={health} width={500} height={26} />
          <span
            style={{
              fontFamily: heebo,
              fontSize: 22,
              fontWeight: 700,
              color: health > 60 ? C.healthGreen : C.healthYellow,
              minWidth: 50,
            }}
          >
            {Math.round(health)}%
          </span>
        </div>

        {/* Clue row */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: heebo,
              fontSize: 16,
              fontWeight: 600,
              color: `${C.white}55`,
              letterSpacing: '0.15em',
              marginBottom: 8,
              textAlign: 'center',
              direction: 'rtl',
            }}
          >
            מילת המטרה
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {clueLetters.map((cl, i) => {
              const revealFrame = i === 2 ? 45 : i === 3 ? 70 : 0;
              const justRevealed =
                revealFrame > 0 && frame > revealFrame && frame < revealFrame + 12;
              const glowO = justRevealed
                ? interpolate(frame - revealFrame, [0, 4, 12], [0, 0.8, 0], {
                    extrapolateRight: 'clamp',
                  })
                : 0;

              return (
                <div key={`clue-${i}-${cl.letter}`} style={{ position: 'relative' }}>
                  <ClueTile
                    letter={cl.letter}
                    state={cl.state}
                    size={80}
                    revealed={cl.state !== 'empty'}
                  />
                  {glowO > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: -5,
                        border: `3px solid ${C.wordleGreen}`,
                        opacity: glowO,
                        boxShadow: `0 0 16px ${C.wordleGreen}66`,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Word grid — centered, clean */}
        <div
          style={{
            transform: `scale(${gridIn})`,
            opacity: gridIn,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            {GRID.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 5 }}>
                {row.map((letter, ci) => {
                  const key = `${ri}-${ci}`;
                  const isHL = highlightTiles.has(key);
                  return (
                    <div
                      key={ci}
                      style={{
                        width: 82,
                        height: 82,
                        backgroundColor: isHL ? `${C.lime}28` : C.wordleDark,
                        border: `2px solid ${isHL ? `${C.lime}55` : C.wordleBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: heebo,
                          fontSize: 40,
                          fontWeight: 700,
                          color: isHL ? C.lime : C.white,
                        }}
                      >
                        {letter}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Found words — only 3, bigger, cleaner */}
        <div style={{ width: 520 }}>
          {GAMEPLAY_WORDS.map((w) => {
            const wIn = spring({
              frame: frame - w.delay,
              fps,
              config: { damping: 14, stiffness: 140 },
            });
            const x = interpolate(wIn, [0, 1], [-400, 0]);
            const o = interpolate(frame - w.delay, [0, 8], [0, 1], {
              extrapolateRight: 'clamp',
            });
            if (frame < w.delay) return null;

            return (
              <div
                key={w.word}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 22px',
                  marginBottom: 8,
                  background: `${w.color}10`,
                  border: `2px solid ${w.color}44`,
                  borderRadius: 8,
                  transform: `translateX(${x}px)`,
                  opacity: o,
                  direction: 'rtl',
                }}
              >
                <span
                  style={{
                    fontFamily: heebo,
                    fontSize: 26,
                    fontWeight: 700,
                    color: w.color,
                  }}
                >
                  {w.word}
                </span>
                <span
                  style={{
                    fontFamily: heebo,
                    fontSize: 24,
                    fontWeight: 700,
                    color: C.white,
                  }}
                >
                  +{w.pts}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 4: DANGER — health critical, dramatic guess
// ==============================

const DangerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Health drains to critical
  const health = interpolate(frame, [0, 60], [38, 12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Screen edge vignette intensifies
  const vignetteO = interpolate(frame, [0, 60], [0.2, 0.6], {
    extrapolateRight: 'clamp',
  });

  // Red pulse
  const pulseO =
    0.1 + Math.sin(frame * 0.3) * 0.08 * (1 - health / 40);

  // Heartbeat scale
  const heartScale = 1 + Math.sin(frame * 0.5) * 0.08;

  // Typing the guess letter by letter
  const guessWord = 'SHARK';
  const typedCount = Math.min(
    5,
    Math.floor(interpolate(frame, [30, 55], [0, 5], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }))
  );

  // Submit flash
  const submitFrame = 58;
  const submitFlash = interpolate(
    frame,
    [submitFrame, submitFrame + 3, submitFrame + 12],
    [0, 0.7, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Clue state before guess
  const clues: { letter: string; state: 'correct' | 'present' | 'empty' }[] = [
    { letter: 'S', state: 'correct' },
    { letter: 'H', state: 'correct' },
    { letter: 'A', state: 'correct' },
    { letter: 'R', state: 'present' },
    { letter: '?', state: 'empty' },
  ];

  // "Time is running out" text
  const urgencyO = interpolate(frame, [5, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const urgencyPulse = 0.8 + Math.sin(frame * 0.25) * 0.2;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bgWarm }}>
      {/* Red danger glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 100%, ${C.red}25 0%, transparent 60%)`,
          filter: 'blur(40px)',
        }}
      />

      {/* Red pulse overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: C.red,
          opacity: pulseO,
          zIndex: 2,
        }}
      />

      {/* Edge vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.8) 100%)',
          opacity: vignetteO,
          zIndex: 3,
        }}
      />

      {/* Submit flash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: C.wordleGreen,
          opacity: submitFlash,
          zIndex: 25,
        }}
      />

      <div style={{ ...center, zIndex: 10 }}>
        {/* Urgency text */}
        <div
          style={{
            fontFamily: heebo,
            fontSize: 52,
            fontWeight: 900,
            color: C.red,
            letterSpacing: '0.06em',
            textShadow: `0 0 20px ${C.red}66`,
            opacity: urgencyO * urgencyPulse,
            marginBottom: 20,
            direction: 'rtl',
          }}
        >
          ...⚠️ החיים נגמרים
        </div>

        {/* Health bar — critical */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 30,
          }}
        >
          <span
            style={{
              fontSize: 36,
              transform: `scale(${heartScale})`,
              display: 'inline-block',
            }}
          >
            💔
          </span>
          <HealthBar
            percent={health}
            width={550}
            height={30}
            showPulse
          />
          <span
            style={{
              fontFamily: heebo,
              fontSize: 24,
              fontWeight: 800,
              color: C.healthRed,
            }}
          >
            {Math.round(health)}%
          </span>
        </div>

        {/* Drip particles falling from health bar */}
        {DRIP_PARTICLES.map((p) => {
          const pProgress = interpolate(
            frame - p.delay,
            [0, 40],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                top: '28%',
                left: `${50 + (p.x / 1080) * 100}%`,
                width: p.size,
                height: p.size * 1.3,
                backgroundColor: C.healthRed,
                borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%',
                transform: `translateY(${p.y * pProgress}px)`,
                opacity: interpolate(pProgress, [0, 0.2, 0.8, 1], [0, 0.7, 0.5, 0]),
              }}
            />
          );
        })}

        {/* Clue row with accumulated knowledge */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontFamily: heebo,
              fontSize: 16,
              fontWeight: 600,
              color: `${C.white}55`,
              letterSpacing: '0.12em',
              textAlign: 'center',
              marginBottom: 6,
              direction: 'rtl',
            }}
          >
            ...אתם יודעים 4/5 אותיות
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {clues.map((cl, i) => (
              <ClueTile
                key={`clue-${i}-${cl.letter}`}
                letter={cl.letter}
                state={cl.state}
                size={86}
                revealed={cl.state !== 'empty'}
              />
            ))}
          </div>
        </div>

        {/* Guess attempt row */}
        <div
          style={{
            marginTop: 16,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontFamily: heebo,
              fontSize: 16,
              fontWeight: 600,
              color: C.orange,
              letterSpacing: '0.12em',
              textAlign: 'center',
              marginBottom: 6,
              direction: 'rtl',
            }}
          >
            הניחוש שלכם
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const letter = i < typedCount ? guessWord[i] : '';
              const typeScale =
                i === typedCount - 1 && frame > 30
                  ? spring({
                      frame: frame - (30 + i * 5),
                      fps,
                      config: { damping: 10, stiffness: 150 },
                    })
                  : 1;

              return (
                <div
                  key={`tile-${i}`}
                  style={{ transform: `scale(${typeScale > 0 ? typeScale : 1})` }}
                >
                  <ClueTile
                    letter={letter}
                    state="empty"
                    size={86}
                    revealed={false}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit button */}
        {typedCount >= 5 && (
          <div
            style={{
              marginTop: 16,
              padding: '14px 50px',
              background: `linear-gradient(135deg, ${C.orange}, ${C.red})`,
              border: `3px solid ${C.black}`,
              borderRadius: 10,
              boxShadow: `4px 4px 0px ${C.black}`,
              fontFamily: heebo,
              fontSize: 34,
              fontWeight: 800,
              color: C.white,
              letterSpacing: '0.06em',
              opacity: spring({
                frame: frame - 54,
                fps,
                config: { damping: 8, stiffness: 100 },
              }),
              transform: `scale(${1 + Math.sin(frame * 0.4) * 0.02})`,
              direction: 'rtl',
            }}
          >
            ⏎ שלחו ניחוש
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 5: VICTORY — word solved!
// ==============================

const VictoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // All tiles flip to green
  const flipStart = 5;
  const solvedWord = 'SHARK';

  // Health refill animation
  const healthRefill = interpolate(frame, [20, 50], [12, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  // Victory flash
  const victoryFlash = interpolate(frame, [5, 8, 18], [0, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // "SURVIVED!" text
  const survivedIn = spring({
    frame: frame - 15,
    fps,
    config: { damping: 5, stiffness: 45 },
  });

  // Mascot celebration
  const mascotIn = spring({
    frame: frame - 25,
    fps,
    config: { damping: 8, stiffness: 60 },
  });

  // Score counter
  const score = Math.round(
    interpolate(frame, [20, 55], [0, 2840], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    })
  );

  // Sparkle particles
  const sparkleRng = createSeededRandom(99);
  const sparkles = Array.from({ length: 12 }, () => ({
    x: sparkleRng() * 900 + 90,
    y: sparkleRng() * 600 + 400,
    size: 4 + sparkleRng() * 8,
    delay: sparkleRng() * 30,
    speed: 0.1 + sparkleRng() * 0.15,
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: C.bgWarm }}>
      {/* Victory glow */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.lime}18 0%, transparent 55%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* Flash overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: C.wordleGreen,
          opacity: victoryFlash,
          zIndex: 20,
        }}
      />

      {/* Sparkles */}
      {sparkles.map((sp, idx) => {
        const spO = interpolate(
          frame - sp.delay,
          [0, 10, 30, 40],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const twinkle = 0.5 + Math.sin((frame - sp.delay) * sp.speed * 5) * 0.5;
        const sparkColor = idx % 2 === 0 ? C.lime : C.wordleGreen;
        return (
          <div
            key={`sparkle-${idx}`}
            style={{
              position: 'absolute',
              left: sp.x,
              top: sp.y,
              width: sp.size,
              height: sp.size,
              borderRadius: '50%',
              backgroundColor: sparkColor,
              opacity: spO * twinkle,
              boxShadow: `0 0 ${sp.size * 2}px ${sparkColor}`,
              zIndex: 5,
            }}
          />
        );
      })}

      <div style={{ ...center, zIndex: 10 }}>
        {/* Solved word — all green */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {solvedWord.split('').map((letter, i) => {
            const flipDelay = flipStart + i * 4;
            const flipProgress = interpolate(
              frame,
              [flipDelay, flipDelay + 8],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            const scaleY = interpolate(flipProgress, [0, 0.5, 1], [1, 0, 1]);
            const isFlipped = flipProgress > 0.5;

            return (
              <div
                key={`tile-${i}-${letter}`}
                style={{
                  transform: `scaleY(${Math.abs(scaleY) < 0.01 ? 0.01 : scaleY})`,
                }}
              >
                <ClueTile
                  letter={letter}
                  state={isFlipped ? 'correct' : 'empty'}
                  size={96}
                  revealed={isFlipped}
                />
              </div>
            );
          })}
        </div>

        {/* Health bar refilling */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 32 }}>💚</span>
          <HealthBar percent={healthRefill} width={500} height={26} />
        </div>

        {/* !שרדתם */}
        <div
          style={{
            fontFamily: heebo,
            fontSize: 100,
            fontWeight: 900,
            color: C.lime,
            letterSpacing: '0.1em',
            textShadow: `0 0 40px ${C.lime}66, 0 0 80px ${C.lime}22`,
            transform: `scale(${interpolate(survivedIn, [0, 1], [2.5, 1])})`,
            opacity: survivedIn,
            lineHeight: 1,
            direction: 'rtl',
          }}
        >
          !שרדתם
        </div>

        {/* Score */}
        <div
          style={{
            fontFamily: heebo,
            fontSize: 42,
            fontWeight: 800,
            color: C.white,
            marginTop: 12,
            opacity: interpolate(frame, [25, 35], [0, 1], {
              extrapolateRight: 'clamp',
            }),
            direction: 'rtl',
          }}
        >
          ניקוד: {score.toLocaleString()}
        </div>

        {/* Mascot celebration */}
        <div
          style={{
            marginTop: 24,
            transform: `scale(${mascotIn})`,
            opacity: mascotIn,
          }}
        >
          <AnimatedImage
            src={staticFile('mascot/trophy-nobg.gif')}
            width={240}
            height={240}
            fit="contain"
            loopBehavior="loop"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ==============================
// SCENE 6: CTA — "Survive if you can"
// ==============================

const SurvivalCTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mascotIn = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 55 },
  });

  const tagIn = spring({
    frame: frame - 8,
    fps,
    config: { damping: 10, stiffness: 70 },
  });

  const logoIn = spring({
    frame: frame - 14,
    fps,
    config: { damping: 5, stiffness: 40 },
  });

  const btnIn = spring({
    frame: frame - 20,
    fps,
    config: { damping: 7, stiffness: 55 },
  });
  const btnPulse = 1 + Math.sin(frame * 0.35) * 0.02;

  const shimmerX = interpolate(frame, [28, 65], [-130, 230], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  const urlO = interpolate(frame, [26, 40], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const glowSize = 30 + Math.sin(frame * 0.18) * 10;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bgWarm }}>
      {/* Warm glow */}
      <div
        style={{
          position: 'absolute',
          top: '42%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 600,
          background: `radial-gradient(ellipse, ${C.orange}12 0%, transparent 55%)`,
          filter: 'blur(60px)',
        }}
      />

      <div style={center}>
        {/* Mascot — explorer */}
        <div
          style={{
            transform: `scale(${mascotIn})`,
            opacity: mascotIn,
            marginBottom: 16,
          }}
        >
          <AnimatedImage
            src={staticFile('mascot/explorer-nobg.gif')}
            width={260}
            height={260}
            fit="contain"
            loopBehavior="loop"
          />
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: heebo,
            fontSize: 38,
            fontWeight: 600,
            color: `${C.white}DD`,
            textAlign: 'center',
            opacity: tagIn,
            transform: `translateY(${interpolate(tagIn, [0, 1], [12, 0])}px)`,
            marginBottom: 8,
            lineHeight: 1.3,
            direction: 'rtl',
          }}
        >
          .וורדל נגמר אחרי ניחוש אחד
        </div>
        <div
          style={{
            fontFamily: heebo,
            fontSize: 56,
            fontWeight: 900,
            color: C.orange,
            textAlign: 'center',
            opacity: tagIn,
            letterSpacing: '0.06em',
            textShadow: `0 0 20px ${C.orange}44`,
            marginBottom: 24,
            direction: 'rtl',
          }}
        >
          ?תוכלו לשרוד
        </div>

        {/* Logo */}
        <div style={{ transform: `scale(${logoIn})` }}>
          <div
            style={{
              fontFamily: bangers,
              fontSize: 105,
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

        <div style={{ height: 30 }} />

        {/* CTA Button */}
        <div
          style={{
            transform: `scale(${btnIn * btnPulse})`,
            padding: '24px 65px',
            background: `linear-gradient(135deg, ${C.orange}, ${C.red})`,
            border: `3px solid ${C.black}`,
            borderRadius: 12,
            boxShadow: `5px 5px 0px ${C.black}`,
            fontFamily: heebo,
            fontSize: 46,
            fontWeight: 800,
            color: C.white,
            letterSpacing: '0.06em',
            position: 'relative',
            overflow: 'hidden',
            direction: 'rtl',
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
          שרדו עכשיו — חינם
        </div>

        {/* URL */}
        <div
          style={{
            fontFamily: heebo,
            fontSize: 28,
            fontWeight: 600,
            color: C.lime,
            opacity: urlO,
            marginTop: 22,
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

const T = 12;

const SCENE_DURATIONS = {
  wordleBoring: 130,   // ~4.3s — let Wordle play out fully
  transform: 130,      // ~4.3s — breathe, read the concept
  gameplay: 120,        // ~4s — show the loop
  danger: 90,           // ~3s — tension
  victory: 80,          // ~2.7s — payoff
  cta: 75,              // ~2.5s — convert
};

const TOTAL_FRAMES =
  Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) - T * 5;
// 625 - 60 = 565 frames ≈ 18.8s

export const SurvivalPromoVideoHe: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bgWarm }}>
      <Audio
        src={staticFile('music/bossa-arcade.mp3')}
        volume={(f) => {
          const fadeInEnd = 30;
          const fadeOutStart = TOTAL_FRAMES - 45;
          if (f < fadeInEnd) {
            return interpolate(f, [0, fadeInEnd], [0, 0.6], {
              extrapolateRight: 'clamp',
            });
          }
          if (f > fadeOutStart) {
            return interpolate(f, [fadeOutStart, TOTAL_FRAMES], [0.6, 0], {
              extrapolateRight: 'clamp',
            });
          }
          return 0.6;
        }}
        loop
      />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.wordleBoring}>
          <WordleBoringScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.transform}>
          <TransformScene />
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

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.danger}>
          <DangerScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.victory}>
          <VictoryScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-left' })}
          timing={linearTiming({ durationInFrames: T })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.cta}>
          <SurvivalCTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

SurvivalPromoVideoHe.displayName = 'SurvivalPromoVideoHe';
