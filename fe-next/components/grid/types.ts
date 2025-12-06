/**
 * Grid Component Types
 * Shared type definitions for grid components
 */

import type { GridPosition } from '@/types';

export interface CellPosition extends GridPosition {
  letter: string;
  distanceFromCenter: number;
  cellRadius: number;
}

export interface SelectedCell extends GridPosition {
  letter: string;
}

export interface HeatMapData {
  cellUsageCounts: Record<string, number>;
  maxCount: number;
}

export interface ComboColors {
  bg: string;
  border: string;
  shadow: string;
  text: string | null;
  flicker: boolean;
  textColor?: string;
  isRainbow?: boolean;
  strobe?: boolean;
  intenseStrobe?: boolean;
}

export type PerformanceMode = 'full' | 'reduced' | 'minimal';
