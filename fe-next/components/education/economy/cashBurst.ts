import { NEO_HEX } from './neoHex';

export const BURST_COLORS = [NEO_HEX.lime, NEO_HEX.pink, NEO_HEX.cyan, NEO_HEX.yellow] as const;

export interface CashBurstPiece {
  x: number;
  y: number;
  color: string;
}

/** Pieces fan out evenly around the cash number, each with its own colour. */
export function cashBurstPieces(count: number): CashBurstPiece[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const reach = 34 + (i % 2) * 10;
    return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach, color: BURST_COLORS[i % BURST_COLORS.length] };
  });
}
