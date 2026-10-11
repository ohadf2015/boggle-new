import React from 'react';

interface CoinArtProps {
  size?: number;
  className?: string;
}

/** The LexiClash coin: gold disc, ink outline, hard drop shadow, embossed star. */
export function CoinArt({ size = 20, className }: CoinArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="17" cy="17.5" r="13" fill="#0b1530" />
      <circle cx="15.5" cy="15" r="13" fill="#FFC53D" stroke="#0b1530" strokeWidth="2.5" />
      <circle cx="15.5" cy="15" r="8.6" fill="#FFD966" stroke="#C98A00" strokeWidth="1.6" />
      <path
        d="M15.5 9.6l1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z"
        fill="#C98A00"
      />
      <path d="M7.4 11.2a9.4 9.4 0 0 1 6-5.6" stroke="#FFF6D5" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default CoinArt;
