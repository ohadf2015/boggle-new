/**
 * WorldUnlockCinematic Component
 *
 * Remotion composition for world unlock sequences in adventure mode.
 * 10-second transition cinematic with:
 * 1. Old world fade (0-2s) - Previous world name dims
 * 2. Portal transition (2-4s) - Concentric explosion rings
 * 3. New world reveal (4-7s) - Particles + parallax layers
 * 4. World title (6-9s) - Name + emoji spring bounce
 * 5. Chapter preview (8-10s) - Chapter names stagger in
 */

import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { fredokaFamily, rubikFamily } from '../../../lib/remotion/fonts';
import {
  BackgroundGlow,
  ParticleLayer,
  ExplosionRing,
  FlashEffect,
  TitleReveal,
  SparkleField,
} from '../../../lib/remotion/primitives';

// ==============================================
// CONSTANTS
// ==============================================

/** Total duration in frames (10 seconds @ 30fps) — canonical value in ./constants */
export { WORLD_UNLOCK_DURATION_FRAMES } from './constants';

const PHASE_FRAMES = {
  OLD_FADE_START: 0,
  OLD_FADE_END: 60,
  PORTAL_START: 60,
  PORTAL_END: 120,
  REVEAL_START: 120,
  REVEAL_END: 210,
  TITLE_START: 180,
  TITLE_END: 270,
  CHAPTERS_START: 240,
  CHAPTERS_END: 300,
};

// ==============================================
// TYPES
// ==============================================

export interface WorldUnlockCinematicProps {
  previousWorldNumber: number;
  previousWorldName: string;
  newWorldNumber: number;
  newWorldName: string;
  previousColor: string;
  newColor: string;
  newSecondaryColor?: string;
  worldEmoji?: string;
  chapterNames?: string[];
  /** Translated "NEW WORLD UNLOCKED!" text */
  unlockText?: string;
  /** Translated "Chapters" label */
  chaptersLabel?: string;
}

// ==============================================
// MAIN COMPONENT
// ==============================================

export const WorldUnlockCinematic: React.FC<WorldUnlockCinematicProps> = ({
  previousWorldNumber,
  previousWorldName,
  newWorldNumber,
  newWorldName,
  previousColor,
  newColor,
  newSecondaryColor,
  worldEmoji = '',
  chapterNames = [],
  unlockText = 'NEW WORLD UNLOCKED!',
  chaptersLabel = 'Chapters',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const secondary = newSecondaryColor ?? newColor;

  // Phase 1: Old world fades out
  const oldFade = interpolate(
    frame,
    [PHASE_FRAMES.OLD_FADE_START, PHASE_FRAMES.OLD_FADE_END],
    [1, 0],
    { extrapolateRight: 'clamp' },
  );

  // Phase 3: New world reveal
  const revealSpring = spring({
    frame: frame - PHASE_FRAMES.REVEAL_START,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Phase 4: Title spring
  const titleSpring = spring({
    frame: frame - PHASE_FRAMES.TITLE_START,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  // Emoji bounce
  const emojiScale = spring({
    frame: frame - (PHASE_FRAMES.TITLE_START + 15),
    fps,
    config: { damping: 8, stiffness: 200 },
  });

  // Background color transition
  const bgGlowColor = frame < PHASE_FRAMES.PORTAL_START ? previousColor : newColor;
  const bgOpacity = frame < PHASE_FRAMES.PORTAL_START ? oldFade : revealSpring;

  // Chapter name stagger reveal data
  const chapterData = useMemo(
    () => chapterNames.map((name, i) => ({ name, delay: i * 8 })),
    [chapterNames],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a1a' }}>
      <BackgroundGlow color={bgGlowColor} opacity={bgOpacity} />

      {/* Phase 1: Old world name dimming */}
      <Sequence from={0} durationInFrames={PHASE_FRAMES.OLD_FADE_END} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: oldFade,
          }}
        >
          <div
            style={{
              fontFamily: rubikFamily,
              fontSize: 20,
              color: '#888',
              marginBottom: 12,
            }}
          >
            WORLD {previousWorldNumber}
          </div>
          <h2
            style={{
              fontFamily: fredokaFamily,
              fontSize: 48,
              fontWeight: 700,
              color: previousColor,
              textShadow: '3px 3px 0 black',
              margin: 0,
            }}
          >
            {previousWorldName}
          </h2>
        </div>
      </Sequence>

      {/* Phase 2: Portal transition rings */}
      <Sequence from={PHASE_FRAMES.PORTAL_START} durationInFrames={60} premountFor={15}>
        <ExplosionRing frame={frame - PHASE_FRAMES.PORTAL_START} color={previousColor} delay={0} size={120} />
        <ExplosionRing frame={frame - PHASE_FRAMES.PORTAL_START} color={newColor} delay={8} size={100} />
        <ExplosionRing frame={frame - PHASE_FRAMES.PORTAL_START} color={secondary} delay={16} size={80} />
        <ExplosionRing frame={frame - PHASE_FRAMES.PORTAL_START} color="#FFFFFF" delay={24} size={60} />
      </Sequence>

      {/* Flash on portal open */}
      <Sequence from={PHASE_FRAMES.PORTAL_START + 5} durationInFrames={5} premountFor={15}>
        <FlashEffect intensity={0.5} />
      </Sequence>

      {/* Phase 3: New world particles */}
      <Sequence from={PHASE_FRAMES.REVEAL_START} premountFor={15}>
        <ParticleLayer
          count={30}
          color={newColor}
          frame={frame - PHASE_FRAMES.REVEAL_START}
          width={width}
          height={height}
          seed={newWorldNumber * 100}
        />
      </Sequence>

      {/* Phase 4: Unlock title + world name */}
      <Sequence from={PHASE_FRAMES.TITLE_START} premountFor={15}>
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: 0,
            right: 0,
            opacity: titleSpring,
          }}
        >
          <TitleReveal
            text={unlockText}
            color={newColor}
            fontSize={56}
            frame={frame - PHASE_FRAMES.TITLE_START}
            fps={fps}
            springConfig={{ damping: 10, stiffness: 100 }}
          />
        </div>

        {/* World number + name */}
        <div
          style={{
            position: 'absolute',
            top: '42%',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: titleSpring,
            transform: `translateY(${(1 - titleSpring) * 30}px)`,
          }}
        >
          <div
            style={{
              fontFamily: rubikFamily,
              fontSize: 24,
              color: '#ccc',
              marginBottom: 8,
            }}
          >
            WORLD {newWorldNumber}
          </div>
          <h1
            style={{
              fontFamily: fredokaFamily,
              fontSize: 72,
              fontWeight: 700,
              color: 'white',
              textShadow: `4px 4px 0 black, 0 0 30px ${newColor}`,
              margin: 0,
            }}
          >
            {newWorldName}
          </h1>

          {/* Emoji bounce */}
          {worldEmoji && (
            <div
              style={{
                fontSize: 64,
                marginTop: 16,
                transform: `scale(${emojiScale})`,
                display: 'inline-block',
              }}
            >
              {worldEmoji}
            </div>
          )}
        </div>
      </Sequence>

      {/* Phase 5: Chapter preview */}
      {chapterData.length > 0 && (
        <Sequence from={PHASE_FRAMES.CHAPTERS_START} premountFor={15}>
          <div
            style={{
              position: 'absolute',
              bottom: '10%',
              left: 0,
              right: 0,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: rubikFamily,
                fontSize: 18,
                color: '#888',
                marginBottom: 12,
              }}
            >
              {chaptersLabel}
            </div>
            {chapterData.map((ch) => {
              const chReveal = spring({
                frame: frame - PHASE_FRAMES.CHAPTERS_START - ch.delay,
                fps,
                config: { damping: 15, stiffness: 100 },
              });
              return (
                <div
                  key={ch.name}
                  style={{
                    fontFamily: rubikFamily,
                    fontSize: 22,
                    color: newColor,
                    textShadow: '2px 2px 0 black',
                    opacity: chReveal,
                    transform: `translateX(${(1 - chReveal) * 40}px)`,
                    marginBottom: 6,
                  }}
                >
                  {ch.name}
                </div>
              );
            })}
          </div>
        </Sequence>
      )}

      {/* Sparkles throughout reveal */}
      <Sequence from={PHASE_FRAMES.REVEAL_START} premountFor={15}>
        <SparkleField
          count={25}
          color={newColor}
          seed={newWorldNumber * 77}
          frame={frame - PHASE_FRAMES.REVEAL_START}
          glowColor={secondary}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

WorldUnlockCinematic.displayName = 'WorldUnlockCinematic';

export default WorldUnlockCinematic;
