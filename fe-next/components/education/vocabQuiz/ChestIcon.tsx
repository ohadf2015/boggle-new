/**
 * Chest Icon — simple SVG rendering of a closed treasure chest.
 */

export function ChestIcon() {
  return (
    <svg
      width="48"
      height="36"
      viewBox="0 0 48 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Chest body */}
      <rect x="4" y="12" width="40" height="20" rx="2" fill="#FFD700" stroke="#000" strokeWidth="2" />
      {/* Lid */}
      <path d="M 4 12 Q 24 2 44 12" fill="#FFE44D" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      {/* Lock */}
      <circle cx="24" cy="15" r="3" fill="#000" />
      <line x1="24" y1="18" x2="24" y2="22" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
