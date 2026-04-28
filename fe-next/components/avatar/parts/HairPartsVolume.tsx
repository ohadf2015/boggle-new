/** Back hair variants — see hairShared.tsx for props + helpers. */
import { useAvatarUid } from '../AvatarUidContext';
import { HairPartProps, HairPolishDefs, HairPolish, S } from './hairShared';

function Afro({ fill }: HairPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="afro" /></defs>
      {/* Big round afro — bold, unmistakable silhouette */}
      <ellipse cx="50" cy="30" rx="44" ry="36" fill={fill} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="30" rx="44" ry="36" fill={`url(#${u}hair-afro-shade)`} stroke="none" />
      <ellipse cx="50" cy="30" rx="44" ry="36" fill={`url(#${u}hair-afro-light)`} stroke="none" />
      {/* Inner cutout so face shows — matches face circle overlap */}
      <path d="M22 44 Q50 20 78 44 Q80 36 80 30 Q80 20 50 20 Q20 20 20 30 Q20 36 22 44Z" fill={fill} stroke="none" />
      {/* Bumpy texture circles along the edge */}
      <circle cx="10" cy="34" r="6" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="14" cy="18" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="28" cy="6" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="44" cy="0" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="56" cy="0" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="72" cy="6" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="86" cy="18" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="90" cy="34" r="6" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="10" cy="50" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="90" cy="50" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Highlights */}
      <path d="M30 8 Q42 2 50 2 Q58 2 70 8" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" />
      <ellipse cx="30" cy="14" rx="6" ry="4" fill="#fff" opacity="0.06" />
    </g>
  );
}

function Wavy({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M10 38 C6 24 18 12 34 8 C42 6 58 6 66 8 C82 12 94 24 90 38 C92 48 90 58 86 64 C82 60 82 52 82 46 C64 26 36 26 18 46 C18 52 18 60 14 64 C10 58 8 48 10 38Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="wavy" /></defs>
      {/* Wavy hair — voluminous cap with flowing S-curve sides */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="wavy" d={cap} />
      {/* Wave S-curve texture on sides */}
      <path d="M14 44 C16 50 14 56 16 62 M86 44 C84 50 86 56 84 62" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      {/* Double-strand glossy highlights */}
      <path d="M20 42 C22 50 20 56 22 62" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M80 42 C78 50 80 56 78 62" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M22 44 C24 50 22 56 24 60" stroke="#fff" strokeWidth={0.7} opacity="0.1" />
      <path d="M78 44 C76 50 78 56 76 60" stroke="#fff" strokeWidth={0.7} opacity="0.1" />
      {/* Crown highlight arc */}
      <path d="M34 10 C44 6 56 6 66 10" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" strokeLinecap="round" />
      <path d="M38 8 C46 4 54 4 62 8" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" strokeLinecap="round" />
    </g>
  );
}

function Pigtails({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M18 34 Q18 14 50 10 Q82 14 82 34";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="pigtails" /></defs>
      {/* Cap */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="pigtails" d={cap} />
      {/* Part line */}
      <line x1="50" y1="10" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.25" />
      {/* Left pigtail — within viewBox */}
      <path d="M18 34 C8 36 4 44 6 54 C8 64 10 72 14 76 C18 80 20 76 18 70 C16 62 12 54 10 48 C8 42 12 36 18 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right pigtail — within viewBox */}
      <path d="M82 34 C92 36 96 44 94 54 C92 64 90 72 86 76 C82 80 80 76 82 70 C84 62 88 54 90 48 C92 42 88 36 82 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Strand details */}
      <path d="M10 42 Q8 52 10 62 M14 44 Q12 54 14 66" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M90 42 Q92 52 90 62 M86 44 Q88 54 86 66" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      {/* Highlights */}
      <path d="M12 40 Q10 50 12 58" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M88 40 Q90 50 88 58" stroke="#fff" strokeWidth={1} opacity="0.12" />
      {/* Hair ties — wrapped band look */}
      <ellipse cx="18" cy="34" rx="5" ry="3.5" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M15 33 Q18 31 21 33" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.25" />
      <ellipse cx="82" cy="34" rx="5" ry="3.5" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M79 33 Q82 31 85 33" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.25" />
    </g>
  );
}

function Sideshave({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const swept = "M34 22 Q50 10 82 18 Q86 22 86 36 L86 58 Q84 66 78 62 L78 38 Q66 20 38 28Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="sideshave" /></defs>
      {/* Shaved left side — visible buzzed stubble pattern */}
      <path d="M20 36 Q20 24 32 22" fill="none" stroke={fill} strokeWidth={1.5} opacity="0.3" />
      {[{x:22,y:34},{x:25,y:30},{x:28,y:27},{x:24,y:37},{x:27,y:33},{x:30,y:29},{x:22,y:28},{x:26,y:24}].map((p,i) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={1.3} fill={fill} opacity={0.25-(i%3)*0.04} />
      ))}
      {/* Shave demarcation line */}
      <path d="M34 22 Q36 28 34 34" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
      {/* Cap on right side + swept-over volume */}
      <path d={swept} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="sideshave" d={swept} />
      <path d="M56 14 Q68 14 78 22" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M40 24 Q50 16 62 16" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
    </g>
  );
}

function Dreads({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M10 32 Q10 14 50 10 Q90 14 90 32";
  /* Each dread: [startX, startY, endX, endY, midBulge, width] — within viewBox */
  const dreads: [number,number,number,number,number,number][] = [
    [16,32, 14,72, -2, 7],
    [24,30, 20,70, -2, 6],
    [32,28, 30,68, 2, 6],
    [40,26, 38,66, -1, 6],
    [50,25, 50,64, 0, 6],
    [60,26, 62,66, 2, 6],
    [68,28, 70,68, -2, 6],
    [76,30, 80,70, 2, 6],
    [84,32, 86,72, 2, 7],
  ];
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="dreads" /></defs>
      {/* Cap */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="dreads" d={cap} />
      {dreads.map(([sx,sy,ex,ey,bulge,w],i) => {
        const mx = (sx+ex)/2 + bulge;
        const my = (sy+ey)/2;
        /* Tapered dread shape — wider at root, narrower at tip */
        const hw = w/2;
        const tw = hw * 0.6; /* tip half-width */
        return (
          <g key={`${sx}-${sy}`}>
            <path d={`M${sx-hw} ${sy} C${mx-hw-1} ${my-4} ${ex-tw-1} ${ey-8} ${ex-tw} ${ey} Q${ex} ${ey+3} ${ex+tw} ${ey} C${ex+tw+1} ${ey-8} ${mx+hw+1} ${my-4} ${sx+hw} ${sy}Z`}
              fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
            {/* Segment wraps — the horizontal bands that define dread texture */}
            {[0.25, 0.45, 0.65, 0.8].map((t, j) => {
              const px = sx + (ex-sx)*t + bulge*(t < 0.5 ? t*2 : 1);
              const py = sy + (ey-sy)*t;
              const rw = hw - (hw-tw)*t;
              return <path key={t} d={`M${px-rw+0.5} ${py} L${px+rw-0.5} ${py}`} stroke="#000" strokeWidth={0.7} opacity={0.12+j*0.02} />;
            })}
            {/* Bead on select dreads */}
            {(i===2||i===5||i===7) && (
              <>
                <ellipse cx={ex} cy={ey-4} rx={tw+1.5} ry={2.5} fill={fill} stroke="#000" strokeWidth={1.2} />
                <ellipse cx={ex-0.5} cy={ey-4.5} rx={1} ry={0.7} fill="#fff" opacity="0.2" />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

function Braids({ fill }: HairPartProps) {
  /* Woven braid segments — alternating left/right overlapping ellipses */
  const braidSegments = (cx: number, startY: number, dir: number) => {
    const segs = [];
    for (let i = 0; i < 7; i++) {
      const y = startY + i * 7;
      const xOff = (i % 2 === 0 ? -1 : 1) * dir * 2.5;
      segs.push(
        <ellipse key={y} cx={cx + xOff} cy={y} rx={5} ry={4} fill={fill} stroke="#000" strokeWidth={1.2}
          strokeLinejoin="round" />
      );
    }
    return segs;
  };
  const u = useAvatarUid();
  const cap = "M10 34 Q10 12 50 8 Q90 12 90 34";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="braids" /></defs>
      {/* Cap */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="braids" d={cap} />
      {/* Part line */}
      <line x1="50" y1="8" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Left braid — pulled inward */}
      <g>{braidSegments(18, 40, 1)}</g>
      {/* Left braid center line */}
      <path d="M18 40 Q16 54 18 68 Q16 76 18 82" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M20 44 Q18 56 20 68" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      {/* Right braid — pulled inward */}
      <g>{braidSegments(82, 40, -1)}</g>
      {/* Right braid center line */}
      <path d="M82 40 Q84 54 82 68 Q84 76 82 82" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M80 44 Q82 56 80 68" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      {/* Beads at ends — within viewBox */}
      <ellipse cx="18" cy="84" rx={4} ry={3.5} fill={fill} stroke="#000" strokeWidth={1.8} />
      <ellipse cx="17" cy="83" rx={1.2} ry={0.8} fill="#fff" opacity="0.25" />
      <ellipse cx="82" cy="84" rx={4} ry={3.5} fill={fill} stroke="#000" strokeWidth={1.8} />
      <ellipse cx="81" cy="83" rx={1.2} ry={0.8} fill="#fff" opacity="0.25" />
    </g>
  );
}

function Bun({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M16 34 Q16 16 50 12 Q84 16 84 34 Q76 26 50 24 Q24 26 16 34Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="bun" /></defs>
      {/* Cap with inner contour */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="bun" d={cap} />
      {/* Bun ball — kept inside viewBox */}
      <circle cx="50" cy="14" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Bun swirl detail — visible wrapped texture */}
      <path d="M45 10 Q50 16 55 10" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.25" />
      <path d="M43 14 Q50 20 57 14" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M47 7 Q50 11 53 7" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <ellipse cx="47" cy="10" rx="4" ry="3" fill="#fff" opacity="0.1" />
      {/* Strands leading up to bun */}
      <path d="M40 26 Q42 20 46 16 M60 26 Q58 20 54 16" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.15" />
      <path d="M36 28 Q34 22 32 26 M64 28 Q66 22 68 26" stroke={fill} strokeWidth={1} opacity="0.5" />
      {/* Hair stick — angled, stays within viewBox */}
      <line x1="46" y1="8" x2="38" y2="4" stroke="#8B6E4E" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx="38" cy="4" r="1.5" fill="#D4A574" stroke="#8B6E4E" strokeWidth={0.8} />
    </g>
  );
}

function Bangs({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M10 38 C6 24 18 12 34 8 C42 6 58 6 66 8 C82 12 94 24 90 38 C92 50 88 58 84 62 C80 58 80 50 80 44 C64 26 36 26 20 44 C20 50 20 58 16 62 C12 58 8 50 10 38Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="bangs" /></defs>
      {/* Hair with bangs — voluminous cap + shoulder-length flowing sides */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="bangs" d={cap} />
      {/* Strand flow lines */}
      <path d="M16 44 C16 50 17 56 18 60 M84 44 C84 50 83 56 82 60" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      {/* Double-strand highlights */}
      <path d="M22 42 C22 50 23 56 24 60" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M78 42 C78 50 77 56 76 60" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      {/* Crown highlight */}
      <path d="M34 10 C44 6 56 6 66 10" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" strokeLinecap="round" />
      <path d="M38 8 C46 4 54 4 62 8" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" strokeLinecap="round" />
    </g>
  );
}

function Twintails({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = 'M14 34 Q14 12 50 8 Q86 12 86 34';
  const leftTail = 'M16 38 Q8 46 6 58 Q4 72 10 82 Q16 90 20 80 Q14 66 16 54 Q18 48 24 42';
  const rightTail = 'M84 38 Q92 46 94 58 Q96 72 90 82 Q84 90 80 80 Q86 66 84 54 Q82 48 76 42';
  return (
    <g>
      <defs>
        <HairPolishDefs uid={u} keyName="twintails" />
        {/* VIP specialty: vertical tail-shine gradient (ribbon of light down each tail) */}
        <linearGradient id={`${u}hair-twintails-tail`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Cap — base + shade + rim light */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <path d={cap} fill={`url(#${u}hair-twintails-shade)`} stroke="none" />
      <path d={cap} fill={`url(#${u}hair-twintails-light)`} stroke="none" />
      {/* Part */}
      <line x1="50" y1="8" x2="50" y2="26" stroke="#000" strokeWidth={1} opacity="0.3" />
      {/* Tails — base + shade + tail-shine */}
      <path d={leftTail} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d={leftTail} fill={`url(#${u}hair-twintails-shade)`} stroke="none" />
      <path d={leftTail} fill={`url(#${u}hair-twintails-tail)`} stroke="none" />
      <path d={rightTail} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d={rightTail} fill={`url(#${u}hair-twintails-shade)`} stroke="none" />
      <path d={rightTail} fill={`url(#${u}hair-twintails-tail)`} stroke="none" />
      <path d="M10 52 Q8 62 10 70 M90 52 Q92 62 90 70" stroke="#fff" strokeWidth={1} opacity="0.18" strokeLinecap="round" />
      {/* Hair ties with sparkle */}
      <circle cx="18" cy="34" r="5" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="18" cy="34" r="2.5" fill="#fff" opacity="0.25" />
      <ellipse cx="17" cy="33" rx="1.5" ry="1" fill="#fff" opacity="0.35" />
      <circle cx="82" cy="34" r="5" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="82" cy="34" r="2.5" fill="#fff" opacity="0.25" />
      <ellipse cx="81" cy="33" rx="1.5" ry="1" fill="#fff" opacity="0.35" />
    </g>
  );
}

function Mullet({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M18 34 Q18 16 50 12 Q82 16 82 34";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="mullet" /></defs>
      {/* Cap — business in front */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="mullet" d={cap} />
      {/* Party in back — right */}
      <path d="M80 36 Q92 40 94 58 Q96 78 88 90 Q82 94 78 84 Q86 66 82 48" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Party in back — left */}
      <path d="M20 36 Q8 40 6 58 Q4 78 12 90 Q18 94 22 84 Q14 66 18 48" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M84 44 Q88 56 86 72 M16 44 Q12 56 14 72" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M32 18 Q50 12 68 18" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
    </g>
  );
}


function Frizzle({ fill }: HairPartProps) {
  const u = useAvatarUid();
  /* Spiky polygon silhouette — clearly distinct from Afro's smooth bumps */
  const spiky = "M18 52 L8 44 L14 36 L6 28 L14 20 L8 12 L18 8 L16 2 L26 5 L30 0 L38 3 L42 1 L50 4 L56 1 L62 3 L70 0 L74 5 L82 2 L84 8 L92 12 L82 20 L94 28 L86 36 L92 44 L82 52Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="frizzle" /></defs>
      <path d={spiky} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d={spiky} fill={`url(#${u}hair-frizzle-shade)`} stroke="none" />
      <path d={spiky} fill={`url(#${u}hair-frizzle-light)`} stroke="none" />
      {/* Face reveal */}
      <path d="M20 44 Q50 18 80 44 Q82 36 82 26 Q82 18 50 18 Q18 18 18 26 Q18 36 20 44Z" fill={fill} stroke="none" />
      {/* Wild frizz texture strokes */}
      <path d="M22 30 L18 24 M30 16 L26 10 M40 8 L38 3 M50 6 L50 1 M60 8 L62 3 M70 16 L74 10 M78 30 L82 24"
        stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <path d="M25 26 L20 20 M36 12 L34 6 M46 6 L44 1 M54 6 L56 1 M64 12 L66 6 M75 26 L80 20"
        stroke="#000" strokeWidth={0.6} opacity="0.1" />
      <path d="M28 8 Q42 2 50 1 Q58 2 72 8" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" />
    </g>
  );
}

function Durag({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M18 52 Q16 36 20 26 Q28 12 50 10 Q72 12 80 26 Q84 36 82 52Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="durag" /></defs>
      {/* Main cap dome — smooth, hugging the head */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="durag" d={cap} />
      {/* Left tail flap — hangs beside/behind head */}
      <path d="M18 50 Q14 58 12 68 Q10 78 14 82 Q18 84 20 76 Q20 64 22 54Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right tail flap */}
      <path d="M82 50 Q86 58 88 68 Q90 78 86 82 Q82 84 80 76 Q80 64 78 54Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Center back fabric gather / tie nub */}
      <path d="M44 76 Q50 82 56 76 Q54 70 50 68 Q46 70 44 76Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Fabric sheen lines */}
      <path d="M26 28 Q38 24 50 24 Q62 24 74 28" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.16" />
      <path d="M24 36 Q38 32 50 32 Q62 32 76 36" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.11" />
      <path d="M22 44 Q38 40 50 40 Q62 40 78 44" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.08" />
    </g>
  );
}

function LocsShort({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M12 32 Q12 14 50 10 Q88 14 88 32";
  const locs: [number,number,number,number,number,number][] = [
    [16,32, 14,64, -2, 6],
    [24,30, 20,62, -1, 5.5],
    [32,28, 30,58, 1, 5.5],
    [40,26, 40,54, 0, 5.5],
    [50,25, 50,52, 0, 6],
    [60,26, 60,54, 0, 5.5],
    [68,28, 70,58, 1, 5.5],
    [76,30, 80,62, 1, 5.5],
    [84,32, 86,64, 1, 6],
  ];
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="locsShort" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="locsShort" d={cap} />
      {locs.map(([sx,sy,ex,ey,bulge,w]) => {
        const mx = (sx+ex)/2 + bulge;
        const my = (sy+ey)/2;
        const hw = w/2;
        const tw = hw * 0.55;
        return (
          <g key={`${sx}-${sy}`}>
            <path d={`M${sx-hw} ${sy} C${mx-hw-1} ${my-3} ${ex-tw-1} ${ey-6} ${ex-tw} ${ey} Q${ex} ${ey+3} ${ex+tw} ${ey} C${ex+tw+1} ${ey-6} ${mx+hw+1} ${my-3} ${sx+hw} ${sy}Z`}
              fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
            {[0.3, 0.55, 0.75].map((t, j) => {
              const px = sx + (ex-sx)*t + bulge*(t < 0.5 ? t*2 : 1);
              const py = sy + (ey-sy)*t;
              const rw = hw - (hw-tw)*t;
              return <path key={t} d={`M${px-rw+0.5} ${py} L${px+rw-0.5} ${py}`} stroke="#000" strokeWidth={0.7} opacity={0.12+j*0.02} />;
            })}
          </g>
        );
      })}
    </g>
  );
}

export const HAIR_PARTS_VOLUME = {
  afro: Afro, wavy: Wavy, pigtails: Pigtails, sideshave: Sideshave, dreads: Dreads,
  braids: Braids, bun: Bun, bangs: Bangs, twintails: Twintails, mullet: Mullet,
  frizzle: Frizzle, durag: Durag, locsShort: LocsShort,
} as const;
