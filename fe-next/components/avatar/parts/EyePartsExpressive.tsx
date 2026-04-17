/**
 * Avatar Eye Parts — Expressive
 * Mood-driven eye styles: angry, curious, determined, doe, wide, squint, confident, relaxed, focused
 */

import { STROKE_INNER } from './avatarDesignConstants';
import { useEyeColor, useEyeColorDark } from '../AvatarEyeColorContext';

const S = STROKE_INNER;

export function Angry() {
  return (
    <g>
      <line x1="33" y1="35" x2="43" y2="37" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="67" y1="35" x2="57" y2="37" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <circle cx="38" cy="43" r="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="43" r="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="43" r="2.8" fill="#5D4037" />
      <circle cx="63" cy="43" r="2.8" fill="#5D4037" />
      <circle cx="39" cy="43" r="1.5" fill="#000" />
      <circle cx="63" cy="43" r="1.5" fill="#000" />
      <circle cx="37.8" cy="41.8" r="0.8" fill="#fff" />
      <circle cx="61.8" cy="41.8" r="0.8" fill="#fff" />
    </g>
  );
}

/** Side-glancing curious eyes — pupils shifted right */
export function Curious() {
  return (
    <g>
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Upper lid shadow */}
      <path d="M33 40 Q38 37.5 43 40" fill="#000" opacity="0.06" />
      <path d="M57 40 Q62 37.5 67 40" fill="#000" opacity="0.06" />
      {/* Iris shifted right — looking to the side */}
      <circle cx="40.5" cy="41.5" r="3.2" fill="#6B8E5A" />
      <circle cx="64.5" cy="41.5" r="3.2" fill="#6B8E5A" />
      <circle cx="40.5" cy="41.5" r="2" fill="#000" />
      <circle cx="64.5" cy="41.5" r="2" fill="#000" />
      <circle cx="39.5" cy="40" r="1" fill="#fff" />
      <circle cx="63.5" cy="40" r="1" fill="#fff" />
      {/* Quizzical look conveyed via pupil shift — eyebrows handled by EyebrowParts */}
    </g>
  );
}

/** Narrow determined/focused eyes */
export function Determined() {
  return (
    <g>
      {/* Flat top eyelid — focused look */}
      <path d="M33 40 L43 40 Q43 47 38 47 Q33 47 33 40Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M57 40 L67 40 Q67 47 62 47 Q57 47 57 40Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Iris */}
      <circle cx="38" cy="43" r="2.8" fill="#5D4037" />
      <circle cx="62" cy="43" r="2.8" fill="#5D4037" />
      <circle cx="38" cy="43" r="1.6" fill="#000" />
      <circle cx="62" cy="43" r="1.6" fill="#000" />
      <circle cx="37" cy="42" r="0.8" fill="#fff" />
      <circle cx="61" cy="42" r="0.8" fill="#fff" />
      {/* Strong brow line */}
      <path d="M32 37 Q38 34 44 37" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
      <path d="M56 37 Q62 34 68 37" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

/** Soft doe eyes — large, round, innocent */
export function Doe() {
  return (
    <g>
      {/* Extra large sclera */}
      <circle cx="38" cy="42" r="7.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7.5" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Large dark iris */}
      <circle cx="38" cy="42.5" r="5.5" fill="#2C1810" />
      <circle cx="62" cy="42.5" r="5.5" fill="#2C1810" />
      {/* Iris ring */}
      <circle cx="38" cy="42.5" r="4" fill="#4A2820" />
      <circle cx="62" cy="42.5" r="4" fill="#4A2820" />
      {/* Pupil */}
      <circle cx="38" cy="42" r="3" fill="#000" />
      <circle cx="62" cy="42" r="3" fill="#000" />
      {/* Large catchlights */}
      <circle cx="36" cy="40" r="2.2" fill="#fff" />
      <circle cx="60" cy="40" r="2.2" fill="#fff" />
      <circle cx="40" cy="44" r="1.2" fill="#fff" opacity="0.7" />
      <circle cx="64" cy="44" r="1.2" fill="#fff" opacity="0.7" />
      {/* Bottom lash line hint */}
      <path d="M31.5 45 Q38 48 44.5 45" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" />
      <path d="M55.5 45 Q62 48 68.5 45" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" />
    </g>
  );
}

/** Extra large shocked/surprised eyes — tiny irises, maximum white */
export function Wide() {
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  return (
    <g>
      {/* Large sclera — bigger than normal */}
      <circle cx="38" cy="42" r="7.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7.5" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Upper lid pulled high */}
      <path d="M31 38 Q38 34 45 38" fill="#000" opacity="0.05" />
      <path d="M55 38 Q62 34 69 38" fill="#000" opacity="0.05" />
      {/* Tiny iris — maximum white showing */}
      <circle cx="38" cy="42" r="2.2" fill={ec} />
      <circle cx="62" cy="42" r="2.2" fill={ec} />
      {/* Tiny pupil */}
      <circle cx="38" cy="42" r="1.3" fill="#000" />
      <circle cx="62" cy="42" r="1.3" fill="#000" />
      {/* Catchlight */}
      <circle cx="37" cy="41" r="0.7" fill="#fff" />
      <circle cx="61" cy="41" r="0.7" fill="#fff" />
      {/* Bottom lid line for extra shock */}
      <path d="M31.5 46 Q38 49 44.5 46" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      <path d="M55.5 46 Q62 49 68.5 46" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      {/* Raised brow lines for shock */}
      <path d="M32 34 Q38 30 44 34" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M56 34 Q62 30 68 34" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      {/* unused-shadow to preserve hook signatures */}
      {ecd ? null : null}
    </g>
  );
}

/** Narrow suspicious squinting eyes */
export function Squint() {
  return (
    <g>
      {/* Narrow eye slits — top and bottom lids nearly touching */}
      <path d="M33 42 Q38 39.5 43 42 Q38 44 33 42Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M57 42 Q62 39.5 67 42 Q62 44 57 42Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Iris peek through the slit */}
      <ellipse cx="38" cy="42" rx="2.5" ry="1.2" fill="#5D4037" />
      <ellipse cx="62" cy="42" rx="2.5" ry="1.2" fill="#5D4037" />
      {/* Pupil — flattened */}
      <ellipse cx="38" cy="42" rx="1.5" ry="0.8" fill="#000" />
      <ellipse cx="62" cy="42" rx="1.5" ry="0.8" fill="#000" />
      {/* Tiny catchlight */}
      <circle cx="37" cy="41.5" r="0.5" fill="#fff" />
      <circle cx="61" cy="41.5" r="0.5" fill="#fff" />
      {/* Lid crease lines — suspicious furrowing */}
      <path d="M33 39 Q38 37 43 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" strokeLinecap="round" />
      <path d="M57 39 Q62 37 67 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" strokeLinecap="round" />
      {/* Lower lid crease */}
      <path d="M34 44.5 Q38 46 42 44.5" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" strokeLinecap="round" />
      <path d="M58 44.5 Q62 46 66 44.5" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" strokeLinecap="round" />
    </g>
  );
}

/** Confident eyes — slightly hooded, relaxed, brown iris. No built-in brows (uses eyebrow system) */
export function Confident() {
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  return (
    <g>
      {/* Slightly hooded sclera — flatter top than round, relaxed lower lid */}
      <path d="M33 41.5 Q38 38 43 41.5 Q38 46 33 41.5Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M57 41.5 Q62 38 67 41.5 Q62 46 57 41.5Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Upper lid weight — hooded shadow */}
      <path d="M33 41.5 Q38 38 43 41.5" fill="#000" opacity="0.08" />
      <path d="M57 41.5 Q62 38 67 41.5" fill="#000" opacity="0.08" />
      {/* Lid crease above — the hooded fold */}
      <path d="M33 39 Q38 36.5 43 39" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.2" strokeLinecap="round" />
      <path d="M57 39 Q62 36.5 67 39" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.2" strokeLinecap="round" />
      {/* Iris — warm brown, two-tone for depth */}
      <circle cx="38" cy="42" r="3" fill="#5D4037" />
      <circle cx="62" cy="42" r="3" fill="#5D4037" />
      <circle cx="38" cy="42.5" r="2.4" fill="#4A3228" opacity="0.5" />
      <circle cx="62" cy="42.5" r="2.4" fill="#4A3228" opacity="0.5" />
      {/* Pupil */}
      <circle cx="38" cy="42" r="1.8" fill="#000" />
      <circle cx="62" cy="42" r="1.8" fill="#000" />
      {/* Catchlights — slightly off-center for confident gaze */}
      <circle cx="37" cy="41" r="1" fill="#fff" />
      <circle cx="61" cy="41" r="1" fill="#fff" />
      <circle cx="39.5" cy="43" r="0.4" fill="#fff" opacity="0.5" />
      <circle cx="63.5" cy="43" r="0.4" fill="#fff" opacity="0.5" />
      {/* Subtle lower lid line */}
      <path d="M34 44 Q38 45.5 42 44" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.12" strokeLinecap="round" />
      <path d="M58 44 Q62 45.5 66 44" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.12" strokeLinecap="round" />
      {ec || ecd ? null : null}
    </g>
  );
}

/** Relaxed eyes — half-open, calm, green iris. Natural everyday look */
export function Relaxed() {
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  return (
    <g>
      {/* Semi-open sclera — heavy upper lid, relaxed */}
      <path d="M33 42 Q38 39.5 43 42 Q38 45.5 33 42Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M57 42 Q62 39.5 67 42 Q62 45.5 57 42Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Heavy upper lid shadow */}
      <path d="M33 42 Q38 39.5 43 42" fill="#000" opacity="0.1" />
      <path d="M57 42 Q62 39.5 67 42" fill="#000" opacity="0.1" />
      {/* Iris — hazel green */}
      <circle cx="38" cy="42.5" r="2.5" fill="#5D7A3A" />
      <circle cx="62" cy="42.5" r="2.5" fill="#5D7A3A" />
      <circle cx="38" cy="42.5" r="1.8" fill="#4A6630" opacity="0.6" />
      <circle cx="62" cy="42.5" r="1.8" fill="#4A6630" opacity="0.6" />
      {/* Pupil */}
      <circle cx="38" cy="42.5" r="1.4" fill="#000" />
      <circle cx="62" cy="42.5" r="1.4" fill="#000" />
      {/* Catchlight */}
      <circle cx="37" cy="41.5" r="0.8" fill="#fff" />
      <circle cx="61" cy="41.5" r="0.8" fill="#fff" />
      {ec || ecd ? null : null}
    </g>
  );
}

/** Focused eyes — slightly narrowed, intense gaze, dark iris */
export function Focused() {
  return (
    <g>
      {/* Narrowed sclera */}
      <path d="M33 41 Q38 38.5 43 41 Q38 44.5 33 41Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M57 41 Q62 38.5 67 41 Q62 44.5 57 41Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Upper lid tension */}
      <path d="M33 41 Q38 38.5 43 41" fill="#000" opacity="0.12" />
      <path d="M57 41 Q62 38.5 67 41" fill="#000" opacity="0.12" />
      {/* Iris — dark brown, larger for intense look */}
      <circle cx="38" cy="41.5" r="3.2" fill="#3E2723" />
      <circle cx="62" cy="41.5" r="3.2" fill="#3E2723" />
      <circle cx="38" cy="41.5" r="2" fill="#000" />
      <circle cx="62" cy="41.5" r="2" fill="#000" />
      {/* Sharp catchlight */}
      <circle cx="37" cy="40.5" r="1.1" fill="#fff" />
      <circle cx="61" cy="40.5" r="1.1" fill="#fff" />
      {/* Lower lid tension */}
      <path d="M34 43.5 Q38 45 42 43.5" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.15" />
      <path d="M58 43.5 Q62 45 66 43.5" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.15" />
    </g>
  );
}
