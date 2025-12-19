/**
 * Heat Map Utilities
 * Thermal overlay effect for results page (red-pink-orange-yellow scheme)
 */

import type { HeatMapData } from './types';

export interface HeatMapStyle {
  r: number;
  g: number;
  b: number;
  t: number; // Normalized intensity 0-1
}

/**
 * Get heat map style for a cell
 * Returns RGB values and normalized intensity for thermal overlay effect
 */
export function getHeatMapStyle(
  row: number,
  col: number,
  heatMapData: HeatMapData | null
): HeatMapStyle | null {
  if (!heatMapData || !heatMapData.cellUsageCounts) return null;

  const key = `${row},${col}`;
  const count = heatMapData.cellUsageCounts[key] || 0;
  if (count === 0) return null;

  const maxCount = heatMapData.maxCount || 1;
  const t = count / maxCount; // 0 to 1

  // Heat map: dark red -> red -> pink/magenta -> orange -> yellow -> white-hot
  let r: number, g: number, b: number;

  if (t < 0.2) {
    // Dark red to red
    const p = t / 0.2;
    r = Math.round(120 + p * 135);
    g = 0;
    b = Math.round(p * 30);
  } else if (t < 0.4) {
    // Red to pink/magenta
    const p = (t - 0.2) / 0.2;
    r = 255;
    g = Math.round(p * 50);
    b = Math.round(30 + p * 100);
  } else if (t < 0.6) {
    // Pink to orange
    const p = (t - 0.4) / 0.2;
    r = 255;
    g = Math.round(50 + p * 100);
    b = Math.round(130 - p * 130);
  } else if (t < 0.8) {
    // Orange to yellow
    const p = (t - 0.6) / 0.2;
    r = 255;
    g = Math.round(150 + p * 105);
    b = 0;
  } else {
    // Yellow to white-hot
    const p = (t - 0.8) / 0.2;
    r = 255;
    g = 255;
    b = Math.round(p * 180);
  }

  return { r, g, b, t };
}
