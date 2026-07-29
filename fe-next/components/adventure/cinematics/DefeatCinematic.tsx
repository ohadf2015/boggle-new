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
import { BackgroundGlow, StatItem, StatsPanel, SparkleField } from '../../../lib/remotion/primitives';

// ==============================================
// CONSTANTS
// ==============================================

/** Total duration in frames (5 seconds) — canonical value in ./constants */
export { DEFEAT_DURATION_FRAMES } from './constants';

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
  /** Translated stat labels */
  statLabels?: {
    wordsFound?: string;
    bestWord?: string;
    score?: string;
  };
  /** Translated title text (default: "Time's Up!") */
  titleText?: string;
  /** Translated encouragement line 1 */
  encourageText?: string;
  /** Translated encouragement line 2 */
  encourageSubtext?: string;
}

// ==============================================
// MAIN COMPONENT
// ==============================================

export const DefeatCinematic: React.FC<DefeatCinematicProps> = ({
  wordsFound,
  bestWord,
  finalScore,
  statLabels = {},
  titleText = "Time's Up!",
  encourageText = 'Nice try! You almost had it!',
  encourageSubtext = 'Check out what you achieved:',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation (0-45 frames / 0-1.5s)
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Encouraging message reveal (30-90 frames / 1-3s)
  const messageReveal = spring({
    frame: frame - PHASE_FRAMES.MESSAGE_START,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      <BackgroundGlow color="#FF6B35" opacity={titleOpacity} />

      {/* Title (0-1.5s) */}
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
              textShadow: '4px 4px 0 black, -2px -2px 0 black, 0 0 20px #FF6B35',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            {titleText}
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
            {encourageText}
            <br />
            <span style={{ fontSize: 24, color: '#FFE135' }}>
              {encourageSubtext}
            </span>
          </p>
        </div>
      </Sequence>

      {/* Progress summary (2-5s) */}
      <Sequence from={PHASE_FRAMES.STATS_START} premountFor={15}>
        <StatsPanel
          borderColor="#FF6B35"
          frame={frame - PHASE_FRAMES.STATS_START}
          fps={fps}
        >
          <StatItem
            label={statLabels.wordsFound ?? 'Words Found'}
            value={wordsFound}
            delay={0}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
            labelColor="#FF6B35"
          />
          <StatItem
            label={statLabels.bestWord ?? 'Best Word'}
            value={bestWord.toUpperCase()}
            delay={10}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
            labelColor="#FF6B35"
          />
          <StatItem
            label={statLabels.score ?? 'Score'}
            value={finalScore}
            delay={20}
            frame={frame - PHASE_FRAMES.STATS_START}
            fps={fps}
            labelColor="#FF6B35"
          />
        </StatsPanel>
      </Sequence>

      {/* Soft sparkles (encouraging, not celebratory) */}
      <Sequence from={30} premountFor={15}>
        <SparkleField
          count={10}
          color="#00FFFF"
          seed={567}
          frame={frame - 30}
          size={3}
          maxOpacity={0.4}
          fadeInFrames={40}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

DefeatCinematic.displayName = 'DefeatCinematic';

export default DefeatCinematic;
