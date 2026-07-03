/**
 * Bridge Pyramid share card — same spoiler-free emoji language as the daily
 * (see ../shareGrid), but shaped like the pyramid: the finale square sits
 * above the 3-base row. Pure — caller localizes title/callout via t().
 *
 *   🔺 {title} {date}
 *   　{finale}          ← U+3000 pad centers the apex over the base row
 *   {base}{base}{base}
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
    `🔺 ${title} ${dateISO}`,
    `　${bridgeSquare(finale)}`,
    base.map(bridgeSquare).join(''),
  ];
  if (callout) lines.push(callout);
  lines.push(`${score} pts`);
  if (url) lines.push(url);
  return lines.join('\n');
}
