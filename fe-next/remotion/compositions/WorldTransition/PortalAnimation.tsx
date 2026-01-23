import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

interface PortalAnimationProps {
  fromWorld: string;
  toWorld: string;
}

/**
 * Portal visual effect component for world transitions.
 * Creates a growing, rotating portal with pulsing glow.
 */
export const PortalAnimation: React.FC<PortalAnimationProps> = () => {
  const frame = useCurrentFrame();

  // Portal scale: 0 -> 2.5 over 90 frames (grows from center)
  const scale = interpolate(frame, [0, 90], [0, 2.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Portal rotation: 0 -> 360 degrees over 180 frames (full spin)
  const rotation = interpolate(frame, [0, 180], [0, 360], {
    extrapolateRight: 'clamp',
  });

  // Glow intensity pulses via sine wave (0.5 to 1.0 range)
  const glowIntensity = 0.75 + Math.sin(frame * 0.1) * 0.25;

  // Portal fades out in final 60 frames
  const opacity = interpolate(frame, [180, 240], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Neo-brutalist portal colors
  const neoCyan = '#00FFFF';
  const neoPink = '#FF1493';

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Outer glow ring */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${neoCyan}40 0%, transparent 70%)`,
          transform: `scale(${scale * 1.5}) rotate(${-rotation * 0.5}deg)`,
          opacity: opacity * glowIntensity,
        }}
      />

      {/* Main portal */}
      <div
        style={{
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${neoCyan}, ${neoPink})`,
          boxShadow: `
            0 0 ${60 * glowIntensity}px rgba(0, 255, 255, ${0.8 * glowIntensity}),
            0 0 ${120 * glowIntensity}px rgba(255, 20, 147, ${0.6 * glowIntensity}),
            inset 0 0 ${40 * glowIntensity}px rgba(255, 255, 255, 0.3)
          `,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          opacity,
          border: '4px solid rgba(255, 255, 255, 0.5)',
        }}
      />

      {/* Inner swirl effect */}
      <div
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `conic-gradient(from ${rotation}deg, ${neoCyan}, ${neoPink}, ${neoCyan})`,
          transform: `scale(${scale * 0.7}) rotate(${rotation * 2}deg)`,
          opacity: opacity * 0.8,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};
