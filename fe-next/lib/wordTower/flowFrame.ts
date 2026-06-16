/**
 * Word Tower — "in the zone" screen frame (pure).
 *
 * A run of perfect drops (the steady-hands streak) doesn't just calm the tower
 * and pop a chip — at higher tiers it lights a hard-edged electric frame around
 * the whole play area, then a gold "ON FIRE" frame, so the screen itself reads
 * the flow state. Kept ON-brand: solid neo colours + hard edges, no soft glow.
 */

/** Streak at which the electric (cyan→lime) frame appears. */
export const FLOW_FRAME_AT = 4;
/** Streak at which it escalates to the gold "ON FIRE" frame. */
export const FLOW_FIRE_AT = 5;
/** Streak at which the frame intensity saturates. */
const FLOW_FULL_AT = 9;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export interface FlowFrame {
  /** Solid neo-brutalist frame colour (CSS hex). */
  color: string;
  /** 0..1 — drives the band thickness/opacity ramp. */
  intensity: number;
  /** True at the top tier — the gold "ON FIRE" treatment. */
  fire: boolean;
}

/**
 * The frame state for a perfect-drop streak, or null below {@link FLOW_FRAME_AT}.
 * Cyan→lime electric up to the fire tier, then gold. Intensity ramps to 1 by
 * {@link FLOW_FULL_AT} so a long streak reads as a fuller, louder frame.
 */
export function flowFrameLevel(perfectStreak: number): FlowFrame | null {
  if (perfectStreak < FLOW_FRAME_AT) return null;
  const fire = perfectStreak >= FLOW_FIRE_AT;
  const intensity = clamp01((perfectStreak - FLOW_FRAME_AT + 1) / (FLOW_FULL_AT - FLOW_FRAME_AT + 1));
  const color = fire ? '#FFE135' /* neo-yellow / gold */ : '#BFFF00' /* neo-lime */;
  return { color, intensity, fire };
}
