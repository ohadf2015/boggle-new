/**
 * Avatar Nose Parts
 * 10 nose styles, positioned around y≈52-56 within viewBox 0 0 100 100
 * All noses accept a `fill` prop for skin-tone-aware shading.
 */

import { STROKE_DETAIL, darken } from './avatarDesignConstants';

interface NoseProps {
  fill: string;
}

function None() { return <g />; }

/** Kawaii button nose — matches the inline nose previously embedded in BaseParts */
function Kawaii() {
  return (
    <g>
      <ellipse cx="50" cy="55" rx="3.5" ry="2.8" fill="#000" opacity="0.1" />
      <path d="M47.5 53 C48 56.5 50 58 50 58 C50 58 52 56.5 52.5 53" fill="none" stroke="#000" strokeWidth={1.8} opacity="0.45" strokeLinecap="round" />
      <ellipse cx="49" cy="54" rx="1.5" ry="1" fill="#fff" opacity="0.15" />
      <ellipse cx="48" cy="56" rx="1" ry="0.6" fill="#000" opacity="0.15" />
      <ellipse cx="52" cy="56" rx="1" ry="0.6" fill="#000" opacity="0.15" />
    </g>
  );
}

/** Simple small nose — two subtle nostril dots */
function Button({ fill }: NoseProps) {
  const shadow = darken(fill, 0.2);
  return (
    <g>
      <ellipse cx="50" cy="54" rx="3.5" ry="2.5" fill={shadow} opacity="0.25" />
      <circle cx="48" cy="55" r="1.2" fill={shadow} opacity="0.4" />
      <circle cx="52" cy="55" r="1.2" fill={shadow} opacity="0.4" />
    </g>
  );
}

/** Slightly pointed downward nose */
function Pointed({ fill }: NoseProps) {
  const shadow = darken(fill, 0.2);
  return (
    <g>
      <path d="M50 48 L47 56 Q50 57.5 53 56 Z" fill={shadow} opacity="0.2" />
      <path d="M48 56 Q50 57 52 56" fill="none" stroke={shadow} strokeWidth={STROKE_DETAIL} opacity="0.5" strokeLinecap="round" />
    </g>
  );
}

/** Rounded bump nose */
function Round({ fill }: NoseProps) {
  const shadow = darken(fill, 0.2);
  return (
    <g>
      <ellipse cx="50" cy="54" rx="4" ry="3" fill={shadow} opacity="0.18" />
      <ellipse cx="50" cy="55" rx="3.5" ry="2" fill={shadow} opacity="0.12" />
      <circle cx="48" cy="55.5" r="1" fill={shadow} opacity="0.35" />
      <circle cx="52" cy="55.5" r="1" fill={shadow} opacity="0.35" />
    </g>
  );
}

/** Small upturned/snub nose */
function Snub({ fill }: NoseProps) {
  const shadow = darken(fill, 0.2);
  return (
    <g>
      <path d="M49 50 Q50 54 51 50" fill={shadow} opacity="0.15" />
      <path d="M47.5 54 Q50 56 52.5 54" fill="none" stroke={shadow} strokeWidth={STROKE_DETAIL * 1.1} opacity="0.45" strokeLinecap="round" />
    </g>
  );
}

/** Long straight nose with bridge */
function Long({ fill }: NoseProps) {
  const shadow = darken(fill, 0.2);
  return (
    <g>
      <path d="M50 44 L48 56 Q50 57.5 52 56 Z" fill={shadow} opacity="0.15" />
      <line x1="50" y1="44" x2="50" y2="53" stroke={shadow} strokeWidth={STROKE_DETAIL} opacity="0.2" strokeLinecap="round" />
      <path d="M47.5 56 Q50 57.5 52.5 56" fill="none" stroke={shadow} strokeWidth={STROKE_DETAIL} opacity="0.5" strokeLinecap="round" />
    </g>
  );
}

/** Wide flat nose */
function Wide({ fill }: NoseProps) {
  const shadow = darken(fill, 0.2);
  return (
    <g>
      <ellipse cx="50" cy="54" rx="5.5" ry="3" fill={shadow} opacity="0.18" />
      <circle cx="47" cy="55" r="1.5" fill={shadow} opacity="0.35" />
      <circle cx="53" cy="55" r="1.5" fill={shadow} opacity="0.35" />
    </g>
  );
}

/** Roman/aquiline nose with a prominent bridge */
function Roman({ fill }: NoseProps) {
  const shadow = darken(fill, 0.2);
  return (
    <g>
      <path d="M50 43 Q52 48 51 53 Q50 57 48 56" fill={shadow} opacity="0.2" />
      <path d="M47.5 56 Q50 57.5 52.5 56" fill="none" stroke={shadow} strokeWidth={STROKE_DETAIL} opacity="0.5" strokeLinecap="round" />
    </g>
  );
}

/** Tiny dot nose (minimalist/cartoon) */
function Dot({ fill }: NoseProps) {
  const shadow = darken(fill, 0.25);
  return <circle cx="50" cy="54" r="1.8" fill={shadow} opacity="0.4" />;
}

/** Animal/cat triangle nose */
function Cat() {
  return (
    <g>
      <polygon points="50,52 47,56 53,56" fill="#FF8FA3" stroke="#000" strokeWidth={0.8} />
      <line x1="50" y1="56" x2="50" y2="58" stroke="#000" strokeWidth={0.8} strokeLinecap="round" />
      <path d="M47 58 Q50 60 53 58" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.4" />
    </g>
  );
}

/** Clown/red ball nose */
function Clown() {
  return (
    <g>
      <circle cx="50" cy="54" r="4" fill="#FF3333" stroke="#000" strokeWidth={1.2} />
      <circle cx="48.5" cy="52.5" r="1.2" fill="#fff" opacity="0.5" />
    </g>
  );
}

export const NOSE_PARTS: Record<string, React.FC<NoseProps> | React.FC> = {
  none: None,
  kawaii: Kawaii,
  button: Button,
  pointed: Pointed,
  round: Round,
  snub: Snub,
  long: Long,
  wide: Wide,
  roman: Roman,
  dot: Dot,
  cat: Cat,
  clown: Clown,
};

export type NosePart = keyof typeof NOSE_PARTS;
