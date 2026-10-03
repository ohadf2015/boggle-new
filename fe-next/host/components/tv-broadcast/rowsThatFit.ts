interface RowsThatFitInput {
  containerPx: number;
  contentPx: number;
  renderedRows: number;
  total: number;
  overflowLinePx?: number;
}

const SUBPIXEL_SLACK_PX = 1;

export function rowsThatFit({ containerPx, contentPx, renderedRows, total, overflowLinePx = 0 }: RowsThatFitInput): number {
  if (renderedRows <= 0 || contentPx <= 0 || containerPx <= 0) return total;
  const rowPx = contentPx / renderedRows;
  const fitting = (px: number) => Math.floor((px + SUBPIXEL_SLACK_PX) / rowPx);
  if (fitting(containerPx) >= total) return total;
  return Math.max(1, Math.min(total, fitting(containerPx - overflowLinePx)));
}
