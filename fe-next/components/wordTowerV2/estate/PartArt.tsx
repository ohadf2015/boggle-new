import type { PlotSlot } from '@/lib/wordTowerV2/estateCatalog';
import { type Material, braceColour, hex } from '@/lib/wordTowerV2/gear';

/**
 * One workshop part, drawn on a little three-floor tower so it reads as a
 * piece OF THE TOWER, not a building in a village. Same shapes as the in-run
 * paint (gearArt.ts): a plinth, the crane, gold cornices, steel braces, the
 * rooftop. Level 0 is the plan — the finished part as a dashed cyan outline.
 */

const INK = '#0b0e1c';
const GOLD = '#ffc629';
const PLAN = '#22e1ff';
const FLOOR = '#2a3470';
const WIN = '#ffd66b';
const GROUND = 92;
const FLOORS = [76, 60, 44]; // top edge of each floor, ground first
const FW = 56;
const X0 = 60 - FW / 2;

interface Props {
  slot: PlotSlot;
  level: number;
  material: Material;
  damaged?: boolean;
  className?: string;
}

export function PartArt({ slot, level, material, damaged, className }: Props) {
  const plan = level === 0;
  const shown = plan ? 5 : level;
  const fill = (c: string) => (plan ? 'none' : c);
  const stroke = plan ? PLAN : INK;
  const common = { stroke, strokeWidth: 2, strokeDasharray: plan ? '4 3' : undefined, strokeLinejoin: 'round' as const };
  const main = hex(material.main);
  const trim = hex(material.trim);
  const glow = hex(material.glow);

  const part = (() => {
    switch (slot) {
      case 'foundation':
        return (
          <g>
            {Array.from({ length: shown }, (_, i) => (
              <rect key={i} x={60 - (FW + 12 + i * 10) / 2} y={GROUND + i * 5} width={FW + 12 + i * 10} height={5} fill={fill(i % 2 ? trim : main)} {...common} />
            ))}
            {shown >= 5 && !plan ? <rect x={X0 - 6} y={GROUND - 2} width={FW + 12} height={2} fill={glow} /> : null}
          </g>
        );
      case 'craneYard':
        return (
          <g>
            <rect x={100} y={16} width={6} height={GROUND - 16} fill={fill(main)} {...common} />
            {shown >= 2 ? <rect x={14} y={12} width={96} height={6} fill={fill(main)} {...common} /> : null}
            {shown >= 3 ? <rect x={104} y={18} width={12} height={10} fill={fill(trim)} {...common} /> : null}
            {shown >= 4 ? <rect x={92} y={18} width={10} height={9} fill={fill(glow)} {...common} /> : null}
            {shown >= 2 ? <line x1={60} y1={18} x2={60} y2={FLOORS[2] - 8} stroke={stroke} strokeWidth={1.5} /> : null}
            {shown >= 5 && !plan ? <circle cx={103} cy={10} r={3} fill="#ff3366" /> : null}
          </g>
        );
      case 'vault': {
        const bands = Math.ceil((shown * 3) / 5);
        return (
          <g>
            {FLOORS.slice(0, bands).map((y) => (
              <rect key={y} x={X0 - 3} y={y - 3} width={FW + 6} height={4} fill={fill(GOLD)} {...common} />
            ))}
            {shown >= 3 ? <circle cx={60} cy={30} r={7} fill={fill(GOLD)} {...common} /> : null}
            {shown >= 3 && !plan ? <text x={60} y={33} textAnchor="middle" fontSize={8} fontWeight={900} fill={INK}>$</text> : null}
          </g>
        );
      }
      case 'insurance': {
        const reach = Math.ceil((shown * 3) / 5);
        return (
          <g>
            {FLOORS.slice(0, reach).map((y) =>
              [X0 - 7, X0 + FW + 1].map((x) => <rect key={`${x}${y}`} x={x} y={y} width={6} height={16} fill={fill(hex(braceColour(material)))} {...common} />),
            )}
            {shown >= 4 ? <path d={`M${X0 - 4} ${GROUND} L${X0 - 4} ${FLOORS[reach - 1]}`} stroke={plan ? PLAN : glow} strokeWidth={1} /> : null}
          </g>
        );
      }
      case 'landmark': {
        const roof = FLOORS[2];
        return (
          <g>
            {shown >= 3 ? <path d={`M${60 - 14} ${roof} A14 12 0 0 1 ${60 + 14} ${roof} Z`} fill={fill(main)} {...common} /> : null}
            {shown >= 5 ? (
              <path d={`M46 ${roof - 10} L46 ${roof - 26} L53 ${roof - 18} L60 ${roof - 32} L67 ${roof - 18} L74 ${roof - 26} L74 ${roof - 10} Z`} fill={fill(GOLD)} {...common} />
            ) : shown >= 4 ? (
              <path d={`M55 ${roof - 8} L60 ${roof - 40} L65 ${roof - 8} Z`} fill={fill(main)} {...common} />
            ) : (
              <>
                <line x1={60} y1={roof} x2={60} y2={roof - 30} stroke={stroke} strokeWidth={2} />
                {shown >= 2 ? <path d={`M60 ${roof - 30} L72 ${roof - 26} L60 ${roof - 22} Z`} fill={fill(main)} {...common} /> : null}
              </>
            )}
          </g>
        );
      }
    }
  })();

  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <rect x={0} y={GROUND} width={120} height={28} fill="#141830" />
      {FLOORS.map((y, i) => (
        <g key={y}>
          <rect x={X0} y={y} width={FW} height={16} fill={FLOOR} stroke={INK} strokeWidth={2} />
          {[0, 1, 2].map((w) => (
            <rect key={w} x={X0 + 8 + w * 16} y={y + 5} width={8} height={6} fill={WIN} opacity={0.35 + 0.2 * ((i + w) % 3)} />
          ))}
        </g>
      ))}
      <g opacity={damaged ? 0.55 : 1}>{part}</g>
      {damaged ? <path d="M38 50 L52 64 L46 70 L62 86" stroke="#ff3366" strokeWidth={3} fill="none" /> : null}
    </svg>
  );
}
