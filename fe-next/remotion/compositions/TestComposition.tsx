import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const TestComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e', // Neo-Brutalist navy
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1
        style={{
          fontSize: 80,
          color: '#FFE135', // Neo-Brutalist yellow
          fontFamily: 'Fredoka, sans-serif',
          opacity,
          textShadow: '4px 4px 0px black',
        }}
      >
        LexiClash
      </h1>
    </AbsoluteFill>
  );
};
