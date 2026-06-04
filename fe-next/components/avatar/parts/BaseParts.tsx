/**
 * Avatar Base (Face Shape) Parts
 * 15 face shapes (viewBox 0 0 100 100).
 *
 * DESIGN RULE (from avatar audit): Cute kawaii/neo-brutalist heads MUST read as
 * heads, not abstract objects. All "good" shapes share:
 *   - Small ear bumps (ellipse rx~4 ry~6 at ~cx19/81, cy~48-54)
 *   - Forehead shine arc (white low-opacity path near y22-30)
 *   - Soft chin/jaw treatment
 * Weird ones (pre-fix triangle/diamond/hexagon/shield) lacked ears + had hard points
 * or literal object details (gold cross/rivets). Fixed 2026-06: now all 4 include ears,
 * rounded Q curves, and consistent cute furniture. Non-human specials (skull/dragon/cat)
 * intentionally exempt.
 *
 * Anchors preserved: eyes cy=42 cx38/62, mouth ~cy60, face cy52.
 */

import { STROKE_OUTER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';

const S = STROKE_OUTER;

interface BasePartProps {
  fill: string;
}


function Round({ fill }: BasePartProps) {
  return (
    <g>
      <circle cx="50" cy="52" r="30" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Ear bumps peeking out */}
      <ellipse cx="19" cy="52" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="81" cy="52" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      {/* Inner ear shadow */}
      <ellipse cx="19.5" cy="53" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="80.5" cy="53" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      {/* Forehead shine arc */}
      <path d="M36 34 Q50 28 64 34" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" strokeLinecap="round" />
      {/* Chin softness */}
      <path d="M40 72 Q50 78 60 72" fill="#fff" opacity="0.08" />

    </g>
  );
}

function Square({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps */}
      <ellipse cx="19" cy="50" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="81" cy="50" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="19.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="80.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      {/* Softer rounded square — more rx for kawaii feel */}
      <rect x="20" y="22" width="60" height="60" rx="12" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Forehead shine */}
      <path d="M32 30 Q50 24 68 30" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.14" strokeLinecap="round" />
      {/* Jaw shadow */}
      <path d="M28 72 Q50 78 72 72" fill="#000" opacity="0.05" />

    </g>
  );
}

function Oval({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps */}
      <ellipse cx="21" cy="50" rx="4" ry="6.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="79" cy="50" rx="4" ry="6.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="21.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="78.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="50" cy="52" rx="28" ry="33" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Forehead shine */}
      <path d="M38 30 Q50 24 62 30" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.16" strokeLinecap="round" />
      {/* Soft cheek contours */}
      <ellipse cx="32" cy="50" rx="4" ry="6" fill="#000" opacity="0.03" />
      <ellipse cx="68" cy="50" rx="4" ry="6" fill="#000" opacity="0.03" />
      {/* Chin */}
      <path d="M44 78 Q50 84 56 78" fill="#fff" opacity="0.06" />

    </g>
  );
}

function Heart({ fill }: BasePartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}heartGlow`} cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.03" />
        </radialGradient>
      </defs>
      {/* Plumper heart shape — wider lobes, softer chin */}
      <path d="M50 80 C28 66 14 50 22 36 C28 26 40 26 50 36 C60 26 72 26 78 36 C86 50 72 66 50 80Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M50 80 C28 66 14 50 22 36 C28 26 40 26 50 36 C60 26 72 26 78 36 C86 50 72 66 50 80Z"
        fill={`url(#${u}heartGlow)`} />
      {/* Lobe highlights — makes them look round and plump */}
      <ellipse cx="34" cy="36" rx="6" ry="5" fill="#fff" opacity="0.12" />
      <ellipse cx="66" cy="36" rx="6" ry="5" fill="#fff" opacity="0.12" />
      {/* Cleft hint at top */}
      <path d="M47 36 Q50 32 53 36" fill="none" stroke="#000" strokeWidth={1} opacity="0.12" />

    </g>
  );
}

function Diamond({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps — critical: prevents "floating gem" read. Positioned at equator of softened diamond. */}
      <ellipse cx="16" cy="50" rx="4" ry="5.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="84" cy="50" rx="4" ry="5.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="16.5" cy="51" rx="2" ry="3.2" fill="#000" opacity="0.08" />
      <ellipse cx="83.5" cy="51" rx="2" ry="3.2" fill="#000" opacity="0.08" />

      {/* Softened diamond / "faceted head" — all 4 points converted to gentle Q curves.
         Still reads as premium angular silhouette but now clearly a stylized cute head (not loose crystal).
         Eyes (cy42) and mouth (cy60) framed safely inside the wider mid-section. */}
      <path
        d="M44 21 Q50 16 56 21 L82 47 Q84 50 82 53 L56 79 Q50 84 44 79 L18 53 Q16 50 18 47 L44 21Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Subtle facet contours (now read as cheek/forehead planes, not hard gem cuts) */}
      <path d="M50 20 Q36 48 50 80" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      <path d="M50 20 Q64 48 50 80" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      {/* Soft top highlight (replaces hard facet ellipse) */}
      <path d="M38 28 Q50 20 62 28" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.16" strokeLinecap="round" />
      {/* Gentle chin softness for head-like finish */}
      <path d="M42 76 Q50 84 58 76" fill="#fff" opacity="0.05" />

    </g>
  );
}

function Hexagon({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps on the vertical side flats — turns stop-sign/hex into cute geometric head */}
      <ellipse cx="14" cy="51" rx="4" ry="5.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="86" cy="51" rx="4" ry="5.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="14.5" cy="52" rx="2" ry="3.2" fill="#000" opacity="0.08" />
      <ellipse cx="85.5" cy="52" rx="2" ry="3.2" fill="#000" opacity="0.08" />

      {/* Rounded hexagon (converted from polygon) — all corners softened with Q.
         Still bold geometric personality, now reads as intentional stylized head with ears.
         Inner strokes kept for facet depth but no longer define hard object. */}
      <path
        d="M50 15 Q80 25 82 32 Q82 70 50 87 Q18 70 18 32 Q20 25 50 15Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Inner highlight ring (soft) */}
      <path d="M50 20 Q76 29 78 36 Q78 66 50 81 Q22 66 22 36 Q24 29 50 20Z" fill="none" stroke="#fff" strokeWidth={0.9} opacity="0.11" />
      {/* Subtle mid ring for depth */}
      <path d="M50 26 Q70 34 72 42 Q72 60 50 74 Q28 60 28 42 Q30 34 50 26Z" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.07" />

    </g>
  );
}

function Blob({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps */}
      <ellipse cx="17" cy="50" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="83" cy="48" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M50 20 C70 18 84 30 82 50 C84 70 72 84 52 82 C32 86 16 72 18 52 C14 32 30 18 50 20Z"
        fill={fill} stroke="#000" strokeWidth={S} />
      {/* Forehead shine — follows blob asymmetry */}
      <path d="M38 30 Q52 24 66 32" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.16" strokeLinecap="round" />
      {/* Chin */}
      <path d="M42 74 Q52 80 60 74" fill="#fff" opacity="0.06" />

    </g>
  );
}

function Skull({ fill }: BasePartProps) {
  return (
    <g>
      {/* Cranium — tall dome, wider jaw for teeth */}
      <path d="M20 56 C20 26 30 14 50 14 C70 14 80 26 80 56 C80 64 76 72 68 74 L64 82 L58 74 L42 74 L36 82 L32 74 C24 72 20 64 20 56Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Cranium top highlight */}
      <path d="M30 20 Q50 12 70 20" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.2" />
      {/* Deep eye sockets — sized to frame composable eyes at cx=38/62 y=42 */}
      <ellipse cx="38" cy="42" rx="8" ry="8" fill="#000" opacity="0.22" />
      <ellipse cx="62" cy="42" rx="8" ry="8" fill="#000" opacity="0.22" />
      {/* Cheekbone ridges */}
      <path d="M24 50 Q30 46 36 50" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.35" />
      <path d="M64 50 Q70 46 76 50" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.35" />
      {/* Nasal cavity (replaces standard nose) */}
      <path d="M45 53 L50 59 L55 53Z" fill="#000" opacity="0.45" stroke="#000" strokeWidth={1} />
      {/* Jaw teeth — varied sizes for organic look */}
      <path d="M33 72 L34 77 L37 72 L39.5 79 L42 72 L44 76 L47 72 L49 78 L51 72 L53.5 77 L56 72 L58 79 L61 72 L63 76 L65 72 L67 78"
        fill="#fff" stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M32 72 L68 72" stroke="#000" strokeWidth={1.5} />
      {/* Temple cracks */}
      <path d="M26 32 L22 26 M24 34 L19 30" stroke="#000" strokeWidth={0.8} opacity="0.25" />
      <path d="M74 32 L78 26 M76 34 L81 30" stroke="#000" strokeWidth={0.8} opacity="0.25" />
      {/* Forehead suture lines */}
      <path d="M50 14 L50 28" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      <path d="M36 18 Q50 22 64 18" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function Shield({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps on upper wide section — turns heraldic object into heroic rounded-crest head */}
      <ellipse cx="15" cy="44" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="85" cy="44" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="15.5" cy="45" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="84.5" cy="45" rx="2" ry="3.5" fill="#000" opacity="0.08" />

      {/* Rounded crest-head (ex-shield) — NO gold border, NO cross, NO rivets.
         Top softened from sharp points into gentle dome. Still premium/epic silhouette
         but now reads as stylized brave head, not a literal shield you stuck eyes on.
         Eyes (42) and mouth (60) perfectly framed in the classic heraldic proportions. */}
      <path
        d="M18 22 Q50 10 82 22 Q84 48 80 58 Q62 80 50 90 Q38 80 20 58 Q16 48 18 22Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Soft inner crest contour (no more gold) */}
      <path d="M24 26 Q50 16 76 26 Q78 46 74 54 Q58 74 50 82 Q42 74 26 54 Q22 46 24 26Z"
        fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
      {/* Forehead shine (consistent cute-head language) */}
      <path d="M32 24 Q50 16 68 24" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.16" strokeLinecap="round" />
      {/* Chin softness */}
      <path d="M40 78 Q50 86 60 78" fill="#fff" opacity="0.06" />

    </g>
  );
}


function DragonHead({ fill }: BasePartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}dragonScaleGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="60%" stopColor={fill} />
          <stop offset="100%" stopColor="#1A1A2E" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`${u}dragonHornGrad`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#5D4037" />
          <stop offset="50%" stopColor="#8D6E63" />
          <stop offset="100%" stopColor="#D7CCC8" />
        </linearGradient>
      </defs>

      {/* Main head shape */}
      <path d="M20 58 C16 46 18 32 26 24 C32 18 40 14 50 14 C60 14 68 18 74 24 C82 32 84 46 80 58 L76 66 Q68 74 50 74 Q32 74 24 66Z"
        fill={`url(#${u}dragonScaleGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />

      {/* Big curved horns */}
      <path d="M28 26 C24 18 18 8 12 -2 C16 2 20 4 22 0 C20 10 24 18 30 22"
        fill={`url(#${u}dragonHornGrad)`} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M72 26 C76 18 82 8 88 -2 C84 2 80 4 78 0 C80 10 76 18 70 22"
        fill={`url(#${u}dragonHornGrad)`} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      {/* Horn ridges */}
      <path d="M24 20 L20 12 M22 16 L16 6" stroke="#000" strokeWidth={0.8} opacity="0.2" />
      <path d="M76 20 L80 12 M78 16 L84 6" stroke="#000" strokeWidth={0.8} opacity="0.2" />

      {/* Brow ridges above eye zone */}
      <path d="M26 34 Q36 28 44 34" fill="none" stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M56 34 Q64 28 74 34" fill="none" stroke="#000" strokeWidth={2.5} strokeLinecap="round" />

      {/* Scale pattern on forehead */}
      <path d="M38 22 L42 18 L46 22 L50 18 L54 22 L58 18 L62 22" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.2" />
      <path d="M42 26 L46 22 L50 26 L54 22 L58 26" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.15" />

      {/* Scale texture on cheeks */}
      <path d="M24 42 L28 44 L24 46 M26 46 L30 48 L26 50" stroke="#000" strokeWidth={0.7} opacity="0.18" />
      <path d="M76 42 L72 44 L76 46 M74 46 L70 48 L74 50" stroke="#000" strokeWidth={0.7} opacity="0.18" />

      {/* Nostrils (below nose zone, above mouth zone) */}
      <ellipse cx="44" cy="54" rx="2.5" ry="2" fill="#000" opacity="0.4" />
      <ellipse cx="56" cy="54" rx="2.5" ry="2" fill="#000" opacity="0.4" />
      {/* Nostril glow — static */}
      <ellipse cx="44" cy="54" rx="1.5" ry="1" fill="#FF4500" opacity="0.45" />
      <ellipse cx="56" cy="54" rx="1.5" ry="1" fill="#FF4500" opacity="0.45" />

      {/* Jaw spikes */}
      <polygon points="22,60 16,66 24,64" fill={fill} stroke="#000" strokeWidth={1.2} />
      <polygon points="78,60 84,66 76,64" fill={fill} stroke="#000" strokeWidth={1.2} />
      <polygon points="26,64 20,72 28,68" fill={fill} stroke="#000" strokeWidth={1} />
      <polygon points="74,64 80,72 72,68" fill={fill} stroke="#000" strokeWidth={1} />

      {/* No standard nose — dragon has its own nostrils above */}
    </g>
  );
}

function Triangle({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps — turns hard geometric triangle into intentional cute head */}
      <ellipse cx="17" cy="48" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="83" cy="48" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="17.5" cy="49" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="82.5" cy="49" rx="2" ry="3.5" fill="#000" opacity="0.08" />

      {/* Soft rounded inverted triangle (wide forehead + rounded cheeks + soft pointed chin).
         Replaces hard L-points with Q curves so it reads as stylized kawaii head, not warning sign.
         Eyes at cy=42 / mouth ~60 remain comfortably framed inside. */}
      <path
        d="M22 24 H78 Q84 24 82 30 L54 82 Q50 88 46 82 L18 30 Q16 24 22 24Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Inner highlight (softened) */}
      <path d="M22 36 Q18 42 24 48 Q50 28 76 48 Q82 42 78 36" fill="none" stroke="#fff" strokeWidth={0.9} opacity="0.12" />
      {/* Forehead shine arc (consistent with round/square family) */}
      <path d="M30 28 Q50 22 70 28" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.14" strokeLinecap="round" />
      {/* Soft cheek contours */}
      <ellipse cx="26" cy="50" rx="3.5" ry="5" fill="#000" opacity="0.03" />
      <ellipse cx="74" cy="50" rx="3.5" ry="5" fill="#000" opacity="0.03" />
      {/* Chin softness */}
      <path d="M42 78 Q50 86 58 78" fill="#fff" opacity="0.06" />

    </g>
  );
}

function CatFace({ fill }: BasePartProps) {
  return (
    <g>
      {/* Cat face — rounded top with ear bumps, wide cheeks, pointed chin */}
      <path
        d={[
          'M50 84',          // chin point
          'C36 80 22 68 20 52', // left jaw to cheek
          'C18 40 20 30 26 22', // left cheek up to ear base
          'L22 12',            // left ear tip
          'C26 18 30 20 34 22', // left ear inner curve
          'C38 16 44 14 50 14', // forehead left to center
          'C56 14 62 16 66 22', // forehead center to right
          'C70 20 74 18 78 12', // right ear inner curve
          'L74 22',            // right ear tip
          'C80 30 82 40 80 52', // right ear base to cheek
          'C78 68 64 80 50 84', // right jaw to chin
          'Z',
        ].join(' ')}
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Inner ear triangles */}
      <path d="M24 16 C27 20 30 22 33 23 L27 24 C23 22 22 18 24 16Z" fill="#000" opacity="0.12" />
      <path d="M76 16 C73 20 70 22 67 23 L73 24 C77 22 78 18 76 16Z" fill="#000" opacity="0.12" />
      {/* Cheek fluff */}
      <ellipse cx="28" cy="52" rx="5" ry="6" fill="#fff" opacity="0.06" />
      <ellipse cx="72" cy="52" rx="5" ry="6" fill="#fff" opacity="0.06" />
      {/* Whiskers — thin lines radiating from cheeks */}
      <line x1="30" y1="54" x2="14" y2="50" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <line x1="30" y1="57" x2="12" y2="58" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <line x1="30" y1="60" x2="14" y2="64" stroke="#000" strokeWidth={1} opacity="0.15" strokeLinecap="round" />
      <line x1="70" y1="54" x2="86" y2="50" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <line x1="70" y1="57" x2="88" y2="58" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <line x1="70" y1="60" x2="86" y2="64" stroke="#000" strokeWidth={1} opacity="0.15" strokeLinecap="round" />
      {/* Whisker dots at base */}
      <circle cx="34" cy="56" r="1.2" fill="#000" opacity="0.18" />
      <circle cx="66" cy="56" r="1.2" fill="#000" opacity="0.18" />
      {/* Chin shadow */}
      <path d="M44 76 Q50 82 56 76" fill="#000" opacity="0.06" />

    </g>
  );
}

/** Oblong — tall narrow face, high forehead, narrow chin */
function Oblong({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps */}
      <ellipse cx="25" cy="50" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="75" cy="50" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="25.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="74.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="50" cy="50" rx="24" ry="36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Forehead shine */}
      <path d="M40 26 Q50 20 60 26" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.14" strokeLinecap="round" />
      {/* Chin */}
      <path d="M44 78 Q50 84 56 78" fill="#fff" opacity="0.06" />

    </g>
  );
}

/** Rectangular — strong jawline, wide forehead, angular */
function Rectangular({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps */}
      <ellipse cx="19" cy="48" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="81" cy="48" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="19.5" cy="49" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="80.5" cy="49" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <path d="M22 22 Q22 18 28 18 L72 18 Q78 18 78 22 L80 68 Q80 82 66 84 L50 86 L34 84 Q20 82 20 68Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Forehead shine */}
      <path d="M34 26 Q50 20 66 26" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.14" strokeLinecap="round" />
      {/* Jaw shadow */}
      <path d="M24 68 Q30 74 50 78 Q70 74 76 68" fill="#000" opacity="0.05" />

    </g>
  );
}

/** Pear — narrow forehead, wide cheeks/jaw */
function Pear({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps — placed wider to match pear's wide cheeks */}
      <ellipse cx="19" cy="54" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="81" cy="54" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="19.5" cy="55" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="80.5" cy="55" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <path d="M34 20 Q42 14 50 14 Q58 14 66 20 Q78 30 80 48 Q82 64 74 74 Q66 82 50 84 Q34 82 26 74 Q18 64 20 48 Q22 30 34 20Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Forehead shine */}
      <path d="M38 22 Q50 16 62 22" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.14" strokeLinecap="round" />
      {/* Soft cheek contours */}
      <ellipse cx="28" cy="58" rx="4" ry="6" fill="#000" opacity="0.03" />
      <ellipse cx="72" cy="58" rx="4" ry="6" fill="#000" opacity="0.03" />
      {/* Jaw */}
      <path d="M30 72 Q40 80 50 82 Q60 80 70 72" fill="#000" opacity="0.04" />

    </g>
  );
}

/** Gooey slime blob with drips and gloss (VIP). Honors chosen color. */
function Slime({ fill }: BasePartProps) {
  const c = fill && fill !== '#FFDBB4' ? fill : '#7CFC5A';
  return (
    <g>
      <path d="M22 50 Q20 24 50 22 Q80 24 78 50 Q80 66 70 72 Q72 80 66 80 Q64 74 60 76 Q58 82 52 80 Q50 74 46 76 Q44 82 38 80 Q36 74 32 76 Q30 72 30 70 Q20 64 22 50Z" fill={c} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <ellipse cx="40" cy="36" rx="10" ry="6" fill="#fff" opacity="0.25" />
      <ellipse cx="60" cy="40" rx="4" ry="3" fill="#fff" opacity="0.2" />
      <circle cx="66" cy="58" r="2.5" fill="#fff" opacity="0.3" />
      <circle cx="34" cy="60" r="2" fill="#fff" opacity="0.25" />
    </g>
  );
}

/** Boxy metallic robot head with antenna and rivets (Epic). */
function RobotHead() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}robotF`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C7D0DA" />
          <stop offset="100%" stopColor="#8A97A6" />
        </linearGradient>
      </defs>
      <rect x="22" y="26" width="56" height="52" rx="8" fill={`url(#${u}robotF)`} stroke="#000" strokeWidth={S} />
      <rect x="16" y="44" width="6" height="14" rx="2" fill="#6B7785" stroke="#000" strokeWidth={2} />
      <rect x="78" y="44" width="6" height="14" rx="2" fill="#6B7785" stroke="#000" strokeWidth={2} />
      <line x1="50" y1="26" x2="50" y2="16" stroke="#000" strokeWidth={2} />
      <circle cx="50" cy="15" r="2.6" fill="#FF3366" stroke="#000" strokeWidth={1} />
      <path d="M26 66 H74" stroke="#000" strokeWidth={1} opacity="0.22" />
      <circle cx="27" cy="31" r="1" fill="#000" opacity="0.3" />
      <circle cx="73" cy="31" r="1" fill="#000" opacity="0.3" />
      <path d="M28 30 L28 52" stroke="#fff" strokeWidth={2} opacity="0.25" />
    </g>
  );
}

/** Classic teardrop alien head (Epic). Honors chosen color, green by default. */
function AlienHead({ fill }: BasePartProps) {
  const c = fill && fill !== '#FFDBB4' ? fill : '#9BE36B';
  return (
    <g>
      <path d="M50 20 Q74 22 72 44 Q70 64 50 78 Q30 64 28 44 Q26 22 50 20Z" fill={c} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 36 Q34 50 44 62" stroke="#000" strokeWidth={1} opacity="0.12" fill="none" />
      <path d="M64 36 Q66 50 56 62" stroke="#000" strokeWidth={1} opacity="0.12" fill="none" />
      <ellipse cx="44" cy="32" rx="8" ry="5" fill="#fff" opacity="0.18" />
    </g>
  );
}

/** Translucent ghost with wavy tail (Epic). */
function GhostFace() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}ghostG`}>
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D6E4FF" />
        </radialGradient>
      </defs>
      <path d="M24 50 Q22 22 50 22 Q78 22 76 50 L76 76 Q70 70 64 76 Q58 70 52 76 Q46 70 40 76 Q34 70 28 76 L24 50Z" fill={`url(#${u}ghostG)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" opacity="0.92" />
      <circle cx="36" cy="54" r="4" fill="#B7C9F2" opacity="0.5" />
      <circle cx="64" cy="54" r="4" fill="#B7C9F2" opacity="0.5" />
      <path d="M32 30 Q40 26 46 30" stroke="#fff" strokeWidth={1.5} opacity="0.5" fill="none" />
    </g>
  );
}

export const BASE_PARTS = {
  round: Round,
  square: Square,
  oval: Oval,
  heart: Heart,
  diamond: Diamond,
  hexagon: Hexagon,
  blob: Blob,
  skull: Skull,
  shield: Shield,
  dragonHead: DragonHead,
  triangle: Triangle,
  catFace: CatFace,
  oblong: Oblong,
  rectangular: Rectangular,
  pear: Pear,
  slime: Slime,
  robotHead: RobotHead,
  alienHead: AlienHead,
  ghostFace: GhostFace,
} as const;

export type BasePart = keyof typeof BASE_PARTS;
