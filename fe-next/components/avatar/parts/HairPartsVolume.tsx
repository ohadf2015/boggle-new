/** Back hair variants — see hairShared.tsx for props + helpers. */
import { useAvatarUid } from '../AvatarUidContext';
import { HairPartProps, HairPolishDefs, HairPolish, S, CrownHighlight } from './hairShared';

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
      {/* Highlights — crown via shared for systemic consistency */}
      <CrownHighlight opacity={0.18} strokeWidth={1.5} />
      <ellipse cx="30" cy="14" rx="6" ry="4" fill="#fff" opacity="0.06" />
    </g>
  );
}

function Wavy({ fill }: HairPartProps) {
  const u = useAvatarUid();
  /* Big flowing wavy cap: dome top + long cascading sides past jaw with scalloped wave bottom */
  const cap = "M6 38 C2 22 16 6 34 4 Q50 0 66 4 C84 6 98 22 94 38 C96 52 96 66 90 78 Q84 86 80 80 Q82 68 80 56 Q70 38 50 36 Q30 38 20 56 Q18 68 20 80 Q16 86 10 78 C4 66 4 52 6 38Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="wavy" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="wavy" d={cap} />
      {/* Pronounced S-curve waves down left side */}
      <path d="M10 44 Q14 50 10 56 Q6 62 10 68 Q14 74 12 80" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <path d="M14 46 Q18 52 14 58 Q10 64 14 70 Q18 76 16 80" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.13" strokeLinecap="round" />
      {/* Right side waves */}
      <path d="M90 44 Q86 50 90 56 Q94 62 90 68 Q86 74 88 80" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <path d="M86 46 Q82 52 86 58 Q90 64 86 70 Q82 76 84 80" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.13" strokeLinecap="round" />
      {/* Glossy ribbon highlights */}
      <path d="M12 42 Q16 52 12 62 Q8 72 12 78" fill="none" stroke="#fff" strokeWidth={1.3} opacity="0.2" strokeLinecap="round" />
      <path d="M88 42 Q84 52 88 62 Q92 72 88 78" fill="none" stroke="#fff" strokeWidth={1.3} opacity="0.2" strokeLinecap="round" />
      {/* Scalloped bottom hint — wave tips outside face zone */}
      <path d="M14 78 Q18 84 22 80" fill="none" stroke="#000" strokeWidth={1} opacity="0.18" strokeLinecap="round" />
      <path d="M86 78 Q82 84 78 80" fill="none" stroke="#000" strokeWidth={1} opacity="0.18" strokeLinecap="round" />
      {/* Crown highlight */}
      <path d="M30 8 C42 4 58 4 70 8" fill="none" stroke="#fff" strokeWidth={1.6} opacity="0.22" strokeLinecap="round" />
      <path d="M36 5 C44 1 56 1 64 5" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" strokeLinecap="round" />
    </g>
  );
}

function Pigtails({ fill }: HairPartProps) {
  const u = useAvatarUid();
  /* Cap covers crown with center part and cute bangs hint */
  const cap = "M14 30 Q12 8 50 4 Q88 8 86 30";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="pigtails" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="pigtails" d={cap} />
      {/* Center part */}
      <line x1="50" y1="4" x2="50" y2="26" stroke="#000" strokeWidth={1} opacity="0.25" />
      {/* Left pigtail — chubby teardrop pointing outward and slightly down (high anime style) */}
      <path d="M18 22 C6 22 -2 32 2 42 C6 50 14 52 18 46 C20 40 18 34 18 28 C18 26 18 24 18 22Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right pigtail — mirror */}
      <path d="M82 22 C94 22 102 32 98 42 C94 50 86 52 82 46 C80 40 82 34 82 28 C82 26 82 24 82 22Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Pigtail wisp/strand texture */}
      <path d="M6 30 Q4 38 8 46" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.18" strokeLinecap="round" />
      <path d="M10 28 Q8 36 12 44" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" strokeLinecap="round" />
      <path d="M94 30 Q96 38 92 46" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.18" strokeLinecap="round" />
      <path d="M90 28 Q92 36 88 44" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" strokeLinecap="round" />
      {/* Glossy highlights */}
      <path d="M4 32 Q2 40 6 48" fill="none" stroke="#fff" strokeWidth={1.1} opacity="0.2" strokeLinecap="round" />
      <path d="M96 32 Q98 40 94 48" fill="none" stroke="#fff" strokeWidth={1.1} opacity="0.2" strokeLinecap="round" />
      {/* Hair ties — scrunchie band where pigtail meets head */}
      <ellipse cx="18" cy="24" rx="5" ry="3.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="16" cy="22" rx="2" ry="1" fill="#fff" opacity="0.3" />
      <ellipse cx="82" cy="24" rx="5" ry="3.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="80" cy="22" rx="2" ry="1" fill="#fff" opacity="0.3" />
      {/* Wrap detail on tie */}
      <path d="M14 24 Q18 22 22 24" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.3" />
      <path d="M78 24 Q82 22 86 24" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.3" />
      {/* Crown sheen */}
      <path d="M32 8 C42 4 58 4 68 8" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.2" strokeLinecap="round" />
    </g>
  );
}

function Sideshave({ fill }: HairPartProps) {
  const u = useAvatarUid();
  /* Bold swept-over volume: hair pulled high from the left, cascading across crown and down right side. */
  const swept = "M28 30 Q32 6 56 4 Q82 6 90 18 Q92 30 92 42 C94 58 90 74 86 80 Q82 84 80 78 Q82 64 80 50 Q72 30 56 26 Q40 24 28 30Z";
  /* Stubble pattern + fade lines for shaved side */
  const stubbleDots = [
    [18, 34], [22, 32], [25, 30], [16, 30], [20, 28], [24, 26], [14, 26], [18, 24], [22, 22],
    [12, 22], [16, 20], [20, 18], [14, 16], [18, 14], [22, 12], [16, 10], [20, 8],
    [25, 14], [27, 18], [27, 24], [27, 28],
  ] as const;
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="sideshave" /></defs>
      {/* Shaved-side scalp tint */}
      <path d="M14 36 Q14 16 26 8 Q28 22 28 36 Z" fill={fill} opacity="0.12" />
      {/* Stubble dots */}
      {stubbleDots.map(([x, y], i) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={fill} opacity={0.36 - (i % 4) * 0.06} />
      ))}
      {/* Fade lines */}
      <path d="M14 28 L26 22 M14 22 L26 16 M14 16 L26 10" stroke={fill} strokeWidth={0.7} opacity="0.22" />
      {/* Demarcation between shaved + swept */}
      <path d="M28 30 Q30 18 32 8" fill="none" stroke="#000" strokeWidth={1.4} opacity="0.45" />
      {/* Swept cap */}
      <path d={swept} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="sideshave" d={swept} />
      {/* Sweep direction lines */}
      <path d="M40 12 Q60 6 84 18" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.25" strokeLinecap="round" />
      <path d="M44 16 Q62 12 80 22" fill="none" stroke="#fff" strokeWidth={0.9} opacity="0.16" strokeLinecap="round" />
      <path d="M48 20 Q64 18 76 26" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.1" strokeLinecap="round" />
      {/* Right cascade highlights */}
      <path d="M88 36 Q92 50 90 70" fill="none" stroke="#fff" strokeWidth={1.1} opacity="0.18" strokeLinecap="round" />
      <path d="M84 38 Q88 52 86 68" fill="none" stroke="#fff" strokeWidth={0.7} opacity="0.12" strokeLinecap="round" />
      {/* Tip flick */}
      <path d="M82 76 Q86 82 84 78" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.2" strokeLinecap="round" />
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
  const u = useAvatarUid();
  const cap = "M10 32 Q10 10 50 6 Q90 10 90 32";
  /* Tapered braid tube + diagonal weave cross-hatch — replaces stacked-bead bead-string look */
  const braidTube = (cx: number, sy: number, ey: number) => {
    const topW = 5;
    const botW = 3;
    return `M${cx - topW} ${sy} Q${cx - topW - 1} ${(sy + ey) / 2} ${cx - botW} ${ey} Q${cx} ${ey + 2} ${cx + botW} ${ey} Q${cx + topW + 1} ${(sy + ey) / 2} ${cx + topW} ${sy} Q${cx} ${sy - 1} ${cx - topW} ${sy}Z`;
  };
  const weave = (cx: number, sy: number, ey: number) => {
    const lines = [];
    const segH = 6;
    const halfW = 4;
    for (let y = sy; y < ey - segH / 2; y += segH) {
      const t = (y - sy) / (ey - sy);
      const w = halfW * (1 - t * 0.4);
      lines.push(<line key={`a-${y}`} x1={cx - w} y1={y} x2={cx + w} y2={y + segH * 0.5} stroke="#000" strokeWidth={0.9} opacity={0.32} />);
      lines.push(<line key={`b-${y}`} x1={cx + w} y1={y} x2={cx - w} y2={y + segH * 0.5} stroke="#000" strokeWidth={0.9} opacity={0.32} />);
      lines.push(<line key={`h-${y}`} x1={cx - w + 0.5} y1={y + segH * 0.25} x2={cx + w - 0.5} y2={y + segH * 0.25} stroke="#fff" strokeWidth={0.5} opacity={0.18} />);
    }
    return lines;
  };
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="braids" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="braids" d={cap} />
      {/* Center part */}
      <line x1="50" y1="6" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.22" />
      {/* Left braid */}
      <path d={braidTube(16, 32, 86)} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <g>{weave(16, 32, 86)}</g>
      {/* Right braid */}
      <path d={braidTube(84, 32, 86)} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <g>{weave(84, 32, 86)}</g>
      {/* Glossy highlight ribbons */}
      <path d="M14 36 Q12 56 14 80" fill="none" stroke="#fff" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <path d="M86 36 Q88 56 86 80" fill="none" stroke="#fff" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      {/* End ties — small bands */}
      <ellipse cx="16" cy="88" rx="3.5" ry="2" fill={fill} stroke="#000" strokeWidth={1.4} />
      <ellipse cx="84" cy="88" rx="3.5" ry="2" fill={fill} stroke="#000" strokeWidth={1.4} />
      <path d="M13 88 Q16 87 19 88" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.3" />
      <path d="M81 88 Q84 87 87 88" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.3" />
      {/* Tiny tassel tips */}
      <path d="M14 90 L13 94 M16 90 L16 94 M18 90 L19 94" stroke={fill} strokeWidth={1} strokeLinecap="round" opacity="0.7" />
      <path d="M82 90 L81 94 M84 90 L84 94 M86 90 L87 94" stroke={fill} strokeWidth={1} strokeLinecap="round" opacity="0.7" />
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
