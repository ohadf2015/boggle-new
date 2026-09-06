/**
 * Bridge Pyramid share — same labeled tokens as the daily chain
 * (see ../shareGrid), stacked as finale over the 3-base row.
 *
 *   LexiClash · {title} {date}
 *   finale {token}
 *   base {a} · {b} · {c}
 *   {callout}
 *   {score} pts
 *   {url}
 */
import { bridgeSquare, type BridgeOutcome } from '../shareGrid';

export interface PyramidGridParams {
  title: string;
  dateISO: string;
  base: readonly [BridgeOutcome, BridgeOutcome, BridgeOutcome];
  finale: BridgeOutcome;
  score: number;
  callout?: string;
  url?: string;
}

export function buildPyramidShareGrid({
  title,
  dateISO,
  base,
  finale,
  score,
  callout,
  url,
}: PyramidGridParams): string {
  const lines = [
    `LexiClash · ${title} ${dateISO}`,
    `finale ${bridgeSquare(finale)}`,
    `base ${base.map(bridgeSquare).join(' · ')}`,
  ];
  if (callout) lines.push(callout);
  lines.push(`${score} pts`);
  if (url) lines.push(url);
  return lines.join('\n');
}
