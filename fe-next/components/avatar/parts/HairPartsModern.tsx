/** Back hair variants — see hairShared.tsx for props + helpers. */
import { useAvatarUid } from '../AvatarUidContext';
import { HairPartProps, HairPolishDefs, HairPolish, S } from './hairShared';

function Straight({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M12 36 C12 20 26 10 50 8 C74 10 88 20 88 36";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="straight" /></defs>
      {/* Cap — smooth, sleek volume */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="straight" d={cap} />
      {/* Left curtain — straight hair flowing down with gentle taper */}
      <path d="M12 36 C10 44 8 58 10 72 C12 78 16 80 20 76 C22 68 24 56 24 44 C22 36 16 34 12 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right curtain */}
      <path d="M88 36 C90 44 92 58 90 72 C88 78 84 80 80 76 C78 68 76 56 76 44 C78 36 84 34 88 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Vertical strand lines */}
      <path d="M14 42 L14 68 M18 40 L18 72 M20 38 L20 74" stroke="#000" strokeWidth={0.6} opacity="0.08" />
      <path d="M86 42 L86 68 M82 40 L82 72 M80 38 L80 74" stroke="#000" strokeWidth={0.6} opacity="0.08" />
      {/* Double-strand glossy highlights */}
      <path d="M16 44 L16 66" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M84 44 L84 66" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M18 46 L18 64" stroke="#fff" strokeWidth={0.7} opacity="0.1" />
      <path d="M82 46 L82 64" stroke="#fff" strokeWidth={0.7} opacity="0.1" />
      {/* Crown highlight arc */}
      <path d="M32 14 C44 8 56 8 68 14" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" strokeLinecap="round" />
      <path d="M36 12 C46 6 54 6 64 12" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" strokeLinecap="round" />
      {/* Blunt-cut bottom */}
      <path d="M10 72 C14 76 18 76 20 74 M80 74 C82 76 86 76 90 72" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
    </g>
  );
}

function Fade({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const top = "M30 34 Q28 6 50 0 Q72 6 70 34Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="fade" /></defs>
      {/* Fade gradient on sides — sparse dots at bottom, denser up */}
      {[{x:24,y:34},{x:27,y:33},{x:76,y:34},{x:73,y:33}].map((p,i) => (
        <circle key={`f${i}`} cx={p.x} cy={p.y} r={0.9} fill={fill} opacity={0.15} />
      ))}
      {[{x:25,y:31},{x:28,y:29},{x:31,y:27},{x:75,y:31},{x:72,y:29},{x:69,y:27}].map((p,i) => (
        <circle key={`m${i}`} cx={p.x} cy={p.y} r={1.1} fill={fill} opacity={0.3} />
      ))}
      {/* Tall swept-back top volume — overlaps face circle */}
      <path d={top} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="fade" d={top} />
      {/* Inner volume fill for solid look */}
      <path d="M34 32 Q34 10 50 4 Q66 10 66 32Z" fill={fill} stroke="none" />
      {/* Swept-back texture lines radiating from crown */}
      <path d="M40 22 Q44 10 50 4 M60 22 Q56 10 50 4" fill="none" stroke="#000" strokeWidth={1} opacity="0.14" />
      <path d="M36 24 Q40 12 48 6 M64 24 Q60 12 52 6" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      {/* Highlights showing swept shape */}
      <path d="M42 6 Q50 0 58 6" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.2" />
      <path d="M44 14 Q50 8 56 14" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
      {/* Fade demarcation line */}
      <path d="M30 34 Q40 28 50 26 Q60 28 70 34" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function Cornrows({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M18 30 Q18 12 50 6 Q82 12 82 30";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="cornrows" /></defs>
      {/* Base cap — taller for more volume */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="cornrows" d={cap} />
      {/* Raised cornrow ridges — bold thick braided rows radiating from crown */}
      {[
        'M22 30 Q26 20 34 14 Q42 8 50 8',
        'M28 30 Q32 20 40 14 Q46 10 50 8',
        'M36 28 Q40 18 46 12 Q48 10 50 8',
        'M50 8 Q52 10 54 12 Q60 18 64 28',
        'M50 8 Q54 10 60 14 Q68 20 72 30',
        'M50 8 Q58 8 66 14 Q74 20 78 30',
      ].map((d) => (
        <path key={d} d={d} fill="none" stroke="#000" strokeWidth={2.5} opacity={0.3} strokeLinecap="round" />
      ))}
      {/* Raised ridge fill — visible bumps along each row */}
      {[
        {d: 'M24 28 Q28 18 36 14 Q42 10 46 12 Q40 14 34 20 Q30 24 28 28Z', o: 0.15},
        {d: 'M54 12 Q58 10 64 14 Q72 18 76 28 Q72 24 66 20 Q60 14 54 12Z', o: 0.15},
      ].map(({d, o}, i) => (
        <path key={`r${i}`} d={d} fill="#000" opacity={o} />
      ))}
      {/* Highlight on each ridge crest */}
      {[
        'M24 28 Q28 18 36 14 Q44 8 50 8',
        'M30 28 Q34 18 42 14 Q48 10 50 8',
        'M38 26 Q42 18 48 12',
        'M52 12 Q58 18 62 26',
        'M52 8 Q56 10 62 14 Q70 20 70 28',
        'M52 8 Q60 8 68 14 Q76 22 76 28',
      ].map((d, i) => (
        <path key={`h${i}`} d={d} fill="none" stroke="#fff" strokeWidth={1} opacity={0.2} strokeLinecap="round" />
      ))}
      {/* Scalp part lines between rows — visible gaps */}
      {[25, 32, 42, 58, 68, 75].map((x, i) => (
        <path key={`s${i}`}
          d={`M${x} ${30-i*0.3} Q${x+(i<3?2:-2)} ${20} ${50} ${10}`}
          fill="none" stroke="#000" strokeWidth={0.8} opacity={0.18} />
      ))}
      {/* Top crown highlight */}
      <path d="M40 10 Q46 6 50 6 Q54 6 60 10" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
    </g>
  );
}

function WolfCut({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M14 34 Q14 12 50 6 Q86 12 86 34";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="wolfCut" /></defs>
      {/* Full volume cap */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="wolfCut" d={cap} />
      {/* Layered top — 3 soft pointed layers, not too jagged */}
      <path d="M18 28 Q20 16 34 10 L40 20 L50 8 L60 20 L66 10 Q80 16 82 28"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Smooth shaggy side layers — flowing past ears */}
      <path d="M14 34 Q10 48 12 62 Q14 68 20 64 Q16 52 18 42"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M86 34 Q90 48 88 62 Q86 68 80 64 Q84 52 82 42"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Strand texture */}
      <path d="M12 42 Q12 52 14 60 M88 42 Q88 52 86 60" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      {/* Highlights */}
      <path d="M38 10 Q48 4 50 6 Q52 4 62 10" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
      <path d="M14 40 L14 54 M86 40 L86 54" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

function CurtainBangs({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M10 38 C6 30 10 18 22 12 C30 8 40 6 50 8 C60 6 70 8 78 12 C90 18 94 30 90 38 L90 80 Q88 86 82 82 L80 60 Q78 42 76 38 Q50 28 24 38 Q22 42 20 60 L18 82 Q12 86 10 80Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="curtainBangs" /></defs>
      {/* Long flowing hair with curtain bangs parted in center */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="curtainBangs" d={cap} />
      {/* Center part line */}
      <line x1="50" y1="8" x2="50" y2="32" stroke="#000" strokeWidth={1.2} opacity="0.2" />
      {/* Strand texture */}
      <path d="M30 14 L22 50 M38 10 L34 48 M62 10 L66 48 M70 14 L78 50" stroke="#000" strokeWidth={0.6} opacity="0.08" />
      {/* Highlights */}
      <path d="M30 12 Q40 6 50 8 Q60 6 70 12" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M14 36 L16 56 M86 36 L84 56" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
    </g>
  );
}

function HalfUp({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M14 36 C10 30 14 20 24 14 C32 10 42 8 50 10 C58 8 68 10 76 14 C86 20 90 30 86 36 L88 70 Q86 76 80 72 L80 50 Q78 38 76 36 Q50 28 24 36 Q22 38 20 50 L20 72 Q14 76 12 70Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="halfUp" /></defs>
      {/* Lower half flowing down */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="halfUp" d={cap} />
      {/* Top bun/knot — kept inside viewBox */}
      <ellipse cx="50" cy="10" rx="13" ry="9" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Elastic/scrunchie at base of bun */}
      <ellipse cx="50" cy="17" rx="10" ry="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Bun texture */}
      <path d="M44 8 Q50 2 56 8" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.12" />
      <path d="M46 10 Q50 6 54 10" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.15" />
      {/* Strand texture */}
      <path d="M16 40 L18 64 M84 40 L82 64" stroke="#000" strokeWidth={0.6} opacity="0.08" />
    </g>
  );
}

function Himecut({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M12 34 C8 28 12 18 24 12 C34 8 44 6 50 8 C56 6 66 8 76 12 C88 18 92 28 88 34 L90 78 Q88 82 84 80 L84 42 Q82 34 78 32 Q50 26 22 32 Q18 34 16 42 L16 80 Q12 82 10 78Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="himecut" /></defs>
      {/* Classic Japanese hime cut — straight bangs + long side locks + back length */}
      {/* Back length */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="himecut" d={cap} />
      {/* Straight-across bangs — sharp cut at eyebrow level */}
      <path d="M18 34 Q18 14 50 10 Q82 14 82 34 L82 36 L18 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Bang cut line */}
      <line x1="18" y1="36" x2="82" y2="36" stroke="#000" strokeWidth={1.5} opacity="0.3" />
      {/* Side locks — sharp straight cuts at chin level, wider than face */}
      <rect x="8" y="32" width="12" height="34" rx="2" fill={fill} stroke="#000" strokeWidth={S} />
      <rect x="80" y="32" width="12" height="34" rx="2" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Side lock cut lines */}
      <line x1="8" y1="66" x2="20" y2="66" stroke="#000" strokeWidth={1} opacity="0.25" />
      <line x1="80" y1="66" x2="92" y2="66" stroke="#000" strokeWidth={1} opacity="0.25" />
      {/* Strand details */}
      <path d="M30 14 L30 34 M42 12 L42 34 M58 12 L58 34 M70 14 L70 34" stroke="#000" strokeWidth={0.5} opacity="0.06" />
      <path d="M36 12 Q46 8 50 10 Q54 8 64 12" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M12 38 L12 60 M88 38 L88 60" stroke="#fff" strokeWidth={0.6} opacity="0.1" />
    </g>
  );
}

function FrenchBob({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M14 36 Q14 14 50 10 Q86 14 86 36 L86 52 Q84 58 78 54 L78 40 Q50 26 22 40 L22 54 Q16 58 14 52Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="frenchBob" /></defs>
      {/* Short blunt bob — chin-length with heavy straight-across bangs */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="frenchBob" d={cap} />
      {/* Heavy blunt bangs — thick fringe above eye line */}
      <path d="M18 36 Q18 14 50 10 Q82 14 82 36 L82 38 L18 38Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Bang cut line */}
      <line x1="18" y1="38" x2="82" y2="38" stroke="#000" strokeWidth={1.2} opacity="0.25" />
      {/* Strand details */}
      <path d="M32 14 L32 36 M44 12 L44 36 M56 12 L56 36 M68 14 L68 36" stroke="#000" strokeWidth={0.4} opacity="0.06" />
      {/* Highlights */}
      <path d="M34 14 Q46 8 50 10 Q54 8 66 14" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M18 42 Q18 48 20 52 M82 42 Q82 48 80 52" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
      {/* Blunt bottom edge */}
      <path d="M16 52 Q20 54 24 52 M76 52 Q80 54 84 52" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.08" />
    </g>
  );
}


export const HAIR_PARTS_MODERN = {
  straight: Straight, fade: Fade, cornrows: Cornrows, wolfCut: WolfCut,
  curtainBangs: CurtainBangs, halfUp: HalfUp, himecut: Himecut, frenchBob: FrenchBob,
} as const;
