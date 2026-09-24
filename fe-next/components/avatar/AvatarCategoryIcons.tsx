/**
 * Purpose-drawn category glyphs for the avatar builder tab row.
 *
 * Why custom SVG instead of lucide: lucide has no beard / lips / hairstyle
 * icons, and the old mapping (SmilePlus=base, Scissors=hair, Brush=facialHair)
 * was unclear on phones where the tab label is hidden and only the glyph shows.
 * These literally depict the part being edited.
 *
 * Authored to lucide's geometry spec so they sit harmoniously next to the
 * lucide chrome icons (X / Shuffle / Undo2 / Download) in the same modal:
 *   viewBox 0 0 24 24 · fill none · stroke currentColor · width 2 · round caps.
 * `currentColor` lets each glyph inherit the active (black-on-lime) vs inactive
 * (white) tab text color. Front-facing & symmetric → no RTL flip needed.
 * Decorative only (`aria-hidden`); the tab's accessible name is its `title`.
 */

export type AvatarCategoryKey =
  | 'base'
  | 'hair'
  | 'eyes'
  | 'mouth'
  | 'facialHair'
  | 'accessories'
  | 'outfit'
  | 'background';

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({ size = 16, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/** base — a head-and-shoulders bust (the avatar's face/identity foundation). */
function BaseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </Svg>
  );
}

/** hair — a comb (the universal "hairstyle" glyph; a head outline read as the face tab). */
function HairIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.5 15.5 4.5a2 2 0 0 1 2.7.9l.4.8a2 2 0 0 1-.9 2.7L6.2 14.8" />
      <path d="m6.2 14.8 1.8 4m1.3-5.7 1.8 4m1.3-5.7 1.8 4m1.3-5.7 1.8 4" />
    </Svg>
  );
}

/** eyes — an almond eye with pupil (matches lucide Eye proportions). */
function EyesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  );
}

/** mouth — smiling lips: cupid-bow top + deep lower curve, unmistakably a mouth (not an eye). */
function MouthIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* upper lip — cupid's bow wave between the two mouth corners */}
      <path d="M5 11q3.5-2.5 7 0t7 0" />
      {/* lower lip — deep smile curve closing back to the corners */}
      <path d="M5 11q7 7 14 0" />
    </Svg>
  );
}

/** facialHair — a jaw beard with a mustache sweep. */
function FacialHairIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9c0 8 3 11 6 11s6-3 6-11" />
      <path d="M8 9q4 3 8 0" />
    </Svg>
  );
}

/** accessories — glasses with squared lenses + bridge (clearer than circles, which read as ∞). */
function AccessoriesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="9" width="7.5" height="6" rx="2" />
      <rect x="13.5" y="9" width="7.5" height="6" rx="2" />
      <path d="M10.5 11h3" />
    </Svg>
  );
}

/** outfit — a t-shirt (body style + shirt color). */
function OutfitIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4c.5 1.5 1.6 2.3 3 2.3S14.5 5.5 15 4l5 2.5-1.8 4-2.2-1V20H8V9.5l-2.2 1L4 6.5Z" />
    </Svg>
  );
}

/** background — a framed scene (hill + sun) standing in for the backdrop. */
function BackgroundIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="15.5" cy="10" r="1.6" />
      <path d="M3.5 16l5-5 4 4" />
    </Svg>
  );
}

export const AVATAR_CATEGORY_ICONS: Record<AvatarCategoryKey, (props: IconProps) => React.ReactElement> = {
  base: BaseIcon,
  hair: HairIcon,
  eyes: EyesIcon,
  mouth: MouthIcon,
  facialHair: FacialHairIcon,
  accessories: AccessoriesIcon,
  outfit: OutfitIcon,
  background: BackgroundIcon,
};
