import type { Page } from '@playwright/test';

export interface RoundFit {
  /** Tile centres that hit something other than the board (an overlay, coach card, dock). */
  coveredTiles: number;
  tiles: number;
  /** Gap between the round HUD's bottom edge and the board's top edge. */
  gapAboveBoard: number;
  boardBottom: number;
  boardWidth: number;
  boardHeight: number;
  scrollHeight: number;
  scrollWidth: number;
  innerHeight: number;
  innerWidth: number;
}

/** Measured in the browser: jsdom cannot lay out, so the fit guard reads real boxes. */
export async function measureRoundFit(page: Page): Promise<RoundFit> {
  return page.evaluate(() => {
    const frame = document.querySelector('[data-testid="grid-frame"]') as HTMLElement | null;
    const hud = document.querySelector('[data-testid="mp-round-layout"] > div') as HTMLElement | null;
    const fr = frame?.getBoundingClientRect();
    const rows = frame?.querySelectorAll('[data-testid^="grid-row"], [role="row"]').length || 6;
    let coveredTiles = 0;
    let tiles = 0;
    if (frame && fr) {
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < rows; j++) {
          tiles++;
          const hit = document.elementFromPoint(fr.left + (fr.width * (j + 0.5)) / rows, fr.top + (fr.height * (i + 0.5)) / rows);
          if (!hit || !frame.contains(hit)) coveredTiles++;
        }
      }
    }
    return {
      coveredTiles,
      tiles,
      gapAboveBoard: fr && hud ? Math.round(fr.top - hud.getBoundingClientRect().bottom) : Number.NaN,
      boardBottom: fr ? Math.round(fr.bottom) : Number.NaN,
      boardWidth: fr ? Math.round(fr.width) : 0,
      boardHeight: fr ? Math.round(fr.height) : 0,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
    };
  });
}
