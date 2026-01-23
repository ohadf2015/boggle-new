import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

export type HighlightType = 'swipe' | 'word' | 'score';

interface TutorialStepProps {
  text: string;
  locale: string;
  highlightType: HighlightType;
}

// Simple SVG icons for each step type
const SwipeIcon: React.FC = () => (
  <svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Arrow pointing right with curved tail (swipe gesture) */}
    <path
      d="M20 40 Q30 30, 40 40 Q50 50, 60 40"
      stroke="#FFE135"
      strokeWidth="6"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M50 32 L60 40 L50 48"
      stroke="#FFE135"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const WordIcon: React.FC = () => (
  <svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Checkmark */}
    <path
      d="M20 42 L35 57 L60 25"
      stroke="#00FF00"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const ScoreIcon: React.FC = () => (
  <svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Plus sign with star burst effect */}
    <path
      d="M40 15 L40 65 M15 40 L65 40"
      stroke="#FFE135"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />
    {/* Small sparkle lines */}
    <path d="M20 20 L25 25" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" />
    <path d="M60 20 L55 25" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" />
    <path d="M20 60 L25 55" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" />
    <path d="M60 60 L55 55" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const getIcon = (type: HighlightType): React.ReactNode => {
  switch (type) {
    case 'swipe':
      return <SwipeIcon />;
    case 'word':
      return <WordIcon />;
    case 'score':
      return <ScoreIcon />;
  }
};

export const TutorialStep: React.FC<TutorialStepProps> = ({
  text,
  locale,
  highlightType,
}) => {
  const frame = useCurrentFrame();
  const isRTL = locale === 'he';

  // Text fade in: frames 0-20 (opacity 0 -> 1)
  const textOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Highlight box pulse: continuous sine wave animation (subtle 5% pulse)
  const pulseScale = 1 + 0.05 * Math.sin(frame * 0.1);

  // Font choice based on locale
  const fontFamily = isRTL ? 'Rubik, sans-serif' : 'Fredoka, sans-serif';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Highlight box with pulsing animation */}
      <div
        style={{
          width: 400,
          height: 200,
          border: '4px solid #FFE135',
          borderRadius: 4,
          boxShadow: '4px 4px 0px black',
          transform: `scale(${pulseScale})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(26, 26, 46, 0.8)',
        }}
      >
        {getIcon(highlightType)}
      </div>

      {/* Instruction text below highlight */}
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          marginTop: 40,
          fontFamily,
          fontSize: 48,
          color: '#FFFFFF',
          textShadow: '4px 4px 0px black',
          textAlign: isRTL ? 'right' : 'center',
          opacity: textOpacity,
          maxWidth: 800,
          padding: '0 40px',
        }}
      >
        {text}
      </div>
    </div>
  );
};
