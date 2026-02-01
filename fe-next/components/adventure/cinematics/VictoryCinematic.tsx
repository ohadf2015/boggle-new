/**
 * VictoryCinematic Component
 *
 * Remotion composition for level victory sequences.
 * 6-second celebration with:
 * 1. Victory text burst (0-2s)
 * 2. Star reveal animation (2-4s)
 * 3. Stats display (3-6s)
 *
 * Uses Remotion primitives for timing and animation.
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

// ==============================================
// CONSTANTS
// ==============================================

/** Frame rate for all cinematics */
const FPS = 30;

/** Total duration in frames (6 seconds) */
export const VICTORY_DURATION_FRAMES = 180;

/** Phase timing in frames */
const PHASE_FRAMES = {
  TITLE_START: 0,
  TITLE_END: 60,
  STARS_START: 60,
  STARS_END: 120,
  STATS_START: 90,
  STATS_END: 180,
};

// ==============================================
// TYPES
// ==============================================

export interface VictoryCinematicProps {
  /** Number of stars earned (1-3) */
  starsEarned: number;
  /** Number of words found */
  wordsFound: number;
  /** Final score achieved */
  finalScore: number;
  /** Time remaining in seconds */
  timeRemaining: number;
}

// ==============================================
// STAR COMPONENT
// ==============================================

interface StarProps {
  index: number;
  isEarned: boolean;
  frame: number;
  fps: number;
}

const Star: React.FC<StarProps> = ({ index, isEarned, frame, fps }) => {
  // Stagger star reveals
  const delay = index * 10;
  const revealProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  const scale = isEarned ? revealProgress : 0.5;
  const opacity = isEarned ? revealProgress : 0.3;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        margin: '0 15px',
        transform: `scale(${scale}) rotate(${revealProgress * 360}deg)`,
        opacity,
      }}
    >
      <div
        style={{
          fontSize: 80,
          color: isEarned ? '#FFD700' : '#666',
          textShadow: isEarned
            ? '0 0 20px #FFD700, 4px 4px 0 black'
            : '2px 2px 0 black',
        }}
      >
        ★
      </div>
    </div>
  );
};

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
          fontFamily: 'Rubik, sans-serif',
          fontSize: 24,
          color: '#FFE135',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'Fredoka, sans-serif',
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

export const VictoryCinematic: React.FC<VictoryCinematicProps> = ({
  starsEarned,
  wordsFound,
  finalScore,
  timeRemaining,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ==============================================
  // ANIMATION VALUES
  // ==============================================

  // Title burst animation (0-60 frames / 0-2s)
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const titleOpacity = interpolate(
    frame,
    [0, 15],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  // Pulse effect for title
  const pulse = interpolate(
    frame,
    [0, 30, 60],
    [1, 1.1, 1],
    { extrapolateRight: 'clamp' }
  );

  // ==============================================
  // RENDER
  // ==============================================

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      {/* Background gradient glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, #FFE13522, transparent 70%)',
          opacity: titleOpacity,
        }}
      />

      {/* Victory title burst (0-2s) */}
      <Sequence from={PHASE_FRAMES.TITLE_START} durationInFrames={60}>
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: 0,
            right: 0,
            textAlign: 'center',
            transform: `scale(${titleScale * pulse})`,
            opacity: titleOpacity,
          }}
        >
          <h1
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: 96,
              fontWeight: 700,
              color: '#FFE135',
              textShadow: `
                4px 4px 0 black,
                -2px -2px 0 black,
                0 0 30px #FFE135
              `,
              letterSpacing: '0.1em',
              margin: 0,
            }}
          >
            VICTORY!
          </h1>
        </div>
      </Sequence>

      {/* Star reveal (2-4s) */}
      <Sequence from={PHASE_FRAMES.STARS_START} durationInFrames={60}>
        <div
          style={{
            position: 'absolute',
            top: '45%',
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <span
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 48,
                fontWeight: 700,
                color: '#FFE135',
                textShadow: '3px 3px 0 black',
              }}
            >
              {starsEarned} / 3 Stars
            </span>
          </div>
          <Star
            index={0}
            isEarned={starsEarned >= 1}
            frame={frame - PHASE_FRAMES.STARS_START}
            fps={fps}
          />
          <Star
            index={1}
            isEarned={starsEarned >= 2}
            frame={frame - PHASE_FRAMES.STARS_START}
            fps={fps}
          />
          <Star
            index={2}
            isEarned={starsEarned >= 3}
            frame={frame - PHASE_FRAMES.STARS_START}
            fps={fps}
          />
        </div>
      </Sequence>

      {/* Stats display (3-6s) */}
      <Sequence from={PHASE_FRAMES.STATS_START}>
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            padding: '30px',
            backgroundColor: '#00000088',
            border: '3px solid #FFE135',
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
            label="Final Score"
            value={finalScore}
            delay={10}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
          />
          <StatItem
            label="Time Remaining"
            value={`${timeRemaining}s`}
            delay={20}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
          />
        </div>
      </Sequence>

      {/* Sparkle particles (throughout) */}
      <Sequence from={30}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          {Array.from({ length: 20 }, (_, i) => {
            const x = (i * 123456) % 100;
            const y = (i * 789012) % 100;
            const delay = i * 5;
            const opacity = interpolate(
              frame - 30 - delay,
              [0, 30],
              [0, 0.8],
              { extrapolateRight: 'clamp' }
            );

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: '#FFE135',
                  opacity,
                  boxShadow: '0 0 10px #FFE135',
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

VictoryCinematic.displayName = 'VictoryCinematic';

export default VictoryCinematic;
