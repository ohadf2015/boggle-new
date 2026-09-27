/**
 * Word Tower — shared play chrome framing (TDD).
 * Notice region + crane top + construction zone share one pure source of truth
 * so the active floors, drop path, and transient notices never fight for the
 * same mid-screen band.
 *
 * Crane alignment asserts the REAL WordTowerCrane DOM path (meter + gap-3 +
 * trolley top + shadow Y), not a self-consistent incomplete model.
 */
import { describe, it, expect } from 'vitest';
import {
  playChromeFrame,
  DEFAULT_TOP_CHROME_PX,
  NOTICE_CONSTRUCTION_GAP_PX,
  TOP_CHROME_NOTICE_GAP_PX,
} from '../playChromeFrame';
import { WORD_TOWER_BUILD_LINE_FRACTION } from '../towerLayout';
import {
  CRANE_OUTER_GAP_PX,
  CRANE_TROLLEY_TOP_PX,
  CRANE_SHADOW_Y_PX,
  CRANE_SHADOW_VISUAL_NUDGE_PX,
  craneShadowOffsetFromOuterTop,
} from '../craneGeometry';

/** Reconstruct the landing-shadow screen Y using the same offsets as WordTowerCrane.tsx:
 *  outer top → meter → flex gap-3 → chrome → trolley top-[20px] → shadow (CRANE_SHADOW_Y_PX - 4). */
function realShadowScreenY(craneTopPx: number, meterHPx: number): number {
  return (
    craneTopPx +
    meterHPx +
    CRANE_OUTER_GAP_PX +
    CRANE_TROLLEY_TOP_PX +
    CRANE_SHADOW_Y_PX -
    CRANE_SHADOW_VISUAL_NUDGE_PX
  );
}

describe('playChromeFrame — shared construction / notice / crane framing', () => {
  const H = 800;
  const deck = 220;
  const topChrome = DEFAULT_TOP_CHROME_PX;

  it('pins the build line to the shared fraction of viewport height', () => {
    const f = playChromeFrame({ viewportH: H, topChromePx: topChrome, deckHeightPx: deck });
    expect(f.buildLineY).toBeCloseTo(H * WORD_TOWER_BUILD_LINE_FRACTION);
  });

  it('keeps the construction zone in the lower band under the build line', () => {
    const f = playChromeFrame({ viewportH: H, topChromePx: topChrome, deckHeightPx: deck });
    expect(f.constructionTop).toBeCloseTo(f.buildLineY);
    expect(f.constructionBottom).toBeGreaterThan(f.constructionTop);
    // Never sinks into the control deck
    expect(f.constructionBottom).toBeLessThanOrEqual(H - deck + 1);
  });

  it('places the notice region in the sky above the construction zone', () => {
    const f = playChromeFrame({ viewportH: H, topChromePx: topChrome, deckHeightPx: deck });
    // Clears the top chrome by a gap — flush against it read as "the verdict is
    // covering the clue button" once the play tools moved into the header.
    expect(f.noticeTopPx).toBe(topChrome + TOP_CHROME_NOTICE_GAP_PX);
    expect(f.noticeTopPx).toBeGreaterThan(topChrome);
    // Bottom of the notice stack stays above the active tower cluster
    expect(f.noticeTopPx + f.noticeMaxHeightPx).toBeLessThanOrEqual(
      f.constructionTop - NOTICE_CONSTRUCTION_GAP_PX + 0.5,
    );
    expect(f.noticeMaxHeightPx).toBeGreaterThanOrEqual(48);
  });

  it('aligns the crane landing shadow on the build line via the real DOM path', () => {
    const meter = 32;
    const f = playChromeFrame({
      viewportH: H,
      topChromePx: topChrome,
      deckHeightPx: deck,
      meterHPx: meter,
    });
    // Unclamped on a tall phone: real shadow path must hit the build line.
    // ideal is above the 35%H clamp floor for H=800, so no clamp distortion.
    const shadowY = realShadowScreenY(f.craneTopPx, meter);
    expect(Math.abs(shadowY - f.buildLineY)).toBeLessThanOrEqual(1);
    // And the pure helper used by the frame matches that same real path.
    expect(f.craneTopPx + craneShadowOffsetFromOuterTop(meter)).toBeCloseTo(f.buildLineY, 0);
  });

  it('encodes the DOM extras (outer gap + trolley top − nudge) vs a chrome-only model', () => {
    // Incomplete model was: craneTop + meter + CRANE_SHADOW_Y_PX.
    // The real path also carries the outer gap, the trolley offset and the
    // shadow's visual nudge. What matters is that ALL of them are accounted
    // for — the exact total moves whenever the chrome above the crane changes
    // (it dropped from 28 to 16 when the stability meter and its gap were
    // removed), so asserting a literal here only ever produced false alarms.
    const extras = CRANE_OUTER_GAP_PX + CRANE_TROLLEY_TOP_PX - CRANE_SHADOW_VISUAL_NUDGE_PX;
    const meter = 32;
    expect(craneShadowOffsetFromOuterTop(meter)).toBe(meter + CRANE_SHADOW_Y_PX + extras);
  });

  it('clamps crane top so chrome stays below the top actions on short screens', () => {
    const f = playChromeFrame({
      viewportH: 520,
      topChromePx: 100,
      deckHeightPx: 200,
      meterHPx: 32,
    });
    expect(f.craneTopPx).toBeGreaterThanOrEqual(0);
    // Notice band still has usable height on short phones
    expect(f.noticeMaxHeightPx).toBeGreaterThanOrEqual(48);
  });

  it('returns compact readable row sizing for the construction cluster', () => {
    const f = playChromeFrame({ viewportH: H, topChromePx: topChrome, deckHeightPx: deck });
    expect(f.rowSize).toBeGreaterThanOrEqual(38);
    expect(f.rowSize).toBeLessThanOrEqual(54);
    expect(f.rowH).toBeGreaterThan(f.rowSize);
  });

  it('scales build line with viewport height (multi-row framing)', () => {
    const short = playChromeFrame({ viewportH: 600, topChromePx: 96, deckHeightPx: 200 });
    const tall = playChromeFrame({ viewportH: 1200, topChromePx: 120, deckHeightPx: 240 });
    expect(tall.buildLineY).toBeGreaterThan(short.buildLineY);
    expect(tall.constructionBottom - tall.constructionTop).toBeGreaterThan(
      short.constructionBottom - short.constructionTop - 1,
    );
  });

  it('keeps shadow near the build line on a typical phone (H=844) without large bias', () => {
    const meter = 32;
    const f = playChromeFrame({
      viewportH: 844,
      topChromePx: DEFAULT_TOP_CHROME_PX,
      deckHeightPx: 240,
      meterHPx: meter,
    });
    const shadowY = realShadowScreenY(f.craneTopPx, meter);
    // Allow clamp slack on short-ish phones, but never the old systematic +28px miss.
    expect(Math.abs(shadowY - f.buildLineY)).toBeLessThanOrEqual(12);
  });
});
