/** Back hair variants — see hairShared.tsx for props + helpers. */
import { useAvatarUid } from '../AvatarUidContext';
import { HairPartProps, HairPolishDefs, HairPolish, S, CrownHighlight } from './hairShared';

function Spiky({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M20 36 Q20 22 50 16 Q80 22 80 36";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="spiky" /></defs>
      {/* Solid cap base */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      {/* Sharper, taller spikes — 6 points with a center peak for dynamism */}
      <path d="M21 31 L29 12 L37 25 L45 10 L50 19 L55 10 L63 25 L71 12 L79 31"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Fill gap between cap and spikes */}
      <path d="M21 31 Q50 20 79 31 Q80 34 80 36 Q50 22 20 36 Q20 34 21 31Z" fill={fill} stroke="none" />
      {/* Spike-separation shading so individual spikes read */}
      <path d="M33 24 L29 14 M41 21 L45 12 M59 21 L55 12 M67 24 L71 14" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      {/* Faux-3D polish */}
      <HairPolish uid={u} keyName="spiky" d={cap} />
      {/* SYSTEMIC: shared crown highlight for consistency */}
      <CrownHighlight opacity={0.18} />
    </g>
  );
}

function Curly({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M10 42 C4 32 8 18 20 10 C30 4 40 2 50 2 C60 2 70 4 80 10 C92 18 96 32 90 42 C94 54 90 62 86 64 C84 58 86 50 86 44 C62 22 38 22 14 44 C14 50 16 58 14 64 C10 62 6 54 10 42Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="curly" /></defs>
      {/* Full rounded curly volume — big puffy cloud shape extending well beyond head */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="curly" d={cap} />
      {/* Bumpy curl outlines — bigger, bouncier circles along silhouette */}
      <circle cx="18" cy="14" r="6" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="34" cy="6" r="7" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="50" cy="3" r="7" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="66" cy="6" r="7" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="82" cy="14" r="6" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Side volume bumps — bigger */}
      <circle cx="8" cy="34" r="6" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="92" cy="34" r="6" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="6" cy="48" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="94" cy="48" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Double-strand crown highlights */}
      <path d="M30 6 C40 0 60 0 70 6" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" strokeLinecap="round" />
      <path d="M34 4 C44 -2 56 -2 66 4" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" strokeLinecap="round" />
      {/* Bounce highlight on side curls */}
      <ellipse cx="10" cy="30" rx="3" ry="2" fill="#fff" opacity="0.08" />
      <ellipse cx="90" cy="30" rx="3" ry="2" fill="#fff" opacity="0.08" />
    </g>
  );
}

function Buzz({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M20 34 Q20 18 50 12 Q80 18 80 34";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="buzz" /></defs>
      {/* Thin cap closely following head — buzz cut feel */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="buzz" d={cap} />
      {/* Stubble texture dots */}
      {[
        {x:30,y:20},{x:38,y:16},{x:46,y:14},{x:54,y:14},{x:62,y:16},{x:70,y:20},
        {x:26,y:26},{x:34,y:22},{x:42,y:18},{x:50,y:16},{x:58,y:18},{x:66,y:22},{x:74,y:26},
        {x:30,y:30},{x:40,y:24},{x:50,y:20},{x:60,y:24},{x:70,y:30},
      ].map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={1.2} fill="#000" opacity={0.1} />
      ))}
      <path d="M34 16 Q50 10 66 16" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.14" />
    </g>
  );
}

function Mohawk({ fill }: HairPartProps) {
  const u = useAvatarUid();
  // Spiky fin (row of triangular points), tallest in the centre — not a brick.
  const fin = "M35 33 L39 9 L43 23 L47 4 L50 17 L53 4 L57 23 L61 9 L65 33 Q50 28 35 33Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="mohawk" /></defs>
      {/* Shaved side hints */}
      <path d="M22 36 Q22 27 33 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      <path d="M78 36 Q78 27 67 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      {[{x:25,y:32},{x:29,y:28},{x:33,y:26},{x:71,y:28},{x:75,y:32},{x:67,y:26}].map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={1.2} fill={fill} opacity={0.25} />
      ))}
      {/* Spiky fin */}
      <path d={fin} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="mohawk" d={fin} />
      {/* Spike separation + highlight */}
      <path d="M43 21 L43 11 M50 15 L50 7 M57 21 L57 11" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      <path d="M47 13 L48 6 M53 13 L52 6" stroke="#fff" strokeWidth={1} opacity="0.16" />
    </g>
  );
}

function Topknot({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M26 34 Q26 22 50 18 Q74 22 74 34";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="topknot" /></defs>
      {/* Thin cap */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="topknot" d={cap} />
      {/* Bun on top — kept inside viewBox */}
      <ellipse cx="50" cy="12" rx="11" ry="10" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Tie/wrap */}
      <ellipse cx="50" cy="20" rx="7" ry="3" fill="#000" opacity="0.25" />
      <ellipse cx="47" cy="8" rx="4" ry="3" fill="#fff" opacity="0.12" />
      <path d="M44 10 Q50 6 56 10 M46 14 Q50 11 54 14" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.15" />
    </g>
  );
}

function Ponytail({ fill }: HairPartProps) {
  const u = useAvatarUid();
  /* Sleek pulled-back cap + clean back-center ponytail (gender-neutral, more masculine after femme split). */
  const cap = "M16 32 C16 14 30 8 50 6 C70 8 84 14 84 32";
  /* Single tail attached center-back upper-crown, swoops down behind ending below face */
  const tail = "M50 8 C56 8 62 12 64 22 C66 32 64 44 60 56 C58 64 56 76 60 86 C58 90 52 92 50 88 C48 92 42 90 40 86 C44 76 42 64 40 56 C36 44 34 32 36 22 C38 12 44 8 50 8Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="ponytail" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="ponytail" d={cap} />
      {/* Pulled-back texture lines radiating from crown */}
      <path d="M28 24 C36 16 46 10 50 8 C54 10 64 16 72 24" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.14" />
      <path d="M32 22 C40 14 50 10 50 8 C50 10 60 14 68 22" fill="none" stroke="#fff" strokeWidth={1} opacity="0.18" />
      <path d="M22 28 C30 20 42 14 50 12" fill="none" stroke="#fff" strokeWidth={0.7} opacity="0.12" strokeLinecap="round" />
      <path d="M78 28 C70 20 58 14 50 12" fill="none" stroke="#fff" strokeWidth={0.7} opacity="0.12" strokeLinecap="round" />
      {/* Tail (rendered mostly behind face — only top stub above y=22 + bottom flare below y=82 visible) */}
      <path d={tail} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="ponytail" d={tail} />
      {/* Tail strand highlights */}
      <path d="M48 14 C46 30 42 50 42 84" stroke="#fff" strokeWidth={1} opacity="0.18" strokeLinecap="round" fill="none" />
      <path d="M52 14 C54 30 58 50 58 84" stroke="#fff" strokeWidth={1} opacity="0.18" strokeLinecap="round" fill="none" />
      <path d="M50 14 C50 40 50 70 50 86" stroke="#000" strokeWidth={0.7} opacity="0.18" strokeLinecap="round" fill="none" />
      {/* Hair tie at base of tail */}
      <ellipse cx="50" cy="12" rx="6" ry="3.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="48" cy="11" rx="2" ry="1" fill="#fff" opacity="0.3" />
      {/* Baby hairs at temples */}
      <path d="M18 34 C16 38 17 42 20 44" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" />
      <path d="M82 34 C84 38 83 42 80 44" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" />
      {/* Crown highlight — SYSTEMIC shared primitive */}
      <CrownHighlight opacity={0.2} strokeWidth={1.4} />
    </g>
  );
}

function Combover({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const sweep = "M18 34 Q14 18 28 10 Q42 4 58 6 Q72 10 78 22 Q80 30 78 36 Q70 18 52 12 Q34 10 22 24 Q18 30 18 34Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="combover" /></defs>
      {/* Solid base cap — short on sides */}
      <path d="M22 36 Q22 24 50 18 Q78 24 78 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Bold swooping top — sweeps from left to right with volume */}
      <path d={sweep} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="combover" d={sweep} />
      {/* Part line */}
      <path d="M20 30 Q18 20 28 12" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.2" />
      {/* Sweep direction lines */}
      <path d="M26 20 Q40 12 56 10" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      {/* Highlight */}
      <path d="M30 10 Q44 4 58 8" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
    </g>
  );
}

function TrumpSwoop({ fill }: HairPartProps) {
  const u = useAvatarUid();
  // Signature bouffant comb-over: SOLID voluminous mass over the whole crown,
  // swept diagonally with a forward flap dipping low over one brow.
  const cap = "M15 39 Q11 12 42 6 Q73 2 87 21 Q90 30 82 39 Q80 31 70 31 Q52 31 36 33 Q24 35 15 39Z";
  const fringe = "M17 33 Q23 45 47 42 Q68 39 80 30 Q83 39 72 45 Q50 51 29 46 Q19 43 17 33Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="trumpSwoop" /></defs>
      {/* Solid bouffant crown */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="trumpSwoop" d={cap} />
      {/* Forward comb-over flap overhanging the brow (asymmetric dip) */}
      <path d={fringe} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Diagonal sweep texture */}
      <path d="M24 16 Q48 7 74 13" fill="none" stroke="#000" strokeWidth={0.9} opacity="0.14" />
      <path d="M22 24 Q46 15 72 21" fill="none" stroke="#000" strokeWidth={0.9} opacity="0.12" />
      <path d="M24 31 Q46 24 70 29" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.1" />
      {/* Crest rim-light */}
      <path d="M28 9 Q52 2 74 10" fill="none" stroke="#fff" strokeWidth={1.6} opacity="0.24" strokeLinecap="round" />
    </g>
  );
}

function Elvis({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const pompadour = "M28 32 Q26 10 40 2 Q52 0 60 8 Q64 16 56 26 Q48 34 38 36";
  const cap = "M20 36 Q20 18 50 14 Q80 18 80 36";
  return (
    <g>
      <defs>
        <HairPolishDefs uid={u} keyName="elvis" />
        {/* VIP specialty: pomade-sheen glossy streak along pompadour crest */}
        <linearGradient id={`${u}hair-elvis-pomade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="40%" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Full cap */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      {/* Signature pompadour swoop */}
      <path d={pompadour} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Faux-3D polish — shade bottom + rim-light top */}
      <path d={pompadour} fill={`url(#${u}hair-elvis-shade)`} stroke="none" />
      <path d={pompadour} fill={`url(#${u}hair-elvis-light)`} stroke="none" />
      {/* Pomade sheen — VIP specialty gradient accent */}
      <path d="M30 8 Q42 2 56 4 Q60 10 54 14 Q44 10 34 16 Z" fill={`url(#${u}hair-elvis-pomade)`} stroke="none" />
      <path d="M36 10 Q44 4 52 6" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.35" strokeLinecap="round" />
      <path d="M34 18 Q42 10 50 14" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.18" />
      <path d="M38 14 Q44 6 50 10 M36 20 Q42 14 48 18" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
      {/* Sideburns — connected to cap, tapered downward */}
      <path d="M20 34 L18 40 Q16 50 18 58 Q20 62 22 58 Q24 50 22 40 L20 34Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M80 34 L82 40 Q84 50 82 58 Q80 62 78 58 Q76 50 78 40 L80 34Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M19 42 Q18 48 19 54 M81 42 Q82 48 81 54" stroke="#000" strokeWidth={0.5} opacity="0.15" />
    </g>
  );
}

function Ramen({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M18 36 Q18 16 50 8 Q82 16 82 36";
  return (
    <g>
      <defs>
        <HairPolishDefs uid={u} keyName="ramen" />
        {/* VIP specialty: noodle-ridge gloss band across top waves */}
        <linearGradient id={`${u}hair-ramen-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Wavy noodle-textured hair — thick bouncy waves */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      {/* Faux-3D polish */}
      <path d={cap} fill={`url(#${u}hair-ramen-shade)`} stroke="none" />
      <path d={cap} fill={`url(#${u}hair-ramen-light)`} stroke="none" />
      {/* VIP specialty: gloss band highlighting noodle ridges */}
      <path d="M20 18 Q50 10 80 18 L80 26 Q50 18 20 26 Z" fill={`url(#${u}hair-ramen-gloss)`} stroke="none" />
      {/* Dense wavy noodle texture rows */}
      <path d="M22 28 Q28 22 34 28 Q40 34 46 28 Q52 22 58 28 Q64 34 70 28 Q76 22 80 28"
        fill="none" stroke="#000" strokeWidth={1.5} opacity="0.12" strokeLinecap="round" />
      <path d="M20 22 Q26 16 32 22 Q38 28 44 22 Q50 16 56 22 Q62 28 68 22 Q74 16 78 22"
        fill="none" stroke="#000" strokeWidth={1.2} opacity="0.1" strokeLinecap="round" />
      <path d="M26 16 Q32 10 38 16 Q44 22 50 16 Q56 10 62 16 Q68 22 74 16"
        fill="none" stroke="#000" strokeWidth={1} opacity="0.08" strokeLinecap="round" />
      {/* Noodle sheen — VIP specialty: glossy ridge along each wave */}
      <path d="M22 27 Q28 21 34 27 Q40 33 46 27 Q52 21 58 27 Q64 33 70 27 Q76 21 80 27"
        fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.3" strokeLinecap="round" />
      {/* Volume sides */}
      <path d="M18 36 Q14 44 16 54 Q20 50 20 42" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M82 36 Q86 44 84 54 Q80 50 80 42" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Crown highlight */}
      <path d="M36 12 Q46 8 56 12" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.28" strokeLinecap="round" />
      <path d="M38 10 Q46 6 54 10" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.15" />
    </g>
  );
}

function Long({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M12 38 C8 24 18 12 34 8 C42 6 58 6 66 8 C82 12 92 24 88 38 Q86 48 80 46 Q50 30 20 46 Q14 48 12 38Z";
  const rightLock = "M88 38 C92 56 90 76 86 84 C82 90 76 88 76 80 C76 64 78 52 80 44 Z";
  const leftLock = "M12 38 C8 56 10 76 14 84 C18 90 24 88 24 80 C24 64 22 52 20 44 Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="long" /></defs>
      {/* Cap with curved hairline — face stays visible */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="long" d={cap} />
      {/* Right side-lock — flowing past chin */}
      <path d={rightLock} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="long" d={rightLock} />
      {/* Left side-lock */}
      <path d={leftLock} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="long" d={leftLock} />
      {/* Strand flow lines */}
      <path d="M18 50 C18 60 20 70 20 80" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.1" />
      <path d="M82 50 C82 60 80 70 80 80" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.1" />
      {/* Glossy highlights — double strand */}
      <path d="M16 50 C16 62 18 74 18 82" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M84 50 C84 62 82 74 82 82" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      {/* Crown highlight arc */}
      <path d="M34 12 C42 6 58 6 66 12" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" strokeLinecap="round" />
      {/* Secondary shine */}
      <path d="M38 10 C46 6 54 6 62 10" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" strokeLinecap="round" />
    </g>
  );
}

function Bob({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M10 38 C6 24 18 12 34 8 C42 6 58 6 66 8 C82 12 94 24 90 38 C92 50 88 58 84 62 C80 58 80 50 80 44 C64 26 36 26 20 44 C20 50 20 58 16 62 C12 58 8 50 10 38Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="bob" /></defs>
      {/* Bob — voluminous rounded cap with chin-length sides curving inward */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="bob" d={cap} />
      {/* Strand flow lines */}
      <path d="M16 44 C16 50 17 56 18 60 M84 44 C84 50 83 56 82 60" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      {/* Glossy double-strand highlights */}
      <path d="M22 42 C22 50 23 56 24 60" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M78 42 C78 50 77 56 76 60" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      {/* Curl-in tips at ends */}
      <path d="M16 60 C18 64 22 64 24 60 M76 60 C78 64 82 64 84 60" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      {/* Crown highlight arc */}
      <path d="M34 10 C44 6 56 6 66 10" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" strokeLinecap="round" />
      <path d="M38 8 C46 4 54 4 62 8" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" strokeLinecap="round" />
    </g>
  );
}


export const HAIR_PARTS_CLASSIC = {
  spiky: Spiky, curly: Curly, buzz: Buzz, mohawk: Mohawk, topknot: Topknot,
  ponytail: Ponytail, combover: Combover, trumpSwoop: TrumpSwoop, elvis: Elvis, ramen: Ramen, long: Long, bob: Bob,
} as const;
