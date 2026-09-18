/**
 * Chest Icon — a neo-brutalist treasure chest. `open` tips the lid back and
 * lets the gold glow out; the lid is its own group so it can hinge.
 */

export interface ChestIconProps {
  open?: boolean;
  size?: number;
}

export function ChestIcon({ open = false, size = 56 }: ChestIconProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.86)}
      viewBox="0 0 56 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {open && <ellipse cx="28" cy="20" rx="20" ry="9" fill="#FFE44D" opacity="0.9" />}
      {/* Body */}
      <rect x="5" y="20" width="46" height="24" rx="3" fill="#E8A33D" stroke="#000" strokeWidth="3" />
      <rect x="5" y="28" width="46" height="5" fill="#FFD700" stroke="#000" strokeWidth="2" />
      {/* Lid — hinges at the back edge */}
      <g
        style={{
          transformOrigin: '28px 20px',
          transform: open ? 'translateY(-6px) rotate(-18deg)' : undefined,
          transition: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <path d="M5 20 Q28 2 51 20 Z" fill="#F5B94A" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
      </g>
      {/* Lock */}
      {!open && <rect x="24" y="24" width="8" height="10" rx="1.5" fill="#000" />}
    </svg>
  );
}
