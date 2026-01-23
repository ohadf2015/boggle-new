import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, staticFile } from 'remotion';
import { PortalAnimation } from './PortalAnimation';
import type { WorldTransitionProps } from './types';
export { WorldTransitionSchema } from './types';

// Duration constants
const TOTAL_FRAMES = 360; // 12 seconds at 30fps

// Phase timing (in frames)
const OLD_WORLD_HOLD = 60; // Show old world at full opacity
const OLD_WORLD_FADE_START = 60;
const OLD_WORLD_FADE_END = 90;

const PORTAL_START = 60;
const PORTAL_DURATION = 240; // 8 seconds

const NEW_WORLD_FADE_START = 240;
const NEW_WORLD_FADE_END = 270;

// Neo-brutalist colors
const NEO_NAVY = '#1a1a2e';

/**
 * World background component with opacity control.
 */
const WorldBackground: React.FC<{ worldId: string; opacity: number }> = ({
  worldId,
  opacity,
}) => (
  <AbsoluteFill style={{ opacity }}>
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundImage: `url(${staticFile(`images/adventure/backgrounds/${worldId}.webp`)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: NEO_NAVY, // Fallback color
      }}
    />
  </AbsoluteFill>
);

/**
 * WorldTransition composition - magical portal animation between worlds.
 *
 * Three-phase sequence:
 * 1. Old world visible, then fades out (frames 0-90)
 * 2. Portal appears, grows, and rotates (frames 60-300)
 * 3. New world fades in (frames 240-360)
 *
 * Duration: 360 frames (12 seconds at 30fps)
 */
export const WorldTransition: React.FC<WorldTransitionProps> = ({
  fromWorldId,
  toWorldId,
}) => {
  const frame = useCurrentFrame();

  // Old world opacity: full until frame 60, then fades to 0 by frame 90
  const oldWorldOpacity = interpolate(
    frame,
    [0, OLD_WORLD_HOLD, OLD_WORLD_FADE_END],
    [1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // New world opacity: 0 until frame 240, then fades to 1 by frame 270
  const newWorldOpacity = interpolate(
    frame,
    [NEW_WORLD_FADE_START, NEW_WORLD_FADE_END, TOTAL_FRAMES],
    [0, 1, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NEO_NAVY }}>
      {/* Phase 3: New world fades in (behind portal) */}
      <WorldBackground worldId={toWorldId} opacity={newWorldOpacity} />

      {/* Phase 2: Portal animation (middle layer) */}
      <Sequence from={PORTAL_START} durationInFrames={PORTAL_DURATION}>
        <PortalAnimation fromWorld={fromWorldId} toWorld={toWorldId} />
      </Sequence>

      {/* Phase 1: Old world fades out (top layer initially) */}
      <WorldBackground worldId={fromWorldId} opacity={oldWorldOpacity} />
    </AbsoluteFill>
  );
};
