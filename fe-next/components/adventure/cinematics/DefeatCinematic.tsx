/**
 * DefeatCinematic Component
 *
 * Remotion composition for level defeat (encouraging) sequences.
 * 5-second encouraging sequence with:
 * 1. "Time's Up!" text (0-1.5s)
 * 2. Encouraging message (1-3s)
 * 3. Progress summary (2-5s) - words found, best word, score
 *
 * Tone: Encouraging, not punishing. Celebrates progress made.
 */

import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { fredokaFamily, rubikFamily } from '../../../lib/remotion/fonts';

// ==============================================
// CONSTANTS
// ==============================================

/** Frame rate for all cinematics */
const FPS = 30;

/** Total duration in frames (5 seconds) */
export const DEFEAT_DURATION_FRAMES = 150;

/** Phase timing in frames */
const PHASE_FRAMES = {
  TITLE_START: 0,
  TITLE_END: 45,
  MESSAGE_START: 30,
  MESSAGE_END: 90,
  STATS_START: 60,
  STATS_END: 150,
};

// ==============================================
// TYPES
// ==============================================

export interface DefeatCinematicProps {
  /** Number of words found */
  wordsFound: number;
  /** Best/longest word found */
  bestWord: string;
  /** Final score achieved */
  finalScore: number;
}

// ==============================================
// STAT ITEM COMPONENT
// ==============================================

interface StatItemProps {
  label: string;
  value: number | string;
  delay: number;
  frame: number;
  fps: number;
}

const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  delay,
  frame,
  fps,
}) => {
  const reveal = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '2px solid #333',
        opacity: reveal,
        transform: `translateX(${(1 - reveal) * 30}px)`,
      }}
    >
      <span
        style={{
          fontFamily: rubikFamily,
          fontSize: 24,
          color: '#FF6B35',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: fredokaFamily,
          fontSize: 28,
          fontWeight: 700,
          color: 'white',
        }}
      >
        {value}
      </span>
    </div>
  );
};

// ==============================================
// MAIN COMPONENT
// ==============================================

export const DefeatCinematic: React.FC<DefeatCinematicProps> = ({
  wordsFound,
  bestWord,
  finalScore,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ==============================================
  // ANIMATION VALUES
  // ==============================================

  // Title animation (0-45 frames / 0-1.5s)
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const titleOpacity = interpolate(
    frame,
    [0, 15],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  // Encouraging message reveal (30-90 frames / 1-3s)
  const messageReveal = spring({
    frame: frame - PHASE_FRAMES.MESSAGE_START,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // ==============================================
  // RENDER
  // ==============================================

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      {/* Background gradient glow (softer than victory) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, #FF6B3522, transparent 70%)',
          opacity: titleOpacity,
        }}
      />

      {/* "Time's Up!" title (0-1.5s) */}
      <Sequence from={PHASE_FRAMES.TITLE_START} durationInFrames={45} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: 0,
            right: 0,
            textAlign: 'center',
            transform: `scale(${titleScale})`,
            opacity: titleOpacity,
          }}
        >
          <h1
            style={{
              fontFamily: fredokaFamily,
              fontSize: 72,
              fontWeight: 700,
              color: '#FF6B35',
              textShadow: `
                4px 4px 0 black,
                -2px -2px 0 black,
                0 0 20px #FF6B35
              `,
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            Time&apos;s Up!
          </h1>
        </div>
      </Sequence>

      {/* Encouraging message (1-3s) */}
      <Sequence from={PHASE_FRAMES.MESSAGE_START} durationInFrames={60} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: messageReveal,
            transform: `translateY(${(1 - messageReveal) * 20}px)`,
          }}
        >
          <p
            style={{
              fontFamily: rubikFamily,
              fontSize: 32,
              color: '#00FFFF',
              textShadow: '2px 2px 0 black',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Nice try! You almost had it!
            <br />
            <span style={{ fontSize: 24, color: '#FFE135' }}>
              Check out what you achieved:
            </span>
          </p>
        </div>
      </Sequence>

      {/* Progress summary (2-5s) */}
      <Sequence from={PHASE_FRAMES.STATS_START} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            padding: '30px',
            backgroundColor: '#00000088',
            border: '3px solid #FF6B35',
            borderRadius: '4px',
          }}
        >
          <StatItem
            label="Words Found"
            value={wordsFound}
            delay={0}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
          />
          <StatItem
            label="Best Word"
            value={bestWord.toUpperCase()}
            delay={10}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
          />
          <StatItem
            label="Score"
            value={finalScore}
            delay={20}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
          />
        </div>
      </Sequence>

      {/* Soft sparkles (encouraging, not celebratory) */}
      <Sequence from={30} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          {Array.from({ length: 10 }, (_, i) => {
            const x = (i * 234567) % 100;
            const y = (i * 890123) % 100;
            const delay = i * 8;
            const opacity = interpolate(
              frame - 30 - delay,
              [0, 40],
              [0, 0.4],
              { extrapolateRight: 'clamp' }
            );

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  backgroundColor: '#00FFFF',
                  opacity,
                  boxShadow: '0 0 8px #00FFFF',
                }}
              />
            );
          })}
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

// ==============================================
// DISPLAY NAME & DEFAULT EXPORT
// ==============================================

DefeatCinematic.displayName = 'DefeatCinematic';

export default DefeatCinematic;
