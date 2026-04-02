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
import { fredokaFamily } from '../../../lib/remotion/fonts';
import {
  BackgroundGlow,
  TitleReveal,
  StatItem,
  StatsPanel,
  SparkleField,
} from '../../../lib/remotion/primitives';

// ==============================================
// CONSTANTS
// ==============================================

/** Total duration in frames (6 seconds) — canonical value in ./constants */
export { VICTORY_DURATION_FRAMES } from './constants';

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
  /** Translated title text (default: "VICTORY!") */
  titleText?: string;
  /** Translated stat labels */
  statLabels?: {
    wordsFound?: string;
    finalScore?: string;
    timeRemaining?: string;
  };
  /** Translated stars label (default: "{count} / 3 Stars") */
  starsLabel?: string;
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
// MAIN COMPONENT
// ==============================================

export const VictoryCinematic: React.FC<VictoryCinematicProps> = ({
  starsEarned,
  wordsFound,
  finalScore,
  timeRemaining,
  titleText = 'VICTORY!',
  statLabels = {},
  starsLabel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title burst animation (0-60 frames / 0-2s)
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      <BackgroundGlow color="#FFE135" opacity={titleOpacity} />

      {/* Victory title burst (0-2s) */}
      <Sequence from={PHASE_FRAMES.TITLE_START} durationInFrames={60} premountFor={15}>
        <div style={{ position: 'absolute', top: '25%', left: 0, right: 0 }}>
          <TitleReveal
            text={titleText}
            color="#FFE135"
            fontSize={96}
            frame={frame}
            fps={fps}
          />
        </div>
      </Sequence>

      {/* Star reveal (2-4s) */}
      <Sequence from={PHASE_FRAMES.STARS_START} durationInFrames={60} premountFor={15}>
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
                fontFamily: fredokaFamily,
                fontSize: 48,
                fontWeight: 700,
                color: '#FFE135',
                textShadow: '3px 3px 0 black',
              }}
            >
              {starsLabel ?? `${starsEarned} / 3 Stars`}
            </span>
          </div>
          <Star index={0} isEarned={starsEarned >= 1} frame={frame - PHASE_FRAMES.STARS_START} fps={fps} />
          <Star index={1} isEarned={starsEarned >= 2} frame={frame - PHASE_FRAMES.STARS_START} fps={fps} />
          <Star index={2} isEarned={starsEarned >= 3} frame={frame - PHASE_FRAMES.STARS_START} fps={fps} />
        </div>
      </Sequence>

      {/* Stats display (3-6s) */}
      <Sequence from={PHASE_FRAMES.STATS_START} premountFor={15}>
        <StatsPanel
          borderColor="#FFE135"
          frame={frame - PHASE_FRAMES.STATS_START}
          fps={fps}
        >
          <StatItem
            label={statLabels.wordsFound ?? 'Words Found'}
            value={wordsFound}
            delay={0}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
          />
          <StatItem
            label={statLabels.finalScore ?? 'Final Score'}
            value={finalScore}
            delay={10}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
          />
          <StatItem
            label={statLabels.timeRemaining ?? 'Time Remaining'}
            value={`${timeRemaining}s`}
            delay={20}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
          />
        </StatsPanel>
      </Sequence>

      {/* Sparkle particles (throughout) */}
      <Sequence from={30} premountFor={10}>
        <SparkleField
          count={20}
          color="#FFE135"
          seed={456}
          frame={frame - 30}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

VictoryCinematic.displayName = 'VictoryCinematic';

export default VictoryCinematic;
