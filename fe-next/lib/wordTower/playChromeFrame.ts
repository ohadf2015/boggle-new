/**
 * Word Tower — shared play chrome framing (pure).
 *
 * One source of truth for where the active construction zone, notice column,
 * and crane landing shadow sit relative to the viewport. Rails/camera already
 * share {@link WORD_TOWER_BUILD_LINE_FRACTION}; this module extends that so
 * DOM chrome (notices + crane) never permanently occlude the drop path.
 *
 * Crane top uses the real WordTowerCrane DOM path (meter + gap-3 + trolley
 * top + shadow Y) via {@link craneShadowOffsetFromOuterTop} — not a simplified
 * chrome-only model that leaves the shadow ~28px below the build line.
 */

import { craneShadowOffsetFromOuterTop } from './craneGeometry';
import {
  DEFAULT_MAX_VISIBLE_ROWS,
  towerRowLayout,
  WORD_TOWER_BUILD_LINE_FRACTION,
} from './towerLayout';

/** Default top actions + stat HUD band when the parent hasn't measured chrome. */
export const DEFAULT_TOP_CHROME_PX = 112;
/** Breathing room between the notice stack bottom and the construction zone. */
export const NOTICE_CONSTRUCTION_GAP_PX = 12;
/** Stability meter above the crane chrome (approx py-1 + 10px label + dots). */
export const DEFAULT_CRANE_METER_H_PX = 32;
/** Floor for notice band height so a short phone still shows a verdict. */
const NOTICE_MIN_H_PX = 48;

export interface PlayChromeFrameInput {
  /** Full play surface height (px) — typically the 100dvh shell. */
  viewportH: number;
  /** Measured top chrome (back row + stats) height in px. */
  topChromePx?: number;
  /** Control-deck height (px); tower grounds above it. */
  deckHeightPx?: number;
  /** Crane stability meter height above the chrome wrapper (px). */
  meterHPx?: number;
}

export interface PlayChromeFrame {
  /** Shared build line Y (px from top) — newest tile + crane shadow + rails. */
  buildLineY: number;
  /** Top of the active construction cluster (newest floor). */
  constructionTop: number;
  /** Bottom of the visible grounded cluster (above the deck). */
  constructionBottom: number;
  /** Notice column `top` (px). */
  noticeTopPx: number;
  /** Max height for the notice stack so it stays in the sky band. */
  noticeMaxHeightPx: number;
  /** Crane overlay outer `top` (px) so the landing shadow hits the build line. */
  craneTopPx: number;
  /** Tile side length used by the grounded camera for this frame. */
  rowSize: number;
  /** Row pitch (tile + seam). */
  rowH: number;
}

/**
 * Compute layout regions for solo play. Pure + deterministic for unit tests;
 * the Play shell and Notice/Crane components only render the returned numbers.
 */
export function playChromeFrame({
  viewportH,
  topChromePx = DEFAULT_TOP_CHROME_PX,
  deckHeightPx = 220,
  meterHPx = DEFAULT_CRANE_METER_H_PX,
}: PlayChromeFrameInput): PlayChromeFrame {
  const H = Math.max(1, viewportH);
  const topChrome = Math.max(0, topChromePx);
  const deck = Math.max(0, deckHeightPx);
  const meter = Math.max(0, meterHPx);

  const buildLineY = H * WORD_TOWER_BUILD_LINE_FRACTION;
  // Reuse the grounded camera math so the "visible construction cluster" matches
  // what the Pixi scene pins under the crane (max ~3 newest rows).
  const rows = towerRowLayout({
    pinCount: DEFAULT_MAX_VISIBLE_ROWS,
    H,
    bottomInsetPx: deck,
    maxVisibleRows: DEFAULT_MAX_VISIBLE_ROWS,
  });
  const constructionTop = buildLineY;
  // Base of the grounded visible band: newest at build line, older rows below.
  const constructionBottom = Math.min(
    rows.baseCenter + rows.half,
    H - deck,
  );

  const noticeTopPx = topChrome;
  const noticeMaxHeightPx = Math.max(
    NOTICE_MIN_H_PX,
    Math.floor(constructionTop - topChrome - NOTICE_CONSTRUCTION_GAP_PX),
  );

  // Real DOM path: outer + meter + gap-3 + trolley top + (shadowY - nudge) = build line.
  // Do NOT force craneTop ≥ topChrome — that systematically pushed the shadow
  // ~10–28px below the build line on phones where ideal top tucks under the
  // action row (meter may peek under Back; shadow alignment wins).
  const shadowFromOuter = craneShadowOffsetFromOuterTop(meter);
  const idealCraneTop = buildLineY - shadowFromOuter;
  // Floor at 0; ceiling ~35%H so a short phone still leaves sky for notices.
  const craneTopPx = Math.round(
    Math.max(0, Math.min(idealCraneTop, H * 0.35)),
  );

  return {
    buildLineY,
    constructionTop,
    constructionBottom,
    noticeTopPx,
    noticeMaxHeightPx,
    craneTopPx,
    rowSize: rows.size,
    rowH: rows.rowH,
  };
}
