import type { AvatarOverlay } from '@/lib/avatar/avatarOverlay';

/**
 * Loud, glanceable reaction badge drawn at the top-right of the avatar's
 * 100×100 viewBox. Neo-brutalist: hard black ring, solid brand fill, bold glyph
 * — sized to read across a room on a TV / party screen where a 48px face-swap
 * alone is too subtle. Scales with the avatar (it's inside the same SVG).
 *
 * Positioned to sit fully inside the inscribed circle (centre 50,50 r50) so the
 * `<Avatar>` container's `rounded-full overflow-hidden` crop doesn't clip it.
 */
export default function OverlayBadge({ overlay }: { overlay: AvatarOverlay }) {
  if (overlay === 'alert') {
    return (
      <g data-overlay="alert">
        <circle cx="70" cy="28" r="15" fill="#000" />
        <circle cx="70" cy="28" r="11.5" fill="#FF3366" />
        {/* exclamation mark */}
        <rect x="67.4" y="20" width="5.2" height="9" rx="2.3" fill="#000" />
        <circle cx="70" cy="33" r="2.4" fill="#000" />
      </g>
    );
  }
  // flame — big word / hot streak
  return (
    <g data-overlay="flame">
      <circle cx="70" cy="28" r="15" fill="#000" />
      <circle cx="70" cy="28" r="11.5" fill="#FF6B35" />
      {/* outer flame */}
      <path
        d="M70 18 C76 24.5 78 29 73.5 34 C71.5 36 66.5 35.5 65 32 C63.8 29.2 65.8 26 67 24.5 C66.4 27.6 68 29 69.6 29.6 C67 25.5 68.8 21 70 18 Z"
        fill="#FFE135"
      />
      {/* inner flame */}
      <path d="M70 25.5 C72.4 28 72.8 30.4 70.8 32 C69.4 33 67.9 32 68.2 30.3 C68.5 28.6 69.2 27 70 25.5 Z" fill="#FF3366" />
    </g>
  );
}
