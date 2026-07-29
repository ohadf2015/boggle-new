export type HeatState = 'cold' | 'warm' | 'overdrive' | 'burnout';

export type HeatBeat =
  | 'enter-overdrive'
  | 'exit-overdrive'
  | 'enter-burnout'
  | 'recover';

export interface HeatReadout {
  heat: number;
  overdrive: boolean;
  burnout: boolean;
}

export function classifyHeat(r: HeatReadout): HeatState {
  if (r.burnout) return 'burnout';
  if (r.overdrive) return 'overdrive';
  if (r.heat >= 40) return 'warm';
  return 'cold';
}

export function detectHeatTransition(prev: HeatState, next: HeatState): HeatBeat | null {
  if (prev === next) return null;
  if (prev === 'burnout' && (next === 'warm' || next === 'cold')) return 'recover';
  if (prev === 'overdrive' && next === 'burnout') return 'enter-burnout';
  if (prev === 'overdrive' && (next === 'warm' || next === 'cold')) return 'exit-overdrive';
  if (next === 'overdrive') return 'enter-overdrive';
  return null;
}
