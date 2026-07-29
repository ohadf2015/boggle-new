/**
 * Avatar Eye Parts — Basic
 * Everyday eye expressions: round, sleepy, wink, happy, closed, none, sad, crying
 */

import { STROKE_INNER } from './avatarDesignConstants';
import { useEyeColor, useEyeColorDark } from '../AvatarEyeColorContext';

const S = STROKE_INNER;

export function Round() {
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  return (
    <g>
      {/* Sclera — bigger for caricature feel */}
      <circle cx="38" cy="42" r="6.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="6.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M31.5 40 Q38 36.5 44.5 40" fill="#000" opacity="0.06" />
      <path d="M55.5 40 Q62 36.5 68.5 40" fill="#000" opacity="0.06" />
      {/* Iris — two-tone for depth */}
      <circle cx="39" cy="41.5" r="4.2" fill={ec} />
      <circle cx="63" cy="41.5" r="4.2" fill={ec} />
      <circle cx="39" cy="42.5" r="3.6" fill={ecd} opacity="0.4" />
      <circle cx="63" cy="42.5" r="3.6" fill={ecd} opacity="0.4" />
      {/* Pupil — 55% of iris */}
      <circle cx="39" cy="41.5" r="2.5" fill="#000" />
      <circle cx="63" cy="41.5" r="2.5" fill="#000" />
      {/* Catchlight — bigger reflections for liveliness */}
      <circle cx="36.8" cy="39.5" r="1.6" fill="#fff" />
      <circle cx="60.8" cy="39.5" r="1.6" fill="#fff" />
      <circle cx="40.5" cy="43" r="0.7" fill="#fff" opacity="0.5" />
      <circle cx="64.5" cy="43" r="0.7" fill="#fff" opacity="0.5" />
    </g>
  );
}

export function Sleepy() {
  return (
    <g>
      <path d="M33 40.5 Q36 41.5 39 40.5" fill="none" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      <path d="M61 40.5 Q64 41.5 67 40.5" fill="none" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      <path d="M33 42 Q38 46 43 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 42 Q62 46 67 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="33" y1="44" x2="34" y2="45.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.5" />
      <line x1="43" y1="44" x2="42" y2="45.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.5" />
      <line x1="57" y1="44" x2="58" y2="45.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.5" />
      <line x1="67" y1="44" x2="66" y2="45.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.5" />
    </g>
  );
}

export function Wink() {
  const ec = useEyeColor();
  return (
    <g>
      {/* Open eye — scaled up to match Round */}
      <circle cx="38" cy="42" r="6.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="41.5" r="4.2" fill={ec} />
      <circle cx="39" cy="41.5" r="2.5" fill="#000" />
      <circle cx="36.8" cy="39.5" r="1.6" fill="#fff" />
      {/* Winking eye — bolder arc */}
      <path d="M56 42 Q62 37 68 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="58" y1="40" x2="57" y2="37.5" stroke="#000" strokeWidth={1.8} strokeLinecap="round" />
      <line x1="66" y1="40" x2="67" y2="37.5" stroke="#000" strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

export function Happy() {
  return (
    <g>
      <path d="M33 44 Q38 38 43 44" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 44 Q62 38 67 44" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="32" y1="43" x2="30" y2="42" stroke="#000" strokeWidth={1.2} strokeLinecap="round" opacity="0.5" />
      <line x1="32" y1="44.5" x2="30" y2="45" stroke="#000" strokeWidth={1.2} strokeLinecap="round" opacity="0.5" />
      <line x1="68" y1="43" x2="70" y2="42" stroke="#000" strokeWidth={1.2} strokeLinecap="round" opacity="0.5" />
      <line x1="68" y1="44.5" x2="70" y2="45" stroke="#000" strokeWidth={1.2} strokeLinecap="round" opacity="0.5" />
    </g>
  );
}

/** Peaceful closed eyes — gentle curved lines */
export function Closed() {
  return (
    <g>
      {/* Closed eyelid curves — gentle arcs */}
      <path d="M33 42 Q38 45 43 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 42 Q62 45 67 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Upper lid crease — subtle shadow */}
      <path d="M34 40 Q38 38 42 40" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.2" strokeLinecap="round" />
      <path d="M58 40 Q62 38 66 40" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.2" strokeLinecap="round" />
      {/* Eyelash hints at outer corners */}
      <line x1="33" y1="42.5" x2="31.5" y2="43.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      <line x1="67" y1="42.5" x2="68.5" y2="43.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      {/* Inner lash hints */}
      <line x1="43" y1="42.5" x2="44" y2="43.5" stroke="#000" strokeWidth={0.8} strokeLinecap="round" opacity="0.3" />
      <line x1="57" y1="42.5" x2="56" y2="43.5" stroke="#000" strokeWidth={0.8} strokeLinecap="round" opacity="0.3" />
    </g>
  );
}

export function None() { return <g />; }

/** Downturned sad eyes — droopy outer corners */
export function Sad() {
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  return (
    <g>
      {/* Sclera */}
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Droopy upper lid — outer corners sag down */}
      <path d="M33 41 Q36 39 38 39 Q41 39 43 43" fill="#000" opacity="0.08" />
      <path d="M57 43 Q59 39 62 39 Q64 39 67 41" fill="#000" opacity="0.08" />
      {/* Droopy eyelid line */}
      <path d="M33 40 Q36 38 38 38 Q41 38 43 42" fill="none" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      <path d="M57 42 Q59 38 62 38 Q64 38 67 40" fill="none" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      {/* Iris — looking slightly down */}
      <circle cx="38" cy="43" r="3" fill={ec} />
      <circle cx="62" cy="43" r="3" fill={ec} />
      <circle cx="38" cy="43.5" r="2.5" fill={ecd} opacity="0.4" />
      <circle cx="62" cy="43.5" r="2.5" fill={ecd} opacity="0.4" />
      {/* Pupil */}
      <circle cx="38" cy="43" r="1.8" fill="#000" />
      <circle cx="62" cy="43" r="1.8" fill="#000" />
      {/* Catchlight — slightly dimmer for sad mood */}
      <circle cx="36.5" cy="41.5" r="1" fill="#fff" opacity="0.8" />
      <circle cx="60.5" cy="41.5" r="1" fill="#fff" opacity="0.8" />
      <circle cx="39" cy="44" r="0.4" fill="#fff" opacity="0.4" />
      <circle cx="63" cy="44" r="0.4" fill="#fff" opacity="0.4" />
      {/* Downturned eyebrows */}
      <path d="M32 37 Q36 35 40 36 Q42 37 44 38" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M56 38 Q58 37 60 36 Q64 35 68 37" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

export function Crying() {
  return (
    <g>
      <path d="M33 36 Q38 34 43 37" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 37 Q62 34 67 36" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M33 40 Q38 38 43 40" fill="#FFCCCC" opacity="0.4" />
      <path d="M57 40 Q62 38 67 40" fill="#FFCCCC" opacity="0.4" />
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="43" r="2.5" fill="#000" />
      <circle cx="63" cy="43" r="2.5" fill="#000" />
      <circle cx="37.5" cy="41.5" r="0.8" fill="#fff" />
      <circle cx="61.5" cy="41.5" r="0.8" fill="#fff" />
      <path d="M35 48 Q34 52 35 56 Q36 58 37 56 Q38 52 37 48" fill="#87CEEB" stroke="#5BA3D9" strokeWidth={0.5} opacity="0.7" />
      <path d="M63 48 Q62 52 63 56 Q64 58 65 56 Q66 52 65 48" fill="#87CEEB" stroke="#5BA3D9" strokeWidth={0.5} opacity="0.7" />
      <path d="M37 50 Q36.5 53 37.5 55" fill="none" stroke="#87CEEB" strokeWidth={1} opacity="0.4" strokeLinecap="round" />
      <path d="M65 50 Q64.5 53 65.5 55" fill="none" stroke="#87CEEB" strokeWidth={1} opacity="0.4" strokeLinecap="round" />
      <circle cx="50" cy="52" r="1.5" fill="#FFAAAA" opacity="0.3" />
    </g>
  );
}
