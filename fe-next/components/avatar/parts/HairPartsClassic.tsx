/** Back hair variants — see hairShared.tsx for props + helpers. */
import { useAvatarUid } from '../AvatarUidContext';
import { HairPartProps, HairPolishDefs, HairPolish, S } from './hairShared';

function Spiky({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M20 36 Q20 22 50 16 Q80 22 80 36";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="spiky" /></defs>
      {/* Solid cap base */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      {/* Short chunky spikes — 5 pointed, not too tall */}
      <path d="M22 30 L30 16 L38 26 L50 12 L62 26 L70 16 L78 30"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Fill gap between cap and spikes */}
      <path d="M22 30 Q50 20 78 30 Q80 34 80 36 Q50 22 20 36 Q20 34 22 30Z" fill={fill} stroke="none" />
      {/* Faux-3D polish */}
      <HairPolish uid={u} keyName="spiky" d={cap} />
      {/* Highlight */}
      <path d="M38 20 Q50 14 62 20" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
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
      ].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.2} fill="#000" opacity={0.1} />
      ))}
      <path d="M34 16 Q50 10 66 16" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.14" />
    </g>
  );
}

function Mohawk({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const strip = "M38 30 L38 4 Q50 0 62 4 L62 30";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="mohawk" /></defs>
      {/* Shaved side hints */}
      <path d="M22 36 Q22 26 34 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      <path d="M78 36 Q78 26 66 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      {[{x:24,y:32},{x:28,y:28},{x:32,y:26},{x:72,y:28},{x:76,y:32},{x:68,y:26}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.2} fill={fill} opacity={0.25} />
      ))}
      {/* Mohawk strip — clamped within viewBox */}
      <path d={strip} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="mohawk" d={strip} />
      <path d="M44 26 L44 6 M50 24 L50 2 M56 26 L56 6" stroke="#000" strokeWidth={0.7} opacity="0.12" />
      <path d="M48 24 L48 4 M52 22 L52 2" stroke="#fff" strokeWidth={1} opacity="0.15" />
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
  const cap = "M18 34 C18 22 28 12 50 10 C72 12 82 22 82 34";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="ponytail" /></defs>
      {/* Hair cap — sleek, pulled back with volume */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="ponytail" d={cap} />
      {/* Pulled-back texture — radiating from crown */}
      <path d="M30 26 C38 18 46 14 50 12 C54 14 62 18 70 26" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.1" />
      <path d="M34 24 C40 16 46 12 50 10 C54 12 60 16 66 24" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      {/* Ponytail swooping behind — fuller S-curve with tapered tip */}
      <path d="M74 24 C84 16 92 22 90 34 C92 48 88 62 84 72 C82 78 78 80 76 74 C78 66 82 54 84 42 C86 32 82 24 76 22Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Double-strand ponytail highlights */}
      <path d="M82 30 C84 42 84 54 82 66" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M80 32 C82 44 82 56 80 64" stroke="#fff" strokeWidth={0.7} opacity="0.1" />
      {/* Hair tie — scrunchie style */}
      <ellipse cx="75" cy="24" rx="5.5" ry="3.5" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M72 23 C74 21 76 21 78 23" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.2" />
      {/* Baby hairs at temples */}
      <path d="M20 34 C18 38 19 42 22 44" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" />
      <path d="M80 34 C82 38 81 42 78 44" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" />
      {/* Crown highlight */}
      <path d="M34 14 C42 8 58 8 66 14" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.16" strokeLinecap="round" />
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

function Elvis({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const pompadour = "M28 32 Q26 10 40 0 Q52 -4 60 6 Q64 16 56 26 Q48 34 38 36";
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
      <path d="M30 8 Q42 -2 56 4 Q60 10 54 14 Q44 10 34 16 Z" fill={`url(#${u}hair-elvis-pomade)`} stroke="none" />
      <path d="M36 10 Q44 0 52 6" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.35" strokeLinecap="round" />
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
  const cap = "M12 38 C8 24 18 12 34 8 C42 6 50 6 50 6 C50 6 58 6 66 8 C82 12 92 24 88 38 C90 52 88 68 84 78 C82 84 78 86 76 82 C74 76 76 60 76 46 C60 28 40 28 24 46 C24 60 26 76 24 82 C22 86 18 84 16 78 C12 68 10 52 12 38Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="long" /></defs>
      {/* Full long hair — voluminous cap with flowing S-curve sides */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="long" d={cap} />
      {/* Strand flow lines */}
      <path d="M18 46 C18 56 20 66 20 76" stroke="#000" strokeWidth={0.8} opacity="0.1" />
      <path d="M82 46 C82 56 80 66 80 76" stroke="#000" strokeWidth={0.8} opacity="0.1" />
      {/* Glossy highlights — double strand */}
      <path d="M24 44 C24 56 26 68 26 76" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M76 44 C76 56 74 68 74 76" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
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
  ponytail: Ponytail, combover: Combover, elvis: Elvis, ramen: Ramen, long: Long, bob: Bob,
} as const;
